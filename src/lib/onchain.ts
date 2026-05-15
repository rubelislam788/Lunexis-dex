import { createPublicClient, fallback, http, type Address, type Hash } from "viem";
import { sepolia } from "viem/chains";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER_URL, ARC_TESTNET_RPC_URLS, ETHEREUM_SEPOLIA_RPC_URLS, createArcFallbackTransport, normalizeRpcUrl } from "@/lib/arc-kit";

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

export const sepoliaPublicClient = createPublicClient({
  chain: sepolia,
  transport: fallback(ETHEREUM_SEPOLIA_RPC_URLS.map((url) => http(normalizeRpcUrl(url)))),
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
    try {
      return await sepoliaPublicClient.getTransactionReceipt({ hash: txHash });
    } catch {
      return null;
    }
  }
}
