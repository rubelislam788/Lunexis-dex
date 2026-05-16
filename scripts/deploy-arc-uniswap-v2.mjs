import { Contract, ContractFactory, JsonRpcProvider, MaxUint256, Wallet, parseUnits, ZeroAddress } from "ethers";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const UniswapV2Factory = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const UniswapV2Router02 = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");

const ERC20_ABI = [
  "function approve(address spender,uint256 amount) external returns (bool)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function faucet(uint256 value) external",
];

const FACTORY_ABI = [
  "function getPair(address tokenA,address tokenB) external view returns (address)",
  "function createPair(address tokenA,address tokenB) external returns (address)",
];

const ROUTER_ABI = [
  "function addLiquidity(address tokenA,address tokenB,uint256 amountADesired,uint256 amountBDesired,uint256 amountAMin,uint256 amountBMin,address to,uint256 deadline) external returns (uint256 amountA,uint256 amountB,uint256 liquidity)",
];

const env = process.env;
const rpcUrl = env.ARC_RPC_URL || env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";
const privateKey = env.ARC_DEPLOYER_PRIVATE_KEY || env.PRIVATE_KEY;
const weth = env.WETH_ADDRESS || env.NEXT_PUBLIC_WETH_ARC_ADDRESS || "0x7E24AF6B090871ebbD60f57BA0A09F27db898640";
const tokens = {
  ARC: env.ARC_TOKEN_ADDRESS || env.NEXT_PUBLIC_ARC_TOKEN_ADDRESS || "0x6a801562296A1Dbc9244ca3764981D21A22974d6",
  USDC: env.USDC_ADDRESS || env.NEXT_PUBLIC_USDC_ADDRESS || env.NEXT_PUBLIC_USDC_ARC_ADDRESS || "0x3600000000000000000000000000000000000000",
  EURC: env.EURC_ADDRESS || env.NEXT_PUBLIC_EURC_ADDRESS || env.NEXT_PUBLIC_EURC_ARC_ADDRESS || "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
  WETH: weth,
};

if (!privateKey) {
  throw new Error("Set ARC_DEPLOYER_PRIVATE_KEY in your shell. Do not commit it.");
}

const provider = new JsonRpcProvider(rpcUrl);
const wallet = new Wallet(privateKey, provider);

function liquidityEnv(symbolA, symbolB) {
  return {
    amountA: env[`LIQUIDITY_${symbolA}_${symbolB}_${symbolA}`] || env[`LIQUIDITY_${symbolA}`] || "0",
    amountB: env[`LIQUIDITY_${symbolA}_${symbolB}_${symbolB}`] || env[`LIQUIDITY_${symbolB}`] || "0",
  };
}

async function wait(tx, label) {
  console.log(`${label}: ${tx.hash}`);
  return tx.wait();
}

async function approveMax(tokenAddress, spender) {
  const token = new Contract(tokenAddress, ERC20_ABI, wallet);
  await wait(await token.approve(spender, MaxUint256), `approve ${tokenAddress}`);
}

async function parseTokenAmount(tokenAddress, value) {
  const token = new Contract(tokenAddress, ERC20_ABI, wallet);
  const decimals = await token.decimals();
  return parseUnits(value, decimals);
}

async function maybeMintWeth() {
  const value = env.MINT_WETH;
  if (!value || value === "0") return;
  const token = new Contract(weth, ERC20_ABI, wallet);
  await wait(await token.faucet(parseUnits(value, 18)), "mint WETH");
}

async function createPair(factory, symbolA, symbolB) {
  const tokenA = tokens[symbolA];
  const tokenB = tokens[symbolB];
  const existing = await factory.getPair(tokenA, tokenB);
  if (existing !== ZeroAddress) {
    console.log(`${symbolA}/${symbolB} pair exists: ${existing}`);
    return existing;
  }

  await wait(await factory.createPair(tokenA, tokenB), `create ${symbolA}/${symbolB} pair`);
  const pair = await factory.getPair(tokenA, tokenB);
  console.log(`${symbolA}/${symbolB} pair: ${pair}`);
  return pair;
}

async function maybeAddLiquidity(router, symbolA, symbolB) {
  const { amountA, amountB } = liquidityEnv(symbolA, symbolB);
  if (amountA === "0" || amountB === "0") {
    console.log(`skip ${symbolA}/${symbolB} liquidity; set LIQUIDITY_${symbolA}_${symbolB}_${symbolA} and LIQUIDITY_${symbolA}_${symbolB}_${symbolB}`);
    return;
  }

  const tokenA = tokens[symbolA];
  const tokenB = tokens[symbolB];
  const parsedA = await parseTokenAmount(tokenA, amountA);
  const parsedB = await parseTokenAmount(tokenB, amountB);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

  await approveMax(tokenA, await router.getAddress());
  await approveMax(tokenB, await router.getAddress());
  await wait(
    await router.addLiquidity(tokenA, tokenB, parsedA, parsedB, 0, 0, wallet.address, deadline),
    `add ${symbolA}/${symbolB} liquidity`,
  );
}

async function main() {
  console.log(`Deployer: ${wallet.address}`);
  console.log(`RPC: ${rpcUrl}`);

  await maybeMintWeth();

  const factoryDeploy = new ContractFactory(UniswapV2Factory.abi, UniswapV2Factory.bytecode, wallet);
  const factory = await factoryDeploy.deploy(wallet.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`Factory deployed: ${factoryAddress}`);

  const routerDeploy = new ContractFactory(UniswapV2Router02.abi, UniswapV2Router02.bytecode, wallet);
  const router = await routerDeploy.deploy(factoryAddress, weth);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log(`Router02 deployed: ${routerAddress}`);

  const factoryContract = new Contract(factoryAddress, FACTORY_ABI, wallet);
  const routerContract = new Contract(routerAddress, ROUTER_ABI, wallet);
  const pairs = [
    ["ARC", "WETH"],
    ["WETH", "USDC"],
    ["WETH", "EURC"],
  ];

  for (const [symbolA, symbolB] of pairs) {
    await createPair(factoryContract, symbolA, symbolB);
    await maybeAddLiquidity(routerContract, symbolA, symbolB);
  }

  console.log("\nAdd these to Vercel:");
  console.log(`NEXT_PUBLIC_ARC_SWAP_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`NEXT_PUBLIC_ARC_SWAP_ROUTER_ADDRESS=${routerAddress}`);
  console.log(`NEXT_PUBLIC_WETH_ARC_ADDRESS=${weth}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
