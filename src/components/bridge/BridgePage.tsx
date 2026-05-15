// src/components/bridge/BridgePage.tsx
"use client";

import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useArcBridge } from "@/hooks/useArcBridge";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import { useToast } from "@/components/ui/Toast";
import { CHAIN_META, SUPPORTED_CHAINS, type SupportedChain } from "@/lib/arc-kit";
import { createActivity } from "@/lib/profile";
import { BRIDGE_TOKENS, TOKEN_META } from "@/lib/tokens";
import type { TokenSymbol } from "@/types";
import TokenIcon from "@/components/ui/TokenIcon";
import FaucetButton from "@/components/ui/FaucetButton";
import TransactionSuccessModal from "@/components/ui/TransactionSuccessModal";

const SOURCE_CHAIN_OPTIONS: SupportedChain[] = [SUPPORTED_CHAINS.ETH_SEPOLIA];
const DEST_CHAIN_OPTIONS: SupportedChain[] = [SUPPORTED_CHAINS.ARC_TESTNET];

export default function BridgePage() {
  const { isConnected, address } = useAccount();
  const { state, updateState, executeBridge, approve, needsApproval, bridgeConfigured, bridgeReady, bridgeMode, currentChainId, requiredChainId, reset } = useArcBridge();
  const { pushActivity } = useProfile();
  const { balances, isLoading: balancesLoading, refresh } = usePortfolioBalances();
  const { show, ToastContainer } = useToast();
  const { switchChainAsync, isPending: isSwitchingNetwork } = useSwitchChain();
  const [activeStep, setActiveStep] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showFaucetHint, setShowFaucetHint] = useState(false);
  const [successTx, setSuccessTx] = useState<{ hash?: string; gasFee?: string; timestamp: string } | null>(null);
  const selectedToken = (state.token || "USDC") as TokenSymbol;
  const availableBridgeTokens = bridgeMode === "contract" ? BRIDGE_TOKENS : (["USDC"] as TokenSymbol[]);

  const handleBridge = async () => {
    setConfirmOpen(false);
    if (!isConnected) {
      show("Please connect your wallet first", "error");
      return;
    }
    setActiveStep(1);
    try {
      setTimeout(() => setActiveStep(2), 1200);
      setTimeout(() => setActiveStep(3), 2600);
      setTimeout(() => setActiveStep(4), 4200);
      const result = await executeBridge();
      pushActivity(createActivity("bridge", "Bridge completed", `${state.amount} ${selectedToken} bridged from ${state.fromChain} to ${state.toChain}.`, selectedToken, "completed", result?.hash));
      setSuccessTx({ hash: result?.hash, gasFee: result?.gasFee, timestamp: new Date().toISOString() });
      refresh();
      show(`Bridged ${state.amount} ${selectedToken}`, "success");
    } catch (err: any) {
      const message = err?.message || "Bridge failed";
      setActiveStep(0);
      setShowFaucetHint(/insufficient|funds|balance/i.test(message));
      show(message, "error");
    }
  };

  const handleApprove = async () => {
    try {
      const result = await approve();
      pushActivity(createActivity("wallet", `Approved ${selectedToken}`, `Approval confirmed for bridge execution with ${selectedToken}.`, selectedToken, "completed", result?.hash));
      show(`Approved ${selectedToken} for bridge`, "success");
    } catch (err: any) {
      show(err?.message || "Bridge approval failed", "error");
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchChainAsync({ chainId: requiredChainId });
      show("Wallet switched to Ethereum", "success");
    } catch (err: any) {
      show(err?.message || "Network switch failed", "error");
    }
  };

  const isLoading = state.status === "approving" || state.status === "bridging";

  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <ToastContainer />
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3" style={{ background: "rgba(255,45,178,0.08)", border: "1px solid rgba(255,45,178,0.22)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#ff2db2" }} />
              <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#ffb7eb" }}>ARC BRIDGE ROUTER</span>
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 40, fontWeight: 900, color: "#f8fbff" }}>Cross-Chain Bridge</h1>
            <p style={{ color: "#849495", fontSize: 16 }}>Bridge USDC into ARC Chain with real wallet confirmations.</p>
          </div>
          <FaucetButton label="Open Arc Faucet" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 arc-card rounded-3xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <ChainSelect label="From Chain" value={state.fromChain as SupportedChain} options={SOURCE_CHAIN_OPTIONS} onChange={(fromChain) => updateState({ fromChain })} />
              <ChainSelect label="To Chain" value={state.toChain as SupportedChain} options={DEST_CHAIN_OPTIONS} onChange={(toChain) => updateState({ toChain })} />
            </div>

            <div className="rounded-3xl p-5 mb-5" style={{ background: "rgba(0,0,0,0.32)", border: `1px solid ${TOKEN_META[selectedToken].accent}44` }}>
              <label style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 800, color: "#849495", textTransform: "uppercase" }}>Token</label>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {availableBridgeTokens.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => updateState({ token: symbol })}
                    className="flex items-center gap-3 rounded-2xl p-3"
                    style={{ background: selectedToken === symbol ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.04)", border: `1px solid ${TOKEN_META[symbol].accent}55` }}
                  >
                    <TokenIcon symbol={symbol} size={40} />
                    <div className="text-left">
                      <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 900, color: "#f8fbff" }}>{symbol}</div>
                      <div style={{ color: "#849495", fontSize: 11 }}>{TOKEN_META[symbol].label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl p-5 mb-5" style={{ background: "rgba(0,0,0,0.32)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <label style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 800, color: "#849495", textTransform: "uppercase" }}>Amount</label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="number"
                  value={state.amount}
                  onChange={(event) => updateState({ amount: event.target.value })}
                  placeholder="1.00"
                  className="flex-1 bg-transparent border-none outline-none"
                  style={{ fontFamily: "'Space Grotesk'", fontSize: 32, fontWeight: 900, color: "#f8fbff" }}
                />
                <TokenIcon symbol={selectedToken} size={46} />
              </div>
            </div>

            <input
              value={state.recipientAddress}
              onChange={(event) => updateState({ recipientAddress: event.target.value })}
              placeholder={address ?? "Recipient address (optional)"}
              className="w-full px-4 py-4 rounded-2xl mb-5"
            />

            <div className="grid gap-3 mb-3">
              <div className="flex justify-between rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "#849495" }}>Source Network</span>
                <span style={{ color: currentChainId === requiredChainId ? "#38bdf8" : "#ffb7eb", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>
                  {currentChainId === requiredChainId ? "Ethereum" : "Switch Network"}
                </span>
              </div>
              <div className="flex justify-between rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "#849495" }}>Bridge Engine</span>
                <span style={{ color: bridgeConfigured ? "#22c55e" : "#ffb7eb", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>
                  {bridgeMode === "contract" ? "Bridge Contract" : bridgeMode === "appkit" ? "Arc App Kit" : "Live Path Pending"}
                </span>
              </div>
            </div>
            {bridgeMode === "unsupported" && (
              <div className="rounded-2xl p-4 mb-3" style={{ background: "rgba(255,45,178,0.08)", border: "1px solid rgba(255,45,178,0.18)" }}>
                <div style={{ color: "#ffb7eb", fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Bridge Path Not Available
                </div>
                <p style={{ color: "#f2cadf", fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>
                  Live bridging currently supports USDC into ARC Chain by default.
                </p>
              </div>
            )}
            {currentChainId !== requiredChainId && isConnected && (
              <button disabled={isSwitchingNetwork} onClick={handleSwitchNetwork} className="btn-outline-cyan w-full py-4 rounded-2xl mb-3">
                {isSwitchingNetwork ? "Switching Network..." : "Switch Network"}
              </button>
            )}
            {needsApproval && currentChainId === requiredChainId && (
              <button disabled={state.status === "approving" || !state.amount} onClick={handleApprove} className="btn-outline-cyan w-full py-4 rounded-2xl mb-3">
                {state.status === "approving" ? `Approving ${selectedToken}...` : `Approve ${selectedToken}`}
              </button>
            )}
            <button disabled={isLoading || !state.amount || needsApproval || !bridgeReady || currentChainId !== requiredChainId} onClick={() => setConfirmOpen(true)} className="btn-primary w-full py-4 rounded-2xl">
              {isLoading ? "Routing Bridge..." : isConnected ? "Review Bridge" : "Connect Wallet to Bridge"}
            </button>
            {!isConnected && (
              <div className="mt-3 flex items-center justify-between rounded-2xl p-3" style={{ background: "rgba(255,45,178,0.06)", border: "1px solid rgba(255,45,178,0.16)" }}>
                <span style={{ color: "#849495", fontSize: 12 }}>Need test tokens for bridging?</span>
                <FaucetButton label="Faucet" compact />
              </div>
            )}
            {showFaucetHint && (
              <div className="mt-3 flex items-center justify-between rounded-2xl p-3" style={{ background: "rgba(255,45,178,0.08)", border: "1px solid rgba(255,45,178,0.18)" }}>
                <span style={{ color: "#ffb7eb", fontSize: 12 }}>Insufficient balance? Claim test tokens.</span>
                <FaucetButton label="Get Test Tokens" compact />
              </div>
            )}
            {state.txHash && (
              <a href={`https://testnet.arcscan.app/tx/${state.txHash}`} target="_blank" rel="noreferrer" className="btn-ghost block text-center w-full py-3 rounded-2xl mt-3">
                View Transaction
              </a>
            )}
            {state.status === "success" && <button onClick={() => { reset(); setActiveStep(0); }} className="btn-ghost w-full py-3 rounded-2xl mt-3">Bridge Again</button>}
          </section>

          <aside className="lg:col-span-2 flex flex-col gap-4">
            <div className="arc-card rounded-3xl p-5">
              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 900, color: "#f8fbff", marginBottom: 14 }}>Bridge Progress</h3>
              {["Approve", "Lock / Burn", "Attest", "Mint"].map((label, index) => (
                <div key={label} className="flex items-center gap-3 mb-3 p-3 rounded-xl" style={{ background: activeStep === index + 1 ? "rgba(255,45,178,0.12)" : "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="w-8 h-8 rounded-full grid place-items-center" style={{ background: activeStep > index ? "#38bdf8" : "rgba(255,255,255,0.06)", color: "white", fontFamily: "'Space Grotesk'", fontSize: 11 }}>{activeStep > index ? "OK" : index + 1}</span>
                  <span style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{label}</span>
                </div>
              ))}
            </div>

            <div className="arc-card rounded-3xl p-5">
              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 900, color: "#f8fbff", marginBottom: 14 }}>Bridge Balances</h3>
              {balances.filter((item) => BRIDGE_TOKENS.includes(item.token)).map((item) => (
                <div key={item.token} className="flex items-center justify-between rounded-xl p-3 mb-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2"><TokenIcon symbol={item.token} size={32} /><span style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{item.token}</span></div>
                  <span style={{ color: "#849495" }}>{balancesLoading || item.isLoading ? "..." : item.amount}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }}>
          <div className="arc-card rounded-3xl p-6 w-96">
            <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 20, fontWeight: 900, color: "#f8fbff", marginBottom: 12 }}>Confirm Bridge</h3>
            <p style={{ color: "#849495", lineHeight: 1.6 }}>{state.amount} {selectedToken} from {CHAIN_META[state.fromChain as SupportedChain]?.label} to {CHAIN_META[state.toChain as SupportedChain]?.label}</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmOpen(false)} className="btn-ghost flex-1 py-3 rounded-xl">Cancel</button>
              <button onClick={handleBridge} className="btn-primary flex-1 py-3 rounded-xl">Confirm</button>
            </div>
          </div>
        </div>
      )}
      <TransactionSuccessModal
        open={Boolean(successTx)}
        kind="bridge"
        amount={state.amount}
        fromLabel={`${selectedToken} from ${CHAIN_META[state.fromChain as SupportedChain]?.label ?? state.fromChain}`}
        toLabel={CHAIN_META[state.toChain as SupportedChain]?.label ?? state.toChain}
        network={`${CHAIN_META[state.fromChain as SupportedChain]?.label ?? state.fromChain} -> ${CHAIN_META[state.toChain as SupportedChain]?.label ?? state.toChain}`}
        txHash={successTx?.hash}
        gasFee={successTx?.gasFee}
        timestamp={successTx?.timestamp}
        explorerBaseUrl="https://testnet.arcscan.app/tx/"
        onClose={() => setSuccessTx(null)}
      />
    </div>
  );
}

function ChainSelect({ label, value, options, onChange }: { label: string; value: SupportedChain; options: SupportedChain[]; onChange: (value: SupportedChain) => void }) {
  return (
    <div className="rounded-3xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <label style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 800, color: "#849495", textTransform: "uppercase" }}>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value as SupportedChain)} className="mt-2 w-full px-3 py-3 rounded-xl">
        {options.map((chain) => <option key={chain} value={chain}>{CHAIN_META[chain]?.label ?? chain}</option>)}
      </select>
    </div>
  );
}
