// src/components/ui/WalletButton.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import type { Page } from "@/types";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import { formatAddress } from "@/lib/utils";
import TokenIcon from "@/components/ui/TokenIcon";
import ArcLogo from "@/components/ui/ArcLogo";

export default function WalletButton({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const { profile } = useProfile();
  const { balances, isLoading: balancesLoading } = usePortfolioBalances();
  const [mounted, setMounted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showWallets, setShowWallets] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!showWallets) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showWallets]);

  const walletOptions = useMemo(() => {
    const injected = connectors.find((item) => item.id === "injected");
    const byName = (name: string) => connectors.find((item) => item.name.toLowerCase().includes(name));
    const hasWindow = typeof window !== "undefined";
    const ethereum = hasWindow ? (window as any).ethereum : undefined;

    return [
      {
        id: "metaMask",
        label: "MetaMask",
        hint: "Extension or mobile browser",
        connector: byName("metamask") ?? (ethereum?.isMetaMask ? injected : undefined),
        installed: Boolean(ethereum?.isMetaMask),
      },
      {
        id: "walletConnect",
        label: "WalletConnect",
        hint: "Mobile wallets and QR connect",
        connector: connectors.find((item) => item.id === "walletConnect" || item.name.toLowerCase().includes("walletconnect")),
        installed: true,
      },
      {
        id: "coinbase",
        label: "Coinbase Wallet",
        hint: "Coinbase app or extension",
        connector: byName("coinbase"),
        installed: true,
      },
      {
        id: "injected",
        label: "Browser Wallet",
        hint: "Detected injected wallet",
        connector: injected,
        installed: Boolean(ethereum),
      },
      {
        id: "okx",
        label: "OKX Wallet",
        hint: "OKX app or extension",
        connector: hasWindow && ((window as any).okxwallet || ethereum?.isOkxWallet) ? injected : undefined,
        installed: hasWindow && Boolean((window as any).okxwallet || ethereum?.isOkxWallet),
      },
    ].filter((wallet, index, list) => wallet.connector || index < 3 || wallet.installed)
      .filter((wallet, index, list) => list.findIndex((item) => item.id === wallet.id) === index);
  }, [connectors]);

  const handleConnect = (id: string, connector: typeof connectors[number] | undefined) => {
    if (!connector) return;
    setConnectingWallet(id);
    connect(
      { connector },
      {
        onSuccess: () => {
          setConnectingWallet(null);
          setShowWallets(false);
        },
        onError: () => setConnectingWallet(null),
      }
    );
  };

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-3 px-3 sm:px-4 py-2 rounded-xl max-w-[calc(100vw-1rem)]"
          style={{
            background: "rgba(56,189,248,0.1)",
            border: "1px solid rgba(56,189,248,0.35)",
            fontFamily: "'Space Grotesk'",
            boxShadow: "0 0 22px rgba(56,189,248,0.14)",
          }}
        >
          <div className="flex flex-col items-end min-w-0">
            {balance && (
              <span style={{ fontSize: 10, color: "#8fb0c9", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
              </span>
            )}
            <span style={{ fontSize: 12, color: "#38bdf8", fontWeight: 800, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile?.username ?? formatAddress(address)}
            </span>
          </div>
          {profile?.avatarDataUrl ? (
            <img src={profile.avatarDataUrl} alt="Profile" className="w-9 h-9 rounded-full object-cover" style={{ border: "1px solid rgba(56,189,248,0.45)" }} />
          ) : (
            <span className="w-9 h-9 rounded-full grid place-items-center" style={{ background: "linear-gradient(135deg,#38bdf8,#ff2db2)", color: "white", fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900 }}>OP</span>
          )}
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1rem))] rounded-2xl glass-panel z-50" style={{ top: "100%" }}>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                {profile?.avatarDataUrl ? (
                  <img src={profile.avatarDataUrl} alt="Profile" className="w-12 h-12 rounded-full object-cover" style={{ boxShadow: "0 0 22px rgba(56,189,248,0.28)" }} />
                ) : (
                  <span className="w-12 h-12 rounded-full grid place-items-center" style={{ background: "linear-gradient(135deg,#38bdf8,#ff2db2)", color: "white", fontFamily: "'Space Grotesk'", fontWeight: 900 }}>OP</span>
                )}
                <div>
                  <p style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: "#f8fbff", fontWeight: 900 }}>
                    {profile?.username ?? "Lunexis Operator"}
                  </p>
                  <p style={{ fontSize: 11, color: "#849495", fontFamily: "'Space Grotesk'" }}>
                    {formatAddress(address)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {balances.slice(0, 3).map((item) => (
                  <div key={item.token} className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <TokenIcon symbol={item.token} size={28} />
                    <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "#f8fbff", marginTop: 6 }}>{balancesLoading ? "..." : item.amount}</div>
                    <div style={{ fontSize: 10, color: "#849495" }}>{item.token}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  onNavigate?.("profile");
                  setShowMenu(false);
                }}
                className="btn-primary w-full py-3 rounded-xl mt-4"
              >
                Open Profile
              </button>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button
                onClick={() => {
                  disconnect();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 text-left transition-colors"
                style={{
                  fontFamily: "'Space Grotesk'",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#ffb4ab",
                }}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const walletModal = showWallets && mounted
    ? createPortal(
        <div className="arc-wallet-modal-backdrop fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={() => setShowWallets(false)}>
          <div className="arc-wallet-modal-panel arc-fade-up rounded-3xl p-5 sm:p-6 w-[min(28rem,calc(100vw-2rem))] text-left max-h-[min(90dvh,44rem)] overflow-y-auto" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Connect wallet">
            <div className="flex items-start justify-between gap-4 mb-5">
              <ArcLogo size={46} compact />
              <button onClick={() => setShowWallets(false)} className="arc-icon-action w-10 h-10 rounded-2xl" aria-label="Close wallet modal">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 20, fontWeight: 900, color: "#f8fbff", marginBottom: 6 }}>Connect Wallet</h3>
            <p style={{ color: "#849495", fontSize: 13, marginBottom: 18 }}>Choose a wallet adapter for Lunexis.</p>
            <div className="grid gap-3">
              {walletOptions.map((wallet) => (
                <button
                  key={wallet.id}
                  type="button"
                  disabled={!wallet.connector || connectingWallet !== null}
                  onClick={() => handleConnect(wallet.id, wallet.connector)}
                  className="flex items-center justify-between rounded-2xl p-4 transition-all btn-ghost"
                  style={{ color: "#f8fbff", textTransform: "none", letterSpacing: "0", minHeight: 68 }}
                >
                  <span>
                    <span style={{ display: "block", fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 900 }}>{wallet.label}</span>
                    <span style={{ display: "block", color: "#849495", fontSize: 11 }}>{wallet.hint}</span>
                  </span>
                  <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, color: wallet.connector ? "#38bdf8" : "#849495", textTransform: "uppercase" }}>
                    {connectingWallet === wallet.id ? "Loading" : wallet.connector ? wallet.installed ? "Detected" : "Connect" : "Unavailable"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        className="btn-primary px-5 py-2 rounded-xl"
        style={{ fontSize: 11, minWidth: 132 }}
        onClick={() => setShowWallets(true)}
        disabled={isPending || connectors.length === 0}
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
      {walletModal}
    </>
  );
}
