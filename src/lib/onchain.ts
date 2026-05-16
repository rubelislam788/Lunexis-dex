import { createPublicClient, type Address, type Hash } from "viem";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER_URL, ARC_TESTNET_RPC_URLS, createArcFallbackTransport } from "@/lib/arc-kit";

export const arcTestnetChain = {
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ARC_TESTNET_RPC_URLS },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: ARC_TESTNET_EXPLORER_URL },
  },
  testnet: true,
} as const;

export const arcPublicClient = createPublicClient({
  chain: arcTestnetChain,
  transport: createArcFallbackTransport(),
});

export async function getArcNativeBalance(address: Address) {
  return arcPublicClient.getBalance({ address });
}

export async function getTransactionReceiptAnyChain(hash?: string) {
  if (!hash) return null;
  const txHash = hash as Hash;

  try {
    return await arcPublicClient.getTransactionReceipt({ hash: txHash });
  } catch {
    return null;
  }
}
