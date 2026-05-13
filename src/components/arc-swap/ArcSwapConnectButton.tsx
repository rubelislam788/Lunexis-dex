"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function ArcSwapConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!connected) {
          return (
            <button className="btn-primary px-5 py-2.5 rounded-2xl" onClick={openConnectModal}>
              Connect Wallet
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button className="btn-ghost px-4 py-2.5 rounded-2xl" onClick={openChainModal}>
              Wrong Network
            </button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <button className="btn-ghost px-3 py-2 rounded-2xl" onClick={openChainModal}>
              {chain.name}
            </button>
            <button className="btn-primary px-4 py-2 rounded-2xl" onClick={openAccountModal}>
              {account.displayName}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
