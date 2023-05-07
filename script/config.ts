import { Connection, JsonRpcProvider, Ed25519Keypair, RawSigner } from "@mysten/sui.js";

// Setup connection
const mnemonics = "invest half dress clay green task scare hood quiz good glory angry";

const connection = new Connection({ fullnode: "http://127.0.0.1:9000" });
const provider = new JsonRpcProvider(connection);
const keypair = Ed25519Keypair.deriveKeypair(mnemonics);
export const signer = new RawSigner(keypair, provider);
export const packageId = "0x9fa483d3dfc4bd82d9316686f618c6e05145a211c896a9baed048dbb7ecd5190";
