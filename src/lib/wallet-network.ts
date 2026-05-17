import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER_URL, ARC_TESTNET_RPC_URLS, ETHEREUM_SEPOLIA_CHAIN_ID, ETHEREUM_SEPOLIA_RPC_URLS } from "@/lib/arc-kit";

type SwitchChain = (input: { chainId: number }) => Promise<unknown>;

const CHAIN_PARAMS: Record<number, any> = {
  [ARC_TESTNET_CHAIN_ID]: {
    chainId: `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`,
    chainName: "Arc Testnet",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    rpcUrls: ARC_TESTNET_RPC_URLS,
    blockExplorerUrls: [ARC_TESTNET_EXPLORER_URL],
  },
  [ETHEREUM_SEPOLIA_CHAIN_ID]: {
    chainId: `0x${ETHEREUM_SEPOLIA_CHAIN_ID.toString(16)}`,
    chainName: "Ethereum Sepolia",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ETHEREUM_SEPOLIA_RPC_URLS,
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
};

async function requestWalletSwitch(chainId: number) {
  const provider = typeof window !== "undefined" ? (window as any).ethereum : undefined;
  if (!provider?.request) return false;

  const hexChainId = `0x${chainId.toString(16)}`;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChainId }] });
    return true;
  } catch (error: any) {
    if (error?.code === 4902 || /unrecognized|not added|wallet_addEthereumChain/i.test(String(error?.message))) {
      const params = CHAIN_PARAMS[chainId];
      if (!params) throw error;
      await provider.request({ method: "wallet_addEthereumChain", params: [params] });
      return true;
    }
    throw error;
  }
}

export async function promptWalletNetworkSwitch(chainId: number, switchChainAsync?: SwitchChain) {
  try {
    if (switchChainAsync) {
      await switchChainAsync({ chainId });
      return;
    }
  } catch (wagmiError) {
    const switched = await requestWalletSwitch(chainId);
    if (switched) return;
    throw wagmiError;
  }

  const switched = await requestWalletSwitch(chainId);
  if (!switched) {
    throw new Error("Wallet network switch is not available. Open your wallet and switch network manually.");
  }
}
