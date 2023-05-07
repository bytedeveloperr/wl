import { TransactionBlock, MIST_PER_SUI, bcs } from "@mysten/sui.js";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

import { packageId, signer } from "./config";
import bigWhitelist from "./bigWhitelist.json";
import whitelist from "./whitelist.json";

interface ExecuteInputData {
  module: string;
  createArgs: any[];
  checkArgs: any[];
}

async function executeScript(data: ExecuteInputData) {
  const txb = new TransactionBlock();
  const createArgs = data.createArgs.map((arg) => txb.pure(arg));

  const [wl] = txb.moveCall({
    typeArguments: [],
    arguments: [...createArgs],
    target: `${packageId}::${data.module}::create`,
  });

  const verifyArgs = data.checkArgs.map((arg) => txb.pure(arg));
  txb.moveCall({
    typeArguments: [],
    arguments: [wl, ...verifyArgs],
    target: `${packageId}::${data.module}::is_whitelisted`,
  });

  txb.moveCall({
    typeArguments: [],
    arguments: [wl],
    target: `${packageId}::${data.module}::return_and_share`,
  });

  txb.setGasBudget(10000000000);

  const {
    events,
    effects: { gasUsed },
  } = await signer.signAndExecuteTransactionBlock({
    transactionBlock: txb,
    options: { showEvents: true, showEffects: true },
  });

  const storageCost = Number(gasUsed.storageCost) / Number(MIST_PER_SUI);
  const computationCost = Number(gasUsed.computationCost) / Number(MIST_PER_SUI);

  return {
    isWhitelisted: <boolean>events[0].parsedJson.is_whitelisted,
    storageCost,
    computationCost,
  };
}

async function executeMerkleWhitelist() {
  const leaves = whitelist.map((wl: string) => keccak256(wl));
  const tree = new MerkleTree(leaves, keccak256);
  const root = tree.getHexRoot();

  const randomAddress = getRandomWhitelistedAddress();
  const leaf = keccak256(randomAddress);
  const positions = tree.getProof(leaf).map((p: { position: string }) => (p.position === "right" ? 1 : 0));

  return await executeScript({
    module: "merkle_wl",
    createArgs: [Array.from(Buffer.from(root.slice(2), "hex"))],
    checkArgs: [
      tree.getHexProof(leaf).map((proof: string) => Array.from(Buffer.from(proof.slice(2), "hex"))),
      positions,
      randomAddress,
    ],
  });
}

async function executeGenericWhitelist(module: string) {
  const randomAddress = getRandomWhitelistedAddress();

  return await executeScript({
    module,
    createArgs: [whitelist],
    checkArgs: [randomAddress],
  });
}

// Trying to extend the bcs limit
async function executeGenericWhitelistExtendBcs(module: string) {
  const randomAddress = getRandomWhitelistedAddress();

  return await executeScript({
    module,
    createArgs: [bcs.ser("vector<address>", bigWhitelist, { maxSize: 200 * 1024 }).toBytes()],
    checkArgs: [randomAddress],
  });
}

function getRandomWhitelistedAddress() {
  return whitelist[Math.round(Math.random() * whitelist.length)];
}

async function main() {
  const merkleWl = await executeMerkleWhitelist();
  const tableWl = await executeGenericWhitelistExtendBcs("table_wl");
  const vectorWl = await executeGenericWhitelistExtendBcs("vector_wl");
  const dynamicWl = await executeGenericWhitelistExtendBcs("dynamic_wl");

  console.log("\n=========== Transactions Stats ==========\n");
  console.table({
    "Merkle whitelist": {
      "Is whitelisted": merkleWl.isWhitelisted,
      "Total gas used (SUI)": merkleWl.computationCost + merkleWl.storageCost,
      "Computation cost (SUI)": merkleWl.computationCost,
      "Storage cost (SUI)": merkleWl.storageCost,
    },
    "Table whitelist": {
      "Is whitelisted": tableWl.isWhitelisted,
      "Total gas used (SUI)": tableWl.computationCost + tableWl.storageCost,
      "Computation cost (SUI)": tableWl.computationCost,
      "Storage cost (SUI)": tableWl.storageCost,
    },
    "Vector whitelist": {
      "Is whitelisted": vectorWl.isWhitelisted,
      "Total gas used (SUI)": vectorWl.computationCost + vectorWl.storageCost,
      "Computation cost (SUI)": vectorWl.computationCost,
      "Storage cost (SUI)": vectorWl.storageCost,
    },
    "Dynamic field whitelist": {
      "Is whitelisted": dynamicWl.isWhitelisted,
      "Total gas used (SUI)": dynamicWl.computationCost + dynamicWl.storageCost,
      "Computation cost (SUI)": dynamicWl.computationCost,
      "Storage cost (SUI)": dynamicWl.storageCost,
    },
  });

  console.log("\n");
}

main();
