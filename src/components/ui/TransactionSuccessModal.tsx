"use client";

import { useState } from "react";

interface TransactionSuccessModalProps {
  open: boolean;
  kind: "swap" | "bridge";
  amount: string;
  fromLabel: string;
  toLabel: string;
  network: string;
  txHash?: string;
  gasFee?: string;
  timestamp?: string;
  onClose: () => void;
}

export default function TransactionSuccessModal({
  open,
  kind,
  amount,
  fromLabel,
  toLabel,
  network,
  txHash,
  gasFee = "Calculated by wallet",
  timestamp,
  onClose,
}: TransactionSuccessModalProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const explorerUrl = txHash ? `https://scan.arc.io/tx/${txHash}` : undefined;
  const completedAt = timestamp ? new Date(timestamp) : new Date();
  const title = kind === "swap" ? "Swap Completed" : "Bridge Successful";
  const route = kind === "swap" ? `${amount || "0"} ${fromLabel} -> ${toLabel}` : `${amount || "0"} ${fromLabel} to ${toLabel}`;

  const copyHash = async () => {
    if (!txHash) return;
    await navigator.clipboard?.writeText(txHash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 arc-success-backdrop" onClick={onClose}>
      <div className="arc-success-modal w-[min(560px,94vw)] rounded-3xl p-6" onClick={(event) => event.stopPropagation()}>
        <span className="arc-success-particle" style={{ left: "12%", top: "18%" }} />
        <span className="arc-success-particle" style={{ left: "82%", top: "22%", animationDelay: "0.7s" }} />
        <span className="arc-success-particle" style={{ left: "70%", top: "76%", animationDelay: "1.2s" }} />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="arc-success-check">
              <span className="material-symbols-outlined" style={{ fontSize: 34 }}>check</span>
            </div>
            <div>
              <p style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", color: "#38bdf8", textTransform: "uppercase" }}>
                Transaction Confirmed
              </p>
              <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900, color: "#f8fbff", marginTop: 3 }}>
                {title}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost rounded-xl px-3 py-2" aria-label="Close transaction modal">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        <div className="mt-6 rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(148,217,255,0.12)" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Detail label="Route" value={route} />
            <Detail label="Network" value={network} />
            <Detail label="Status" value="Successfully Completed" accent />
            <Detail label="Completed" value={completedAt.toLocaleString()} />
          </div>
          {txHash && (
            <div className="mt-4 rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ color: "#849495", fontSize: 11, textTransform: "uppercase", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>Transaction Hash</div>
              <div className="mt-2 break-all" style={{ color: "#dff8ff", fontFamily: "'Space Grotesk'", fontSize: 12 }}>{txHash}</div>
            </div>
          )}
        </div>

        {expanded && (
          <div className="mt-4 rounded-2xl p-4 arc-fade-up" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.14)" }}>
            <Detail label="Gas Fee" value={gasFee} />
            <Detail label="Receipt" value="Wallet transaction receipt confirmed onchain and added to activity history." />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <button onClick={() => setExpanded((value) => !value)} className="btn-ghost py-3 rounded-2xl">
            {expanded ? "Hide Details" : "Full Details"}
          </button>
          <button onClick={copyHash} disabled={!txHash} className="btn-ghost py-3 rounded-2xl">
            {copied ? "Copied" : "Copy Hash"}
          </button>
          {explorerUrl ? (
            <a href={explorerUrl} target="_blank" rel="noreferrer" className="btn-primary py-3 rounded-2xl text-center">
              Explorer
            </a>
          ) : (
            <button disabled className="btn-primary py-3 rounded-2xl">Explorer</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ color: "#849495", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{label}</div>
      <div style={{ color: accent ? "#22c55e" : "#f8fbff", fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}
