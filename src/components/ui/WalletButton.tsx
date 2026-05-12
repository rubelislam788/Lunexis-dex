// src/components/ui/WalletButton.tsx
"use client";

import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatAddress } from "@/lib/utils";
import { useState } from "react";

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [showMenu, setShowMenu] = useState(false);

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-3 px-4 py-2 rounded-lg"
          style={{
            background: "rgba(0,220,229,0.1)",
            border: "1px solid rgba(0,220,229,0.35)",
            fontFamily: "'Space Grotesk'",
          }}
        >
          <div className="flex flex-col items-end">
            {balance && (
              <span style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
              </span>
            )}
            <span style={{ fontSize: 12, color: "#00dce5", fontWeight: 700 }}>
              {formatAddress(address)}
            </span>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #00dce5, #b600f8)" }}
          >
            <span style={{ fontSize: 14 }}>👤</span>
          </div>
        </button>

        {showMenu && (
          <div
            className="absolute right-0 mt-2 w-48 rounded-xl glass-panel z-50"
            style={{ top: "100%" }}
          >
            <div className="p-4">
              <p style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                Connected
              </p>
              <p style={{ fontSize: 12, color: "#e5e2e3", fontFamily: "'Space Grotesk'", wordBreak: "break-all" }}>
                {address}
              </p>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button
                onClick={() => { disconnect(); setShowMenu(false); }}
                className="w-full px-4 py-3 text-left transition-colors"
                style={{
                  fontFamily: "'Space Grotesk'",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#ffb4ab",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,80,80,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
    <button
      className="btn-primary px-5 py-2 rounded-lg"
      style={{ fontSize: 11 }}
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
