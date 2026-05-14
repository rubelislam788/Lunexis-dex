"use client";

import { ARC_FAUCET_URL } from "@/lib/constants";

export default function FaucetButton({
  label = "Get Test Tokens",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <a
      href={ARC_FAUCET_URL}
      target="_blank"
      rel="noreferrer"
      title="Get test USDC and testnet tokens from the Circle faucet."
      className="arc-uiverse-button inline-flex items-center justify-center gap-2 transition-all"
      style={{
        padding: compact ? "7px 12px" : "10px 16px",
        background: "linear-gradient(135deg, rgba(56,189,248,0.16), rgba(255,45,178,0.12))",
        border: "1px solid rgba(56,189,248,0.42)",
        color: "#dff8ff",
        boxShadow: "0 0 22px rgba(56,189,248,0.18)",
        fontFamily: "'Space Grotesk'",
        fontSize: compact ? 10 : 11,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-2px)";
        event.currentTarget.style.boxShadow = "0 0 30px rgba(56,189,248,0.3)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "translateY(0)";
        event.currentTarget.style.boxShadow = "0 0 22px rgba(56,189,248,0.18)";
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: compact ? 14 : 16 }}>water_drop</span>
      {label}
    </a>
  );
}
