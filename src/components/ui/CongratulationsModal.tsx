"use client";

import { ARC_TESTNET_EXPLORER_URL } from "@/lib/arc-kit";

interface CongratulationsModalProps {
  open: boolean;
  title?: string;
  message: string;
  amount?: string;
  txHash?: string;
  onClose: () => void;
}

export default function CongratulationsModal({
  open,
  title = "Congratulations",
  message,
  amount,
  txHash,
  onClose,
}: CongratulationsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 arc-success-backdrop" onClick={onClose}>
      <div className="arc-success-modal lunexis-congrats-modal w-[min(540px,94vw)] rounded-3xl p-6 text-center" onClick={(event) => event.stopPropagation()}>
        <span className="arc-success-particle" style={{ left: "12%", top: "18%" }} />
        <span className="arc-success-particle" style={{ left: "82%", top: "20%", animationDelay: "0.55s" }} />
        <span className="arc-success-particle" style={{ left: "72%", top: "78%", animationDelay: "1.1s" }} />
        <span className="arc-success-particle" style={{ left: "22%", top: "76%", animationDelay: "1.45s" }} />

        <div className="mx-auto arc-success-check lunexis-congrats-orb">
          <span className="material-symbols-outlined" style={{ fontSize: 38 }}>workspace_premium</span>
        </div>
        <p style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: "#38bdf8", textTransform: "uppercase", marginTop: 18 }}>
          Reward Confirmed
        </p>
        <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 32, fontWeight: 900, color: "#f8fbff", marginTop: 6 }}>
          {title}
        </h2>
        {amount && (
          <div className="mt-5 rounded-3xl px-5 py-4" style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.22)", color: "#ff2db2", fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900 }}>
            {amount}
          </div>
        )}
        <p style={{ color: "#b9caca", fontSize: 14, lineHeight: 1.7, marginTop: 16 }}>
          {message}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost py-3 rounded-2xl">
            Close
          </button>
          {txHash ? (
            <a href={`${ARC_TESTNET_EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noreferrer" className="btn-primary py-3 rounded-2xl text-center">
              View TX
            </a>
          ) : (
            <button disabled className="btn-primary py-3 rounded-2xl">View TX</button>
          )}
        </div>
      </div>
    </div>
  );
}
