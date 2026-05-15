import { ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const RPC_URL = process.env.ARC_TESTNET_RPC_URL || process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY || "";

if (!PRIVATE_KEY) {
  throw new Error("Set DEPLOYER_PRIVATE_KEY to deploy LunexisStakingManager.");
}

const contractPath = path.resolve("contracts", "LunexisStakingManager.sol");
const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "LunexisStakingManager.sol": { content: source },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors?.filter((item) => item.severity === "error") ?? [];
if (errors.length) {
  throw new Error(errors.map((item) => item.formattedMessage).join("\n"));
}

const compiled = output.contracts["LunexisStakingManager.sol"].LunexisStakingManager;
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const factory = new ethers.ContractFactory(compiled.abi, compiled.evm.bytecode.object, wallet);

console.log("Deploying LunexisStakingManager from", wallet.address);
const contract = await factory.deploy();
await contract.waitForDeployment();
const address = await contract.getAddress();

console.log("LunexisStakingManager deployed:", address);
console.log("Set NEXT_PUBLIC_LUNEXIS_STAKING_MANAGER_ADDRESS=", address);
