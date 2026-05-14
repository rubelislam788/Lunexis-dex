"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function ArcSwapConnectButton({ onProfile }: { onProfile?: () => void }) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, authenticationStatus, openAccountModal, openChainModal, openConnectModal }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              } as const,
            })}
          >
            {!connected ? (
              <button className="btn-primary px-5 py-2.5 rounded-2xl" onClick={openConnectModal} type="button">
                Connect Wallet
              </button>
            ) : chain.unsupported ? (
              <button className="btn-ghost px-4 py-2.5 rounded-2xl" onClick={openChainModal} type="button">
                Wrong Network
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button className="btn-ghost px-3 py-2 rounded-2xl flex items-center gap-2" onClick={openChainModal} type="button">
                  {chain.hasIcon && (
                    <span
                      className="inline-block rounded-full overflow-hidden"
                      style={{ width: 14, height: 14, background: chain.iconBackground || "#07111f", flexShrink: 0 }}
                    >
                      {chain.iconUrl && <img alt={chain.name ?? "Chain icon"} src={chain.iconUrl} style={{ width: 14, height: 14 }} />}
                    </span>
                  )}
                  {chain.name}
                </button>
                <button className="btn-primary px-4 py-2 rounded-2xl" onClick={onProfile ?? openAccountModal} type="button">
                  Profile
                </button>
              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
