"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useToast } from "@/components/ui/Toast";

export default function WalletStatusToasts() {
  const { address, isConnected, chain } = useAccount();
  const previousConnected = useRef(false);
  const previousAddress = useRef<string | undefined>(undefined);
  const previousChainId = useRef<number | undefined>(undefined);
  const { show, ToastContainer } = useToast();

  useEffect(() => {
    if (isConnected && address && (!previousConnected.current || previousAddress.current !== address)) {
      show(`Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`, "success");
    }

    if (!isConnected && previousConnected.current) {
      show("Wallet disconnected", "info");
    }

    previousConnected.current = isConnected;
    previousAddress.current = address;
  }, [address, isConnected, show]);

  useEffect(() => {
    if (isConnected && chain?.name && previousChainId.current !== chain.id) {
      show(`Network active: ${chain.name}`, "info");
    }
    previousChainId.current = chain?.id;
  }, [chain?.id, chain?.name, isConnected, show]);

  return <ToastContainer />;
}
