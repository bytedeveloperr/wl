import { TransactionBlock, MIST_PER_SUI, bcs } from "@mysten/sui.js";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

import { packageId, signer } from "./config";
import bigWhitelist from "./bigWhitelist.json";
import whitelist from "./whitelist.json";

interface ExecuteInputData {
  module: string;
  args: any[];
}

async function executeScript(data: ExecuteInputData) {
  const txb = new TransactionBlock();
  const args = data.args.map((arg) => txb.pure(arg));

  const [wl] = txb.moveCall({
    typeArguments: [],
    arguments: [...args],
    target: `${packageId}::${data.module}::create`,
  });

  txb.moveCall({
    typeArguments: [],
    arguments: [wl],
    target: `${packageId}::${data.module}::return_and_share`,
  });

  txb.setGasBudget(10000000000);

  const {
    effects: { gasUsed },
  } = await signer.signAndExecuteTransactionBlock({
    transactionBlock: txb,
    options: { showEvents: true, showEffects: true },
  });

  const storageCost = Number(gasUsed.storageCost) / Number(MIST_PER_SUI);
  const computationCost = Number(gasUsed.computationCost) / Number(MIST_PER_SUI);

  return {
    isWhitelisted: undefined,
    storageCost,
    computationCost,
  };
}

async function executeMerkleWhitelist() {
  const leaves = whitelist.map((wl: string) => keccak256(wl));
  const tree = new MerkleTree(leaves, keccak256);
  const root = tree.getHexRoot();

  return await executeScript({
    module: "merkle_wl",
    args: [Array.from(Buffer.from(root.slice(2), "hex"))],
  });
}

async function executeGenericWhitelist(module: string) {
  return await executeScript({
    module,
    args: [whitelist],
  });
}

// Trying to extend the bcs limit
async function executeGenericWhitelistExtendBcs(module: string) {
  return await executeScript({
    module,
    args: [bcs.ser("vector<address>", bigWhitelist, { maxSize: 200 * 1024 }).toBytes()],
  });
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
