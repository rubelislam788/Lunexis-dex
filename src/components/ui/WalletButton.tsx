// src/components/ui/WalletButton.tsx
"use client";

import { useState } from "react";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import type { Page } from "@/types";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import { formatAddress } from "@/lib/utils";
import TokenIcon from "@/components/ui/TokenIcon";

export default function WalletButton({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const { profile } = useProfile();
  const { balances, isLoading: balancesLoading } = usePortfolioBalances();
  const [showMenu, setShowMenu] = useState(false);
  const [showWallets, setShowWallets] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);

  const walletOptions = [
    { id: "metaMask", label: "MetaMask", hint: "Browser extension", connector: connectors.find((item) => item.id === "metaMask" || item.name.toLowerCase().includes("metamask")), installed: typeof window !== "undefined" && Boolean((window as any).ethereum?.isMetaMask) },
    { id: "walletConnect", label: "WalletConnect", hint: "Mobile and QR wallets", connector: connectors.find((item) => item.id === "walletConnect" || item.name.toLowerCase().includes("walletconnect")), installed: true },
    { id: "coinbase", label: "Coinbase Wallet", hint: "Coinbase extension/app", connector: connectors.find((item) => item.name.toLowerCase().includes("coinbase")), installed: true },
    { id: "rabby", label: "Rabby Wallet", hint: "Injected wallet", connector: connectors.find((item) => item.id === "injected"), installed: typeof window !== "undefined" && Boolean((window as any).ethereum?.isRabby) },
    { id: "okx", label: "OKX Wallet", hint: "Injected wallet", connector: connectors.find((item) => item.id === "injected"), installed: typeof window !== "undefined" && Boolean((window as any).okxwallet || (window as any).ethereum?.isOkxWallet) },
  ];

  const handleConnect = (id: string, connector: typeof connectors[number] | undefined) => {
    if (!connector) return;
    setConnectingWallet(id);
    connect(
      { connector },
      {
        onSettled: () => {
          setConnectingWallet(null);
          setShowWallets(false);
        },
      }
    );
  };

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-3 px-4 py-2 rounded-xl"
          style={{
            background: "rgba(56,189,248,0.1)",
            border: "1px solid rgba(56,189,248,0.35)",
            fontFamily: "'Space Grotesk'",
            boxShadow: "0 0 22px rgba(56,189,248,0.14)",
          }}
        >
          <div className="flex flex-col items-end">
            {balance && (
              <span style={{ fontSize: 10, color: "#8fb0c9", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
              </span>
            )}
            <span style={{ fontSize: 12, color: "#38bdf8", fontWeight: 800 }}>
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
          <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-panel z-50" style={{ top: "100%" }}>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                {profile?.avatarDataUrl ? (
                  <img src={profile.avatarDataUrl} alt="Profile" className="w-12 h-12 rounded-full object-cover" style={{ boxShadow: "0 0 22px rgba(56,189,248,0.28)" }} />
                ) : (
                  <span className="w-12 h-12 rounded-full grid place-items-center" style={{ background: "linear-gradient(135deg,#38bdf8,#ff2db2)", color: "white", fontFamily: "'Space Grotesk'", fontWeight: 900 }}>OP</span>
                )}
                <div>
                  <p style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: "#f8fbff", fontWeight: 900 }}>
                    {profile?.username ?? "ARC Operator"}
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

  return (
    <>
      <button
        className="btn-primary px-5 py-2 rounded-xl"
        style={{ fontSize: 11 }}
        onClick={() => setShowWallets(true)}
        disabled={isPending || connectors.length === 0}
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
      {showWallets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }} onClick={(event) => { event.stopPropagation(); setShowWallets(false); }}>
          <div className="arc-card rounded-3xl p-6 w-96 text-left" onClick={(event) => event.stopPropagation()}>
            <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 20, fontWeight: 900, color: "#f8fbff", marginBottom: 6 }}>Connect Wallet</h3>
            <p style={{ color: "#849495", fontSize: 13, marginBottom: 18 }}>Choose a wallet adapter for ARC Quest.</p>
            <div className="grid gap-3">
              {walletOptions.map((wallet) => (
                <button
                  key={wallet.id}
                  type="button"
                  disabled={!wallet.connector || connectingWallet !== null}
                  onClick={() => handleConnect(wallet.id, wallet.connector)}
                  className="flex items-center justify-between rounded-2xl p-4 transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#f8fbff" }}
                >
                  <span>
                    <span style={{ display: "block", fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 900 }}>{wallet.label}</span>
                    <span style={{ display: "block", color: "#849495", fontSize: 11 }}>{wallet.hint}</span>
                  </span>
                  <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, color: wallet.installed ? "#38bdf8" : "#849495", textTransform: "uppercase" }}>
                    {connectingWallet === wallet.id ? "Loading" : wallet.installed ? "Detected" : "Connect"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
