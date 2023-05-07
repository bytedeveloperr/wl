import { TransactionBlock, MIST_PER_SUI, bcs } from "@mysten/sui.js";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

import { packageId, signer } from "./config";
import whitelist from "./whitelist.json";

interface ExecuteInputData {
  wlId: string;
  module: string;
  args: any[];
}

async function executeScript(data: ExecuteInputData) {
  const txb = new TransactionBlock();
  const args = data.args.map((arg) => txb.pure(arg));

  txb.moveCall({
    typeArguments: [],
    arguments: [txb.object(data.wlId), ...args],
    target: `${packageId}::${data.module}::is_whitelisted`,
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
async function executeMerkleWhitelist(wlId: string) {
  const leaves = whitelist.map((wl: string) => keccak256(wl));
  const tree = new MerkleTree(leaves, keccak256);

  const randomAddress = getRandomWhitelistedAddress();
  const leaf = keccak256(randomAddress);
  const positions = tree.getProof(leaf).map((p: { position: string }) => (p.position === "right" ? 1 : 0));

  return await executeScript({
    wlId,
    module: "merkle_wl",
    args: [
      tree.getHexProof(leaf).map((proof: string) => Array.from(Buffer.from(proof.slice(2), "hex"))),
      positions,
      randomAddress,
    ],
  });
}

async function executeGenericWhitelist(module: string, wlId: string) {
  const randomAddress = getRandomWhitelistedAddress();

  return await executeScript({
    wlId,
    module,
    args: [randomAddress],
  });
}

function getRandomWhitelistedAddress() {
  return whitelist[Math.round(Math.random() * whitelist.length)];
}

async function main() {
  const dynamicWlId = "0x71d4bb84267965ca82ecd030e62bfc27df3f4a64938077b2edd501da58d616a5";
  const merkleWlId = "0xaf157b677a23650594334ce1dab7f2e1ea4c10c371865216dcad1ca2edfe0a41";
  const tableWlId = "0xec6c3e335ebb394cbebafd759f5db1e92af25b23a6404d3069ddd8b1f617e503";
  const vectorWlId = "0x1ae3a0404503008db82c3c96baa08de0c90b3b99a19e88e944e2b1202327d57f";

  const merkleWl = await executeMerkleWhitelist(merkleWlId);
  const tableWl = await executeGenericWhitelist("table_wl", tableWlId);
  const vectorWl = await executeGenericWhitelist("vector_wl", vectorWlId);
  const dynamicWl = await executeGenericWhitelist("dynamic_wl", dynamicWlId);

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
