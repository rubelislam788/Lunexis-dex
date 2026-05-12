// src/components/bridge/BridgePage.tsx
"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useArcBridge } from "@/hooks/useArcBridge";
import { useToast } from "@/components/ui/Toast";
import { SUPPORTED_CHAINS, CHAIN_META, type SupportedChain } from "@/lib/arc-kit";

const CHAIN_LIST = Object.values(SUPPORTED_CHAINS) as SupportedChain[];

const STEPS = [
  { id: 1, label: "Approve USDC", desc: "Allow the bridge contract to access your USDC" },
  { id: 2, label: "Burn on Source", desc: "USDC is burned on the source chain via CCTP v2" },
  { id: 3, label: "Attestation", desc: "Circle attests the burn message cross-chain" },
  { id: 4, label: "Mint on Dest.", desc: "Native USDC minted on the destination chain" },
];

export default function BridgePage() {
  const { isConnected, address } = useAccount();
  const { state, updateState, executeBridge, reset } = useArcBridge();
  const { show, ToastContainer } = useToast();
  const [activeStep, setActiveStep] = useState(0);

  const handleBridge = async () => {
    if (!isConnected) {
      show("Please connect your wallet first", "error");
      return;
    }
    setActiveStep(1);
    try {
      // Simulate step progression for UX
      setTimeout(() => setActiveStep(2), 2000);
      setTimeout(() => setActiveStep(3), 5000);
      setTimeout(() => setActiveStep(4), 8000);

      await executeBridge();
      setActiveStep(4);
      show(`✓ Bridged ${state.amount} USDC: ${state.fromChain} → ${state.toChain}`, "success");
    } catch (err: any) {
      setActiveStep(0);
      show(err.message || "Bridge failed", "error");
    }
  };

  const isLoading = state.status === "approving" || state.status === "bridging";
  const isSuccess = state.status === "success";

  return (
    <div
      className="min-h-screen pt-16"
      style={{ background: "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(182,0,248,0.05) 0%, transparent 70%), #131314" }}
    >
      <ToastContainer />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3" style={{ background: "rgba(182,0,248,0.08)", border: "1px solid rgba(182,0,248,0.2)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#b600f8" }} />
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#ebb2ff" }}>
              CIRCLE CCTP V2 · ARC APP KIT
            </span>
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 36, fontWeight: 900, letterSpacing: "-0.02em", color: "#e9feff", marginBottom: 8 }}>
            Cross-Chain Bridge
          </h1>
          <p style={{ color: "#849495", fontSize: 16 }}>
            Move native USDC across chains using Circle's CCTP v2 protocol.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* === BRIDGE CARD === */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl p-6"
              style={{ background: "#0e0e0f", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* From chain */}
              <div className="mb-4">
                <label style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>
                  From Chain
                </label>
                <select
                  value={state.fromChain}
                  onChange={(e) => updateState({ fromChain: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg"
                  style={{ fontFamily: "'Space Grotesk'", fontSize: 13 }}
                >
                  {CHAIN_LIST.map((c) => (
                    <option key={c} value={c}>{CHAIN_META[c]?.label ?? c}</option>
                  ))}
                </select>
              </div>

              {/* Arrow */}
              <div className="flex items-center gap-3 my-3">
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#00dce5,#b600f8)", fontSize: 16 }}
                >
                  ↓
                </div>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>

              {/* To chain */}
              <div className="mb-6">
                <label style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>
                  To Chain
                </label>
                <select
                  value={state.toChain}
                  onChange={(e) => updateState({ toChain: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg"
                  style={{ fontFamily: "'Space Grotesk'", fontSize: 13 }}
                >
                  {CHAIN_LIST.filter((c) => c !== state.fromChain).map((c) => (
                    <option key={c} value={c}>{CHAIN_META[c]?.label ?? c}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="mb-4">
                <label style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>
                  Amount (USDC)
                </label>
                <div
                  className="mt-1 flex items-center gap-3 px-4 py-4 rounded-xl"
                  style={{ background: "#000", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <input
                    type="number"
                    value={state.amount}
                    onChange={(e) => updateState({ amount: e.target.value })}
                    placeholder="1.00"
                    className="flex-1 text-2xl bg-transparent border-none outline-none"
                    style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, color: "#e5e2e3" }}
                    min="0"
                    step="any"
                  />
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "rgba(0,220,229,0.1)", border: "1px solid rgba(0,220,229,0.25)" }}
                  >
                    <span style={{ fontSize: 18 }}>💵</span>
                    <span style={{ fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 700, color: "#00dce5" }}>USDC</span>
                  </div>
                </div>
              </div>

              {/* Recipient (optional) */}
              <div className="mb-6">
                <label style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>
                  Recipient Address <span style={{ color: "#3a494a" }}>(optional — defaults to your wallet)</span>
                </label>
                <input
                  type="text"
                  value={state.recipientAddress}
                  onChange={(e) => updateState({ recipientAddress: e.target.value })}
                  placeholder={address ?? "0x..."}
                  className="mt-1 w-full px-4 py-3 rounded-lg"
                  style={{ fontFamily: "'Space Grotesk'", fontSize: 12 }}
                />
              </div>

              {/* CCTP info badge */}
              <div
                className="rounded-xl p-3 mb-6 flex items-center gap-3"
                style={{ background: "rgba(182,0,248,0.04)", border: "1px solid rgba(182,0,248,0.15)" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(182,0,248,0.15)" }}
                >
                  <span style={{ fontSize: 16 }}>🌉</span>
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, color: "#ebb2ff", letterSpacing: "0.08em" }}>
                    CIRCLE CCTP V2
                  </div>
                  <div style={{ fontSize: 11, color: "#555" }}>
                    Native USDC · No wrapped tokens · Circle-attested burn & mint
                  </div>
                </div>
              </div>

              {/* CTA */}
              {isSuccess ? (
                <div className="text-center">
                  <div
                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "rgba(182,0,248,0.12)", border: "2px solid #b600f8", boxShadow: "0 0 28px rgba(182,0,248,0.3)" }}
                  >
                    <span style={{ fontSize: 32 }}>✓</span>
                  </div>
                  <div style={{ fontFamily: "'Space Grotesk'", fontSize: 20, fontWeight: 700, color: "#ebb2ff", marginBottom: 4 }}>
                    Bridge Complete!
                  </div>
                  <p style={{ fontSize: 13, color: "#555", marginBottom: 16 }}>
                    {state.amount} USDC delivered to {state.toChain}
                  </p>
                  {state.txHash && (
                    <a
                      href={`https://scan.arc.io/tx/${state.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "#555", textDecoration: "underline", display: "block", marginBottom: 16 }}
                    >
                      View on ArcScan →
                    </a>
                  )}
                  <button
                    onClick={() => { reset(); setActiveStep(0); }}
                    className="w-full py-3 rounded-lg"
                    style={{
                      background: "rgba(182,0,248,0.08)",
                      border: "1px solid rgba(182,0,248,0.25)",
                      color: "#ebb2ff",
                      fontFamily: "'Space Grotesk'",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    Bridge Again
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleBridge}
                  disabled={isLoading || !state.amount}
                  className="w-full py-4 rounded-xl transition-all"
                  style={{
                    background: "linear-gradient(135deg, #b600f8, #00dce5)",
                    color: "white",
                    fontFamily: "'Space Grotesk'",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: isLoading || !state.amount ? "not-allowed" : "pointer",
                    opacity: isLoading || !state.amount ? 0.5 : 1,
                    boxShadow: "0 0 24px rgba(182,0,248,0.25)",
                  }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="spinner w-5 h-5 inline-block" />
                      {state.status === "approving" ? "Approving USDC…" : "Bridging…"}
                    </span>
                  ) : isConnected ? "Confirm Bridge" : "Connect Wallet to Bridge"}
                </button>
              )}

              {state.error && (
                <p className="mt-3 text-center" style={{ color: "#ffb4ab", fontSize: 12 }}>
                  {state.error}
                </p>
              )}
            </div>
          </div>

          {/* === SIDE PANEL === */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* CCTP Steps */}
            <div className="rounded-2xl p-5" style={{ background: "#0e0e0f", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 700, color: "#e5e2e3", marginBottom: 16 }}>
                Bridge Progress
              </h3>
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className="flex gap-3 mb-4 last:mb-0 p-3 rounded-xl transition-all"
                  style={{
                    background: activeStep === step.id
                      ? "rgba(182,0,248,0.08)"
                      : activeStep > step.id
                        ? "rgba(0,220,229,0.04)"
                        : "rgba(255,255,255,0.02)",
                    border: `1px solid ${activeStep === step.id
                      ? "rgba(182,0,248,0.4)"
                      : activeStep > step.id
                        ? "rgba(0,220,229,0.2)"
                        : "rgba(255,255,255,0.04)"}`,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: activeStep > step.id
                        ? "rgba(0,220,229,0.2)"
                        : activeStep === step.id
                          ? "rgba(182,0,248,0.2)"
                          : "rgba(255,255,255,0.05)",
                      border: `1px solid ${activeStep > step.id ? "#00dce5" : activeStep === step.id ? "#b600f8" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    {activeStep > step.id ? (
                      <span style={{ fontSize: 11, color: "#00dce5" }}>✓</span>
                    ) : (
                      <span style={{ fontFamily: "'Space Grotesk'", fontSize: 9, fontWeight: 700, color: activeStep === step.id ? "#ebb2ff" : "#555" }}>
                        {String(step.id).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 700, color: activeStep === step.id ? "#ebb2ff" : activeStep > step.id ? "#e5e2e3" : "#555", marginBottom: 2 }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#555", lineHeight: 1.5 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* SDK snippet */}
            <div className="rounded-2xl p-5" style={{ background: "#0e0e0f", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 700, color: "#849495" }}>SDK CALL</h3>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>@circle-fin/app-kit</span>
              </div>
              <pre
                className="rounded-lg p-4 text-xs overflow-auto"
                style={{
                  background: "#000",
                  border: "1px solid rgba(182,0,248,0.1)",
                  color: "#ebb2ff",
                  fontFamily: "'Space Grotesk', monospace",
                  lineHeight: 1.7,
                }}
              >
{`await kit.bridge({
  from: {
    adapter: viemAdapter,
    chain: "${state.fromChain}",
  },
  to: {
    adapter: viemAdapter,
    chain: "${state.toChain}",
  },
  amount: "${state.amount || "1.00"}",
});`}
              </pre>
            </div>

            {/* Supported chains */}
            <div className="rounded-2xl p-5" style={{ background: "#0e0e0f", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 700, color: "#849495", marginBottom: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Supported Chains
              </h3>
              <div className="flex flex-wrap gap-2">
                {CHAIN_LIST.map((c) => (
                  <span
                    key={c}
                    className="px-3 py-1 rounded-full"
                    style={{
                      fontFamily: "'Space Grotesk'",
                      fontSize: 10,
                      fontWeight: 700,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#849495",
                    }}
                  >
                    {CHAIN_META[c]?.icon} {CHAIN_META[c]?.label ?? c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
