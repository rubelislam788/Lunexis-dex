// src/components/bridge/BridgePage.tsx
"use client";

import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useArcBridge } from "@/hooks/useArcBridge";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import { useToast } from "@/components/ui/Toast";
import { ARC_TESTNET_CHAIN_ID, CHAIN_META, ETHEREUM_SEPOLIA_CHAIN_ID, SUPPORTED_CHAINS, type SupportedChain } from "@/lib/arc-kit";
import { createActivity } from "@/lib/profile";
import { TOKEN_META } from "@/lib/tokens";
import type { TokenSymbol } from "@/types";
import TokenIcon from "@/components/ui/TokenIcon";
import FaucetButton from "@/components/ui/FaucetButton";
import TransactionSuccessModal from "@/components/ui/TransactionSuccessModal";
import WalletButton from "@/components/ui/WalletButton";
import { promptWalletNetworkSwitch } from "@/lib/wallet-network";

const SOURCE_CHAIN_OPTIONS: SupportedChain[] = [SUPPORTED_CHAINS.ETH_SEPOLIA, SUPPORTED_CHAINS.ARC_TESTNET];
const DEST_CHAIN_OPTIONS: SupportedChain[] = [SUPPORTED_CHAINS.ARC_TESTNET, SUPPORTED_CHAINS.ETH_SEPOLIA];

function oppositeBridgeChain(chain: SupportedChain): SupportedChain {
  return chain === SUPPORTED_CHAINS.ARC_TESTNET ? SUPPORTED_CHAINS.ETH_SEPOLIA : SUPPORTED_CHAINS.ARC_TESTNET;
}

function bridgeChainId(chain: SupportedChain) {
  return chain === SUPPORTED_CHAINS.ARC_TESTNET ? ARC_TESTNET_CHAIN_ID : ETHEREUM_SEPOLIA_CHAIN_ID;
}

export default function BridgePage() {
  const { isConnected, address } = useAccount();
  const { state, updateState, executeBridge, needsApproval, bridgeConfigured, bridgeReady, bridgeMode, currentChainId, requiredChainId, reset } = useArcBridge();
  const { pushActivity } = useProfile();
  const { show, ToastContainer } = useToast();
  const { switchChainAsync, isPending: isSwitchingNetwork } = useSwitchChain();
  const [bridgeProgress, setBridgeProgress] = useState({ activeStep: 0, completedStep: 0 });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [showFaucetHint, setShowFaucetHint] = useState(false);
  const [successTx, setSuccessTx] = useState<{ hash?: string; gasFee?: string; timestamp: string; explorerBaseUrl?: string } | null>(null);
  const selectedToken = (state.token || "USDC") as TokenSymbol;
  const availableBridgeTokens = ["USDC", "EURC"] as TokenSymbol[];
  const onRequiredNetwork = currentChainId === requiredChainId;
  const requiredNetworkLabel = CHAIN_META[state.fromChain as SupportedChain]?.label ?? state.fromChain;
  const sourceExplorerBaseUrl = state.fromChain === SUPPORTED_CHAINS.ARC_TESTNET ? "https://testnet.arcscan.app/tx/" : "https://sepolia.etherscan.io/tx/";
  const { balances, isLoading: balancesLoading, refresh } = usePortfolioBalances(12000, requiredChainId);
  const balanceLabel = (symbol: TokenSymbol) => {
    const item = balances.find((balance) => balance.token === symbol);
    if (balancesLoading || item?.isLoading) return "Loading...";
    return item?.displayAmount || `${item?.amount ?? "0"} ${symbol}`;
  };
  const selectBridgeToken = (symbol: TokenSymbol) => {
    updateState({ token: symbol, error: undefined });
  };

  const handleBridge = async () => {
    setConfirmOpen(false);
    if (!isConnected) {
      show("Please connect your wallet first", "error");
      return;
    }
    setProgressOpen(true);
    setBridgeProgress({ activeStep: 1, completedStep: 0 });
    try {
      const result = await executeBridge((update) => {
        setBridgeProgress((prev) => update.status === "done"
          ? { activeStep: Math.max(prev.activeStep, Math.min(2, update.stepIndex + 1)), completedStep: Math.max(prev.completedStep, Math.min(2, update.stepIndex)) }
          : { activeStep: update.stepIndex, completedStep: Math.max(prev.completedStep, update.stepIndex - 1) }
        );
      });
      pushActivity(createActivity("bridge", "Bridge completed", `${state.amount} ${selectedToken} bridged from ${state.fromChain} to ${state.toChain}.`, selectedToken, "completed", result?.hash));
      setSuccessTx({ hash: result?.hash, timestamp: new Date().toISOString(), explorerBaseUrl: result?.explorerBaseUrl });
      refresh();
      show(`Bridged ${state.amount} ${selectedToken}`, "success");
      setTimeout(() => setProgressOpen(false), 900);
    } catch (err: any) {
      const message = err?.message || "Bridge failed";
      setBridgeProgress({ activeStep: 0, completedStep: 0 });
      setProgressOpen(false);
      setShowFaucetHint(/insufficient|funds|balance/i.test(message));
      show(message, "error");
    }
  };

  const switchToBridgeNetwork = async (chainId: number, label: string) => {
    try {
      await promptWalletNetworkSwitch(chainId, switchChainAsync);
      show(`Wallet switched to ${label}`, "success");
    } catch (err: any) {
      show(err?.message || "Network switch failed", "error");
    }
  };

  const handleSwitchNetwork = () => {
    void switchToBridgeNetwork(requiredChainId, requiredNetworkLabel);
  };

  const handleFromChainChange = (fromChain: SupportedChain) => {
    const toChain = oppositeBridgeChain(fromChain);
    const nextChainId = bridgeChainId(fromChain);
    updateState({ fromChain, toChain });
    if (isConnected && currentChainId !== nextChainId) {
      void switchToBridgeNetwork(nextChainId, CHAIN_META[fromChain]?.label ?? fromChain);
    }
  };

  const handleToChainChange = (toChain: SupportedChain) => {
    const fromChain = oppositeBridgeChain(toChain);
    const nextChainId = bridgeChainId(fromChain);
    updateState({ toChain, fromChain });
    if (isConnected && currentChainId !== nextChainId) {
      void switchToBridgeNetwork(nextChainId, CHAIN_META[fromChain]?.label ?? fromChain);
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

        <div className="grid grid-cols-1 justify-center gap-6">
          <section className="arc-card rounded-3xl p-6 max-w-3xl mx-auto w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <ChainSelect
                label="From Chain"
                value={state.fromChain as SupportedChain}
                options={SOURCE_CHAIN_OPTIONS}
                onChange={handleFromChainChange}
              />
              <ChainSelect
                label="To Chain"
                value={state.toChain as SupportedChain}
                options={DEST_CHAIN_OPTIONS}
                onChange={handleToChainChange}
              />
            </div>

            <div className="rounded-3xl p-5 mb-5" style={{ background: "rgba(0,0,0,0.32)", border: `1px solid ${TOKEN_META[selectedToken].accent}44` }}>
              <label style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 800, color: "#849495", textTransform: "uppercase" }}>
                Bridge Balances - {requiredNetworkLabel}
              </label>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {availableBridgeTokens.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => selectBridgeToken(symbol)}
                    aria-pressed={selectedToken === symbol}
                    className={`lunexis-bridge-token-card flex items-center gap-3 rounded-2xl p-3 ${selectedToken === symbol ? "is-active" : ""}`}
                    style={{
                      borderColor: selectedToken === symbol ? TOKEN_META[symbol].accent : `${TOKEN_META[symbol].accent}55`,
                      boxShadow: selectedToken === symbol ? `0 0 0 1px ${TOKEN_META[symbol].accent}66, 0 16px 36px ${TOKEN_META[symbol].accent}20` : undefined,
                    }}
                  >
                    <TokenIcon symbol={symbol} size={40} />
                    <div className="text-left">
                      <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 900, color: "#f8fbff" }}>{symbol}</div>
                      <div style={{ color: "#849495", fontSize: 11 }}>{TOKEN_META[symbol].label}</div>
                      <div style={{ color: "#38bdf8", fontSize: 11, marginTop: 4, fontFamily: "'Space Grotesk'", fontWeight: 800 }}>
                        Balance: {balanceLabel(symbol)}
                      </div>
                    </div>
                    {selectedToken === symbol && (
                      <span className="lunexis-bridge-token-check material-symbols-outlined" aria-hidden="true">check_circle</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl p-5 mb-5" style={{ background: "rgba(0,0,0,0.32)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <label style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 800, color: "#849495", textTransform: "uppercase" }}>Amount</label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={state.amount}
                  onChange={(event) => updateState({ amount: event.target.value })}
                  placeholder="0.00"
                  className="arc-swap-amount-input flex-1"
                />
                <TokenIcon symbol={selectedToken} size={46} />
              </div>
            </div>

            <input
              value={state.recipientAddress}
              onChange={(event) => updateState({ recipientAddress: event.target.value })}
              placeholder={address ?? "Recipient address (optional)"}
              className="w-full px-4 py-4 rounded-2xl"
            />
            <div className="lunexis-bridge-recipient-hint mb-5">Send this to another wallet</div>

            {bridgeMode === "unsupported" && (
              <div className="rounded-2xl p-4 mb-3" style={{ background: "rgba(255,45,178,0.08)", border: "1px solid rgba(255,45,178,0.18)" }}>
                <div style={{ color: "#ffb7eb", fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Bridge Path Not Available
                </div>
                <p style={{ color: "#f2cadf", fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>
                  Live bridging currently supports USDC between Ethereum Sepolia and Arc Testnet.
                </p>
              </div>
            )}
            {!isConnected ? (
              <div className="w-full mb-3 [&>button]:w-full [&>button]:py-4 [&>button]:rounded-2xl [&>button]:justify-center">
                <WalletButton />
              </div>
            ) : !onRequiredNetwork ? (
              <button disabled={isSwitchingNetwork} onClick={handleSwitchNetwork} className="btn-primary w-full py-4 rounded-2xl mb-3">
                {isSwitchingNetwork ? "Opening Wallet..." : `Switch to ${requiredNetworkLabel}`}
              </button>
            ) : (
              <button disabled={isLoading || !state.amount || needsApproval || !bridgeReady} onClick={() => setConfirmOpen(true)} className="btn-primary w-full py-4 rounded-2xl">
                {isLoading ? "Routing Bridge..." : "Review Bridge"}
              </button>
            )}
            {state.error && (
              <div className="mt-3 rounded-2xl p-3" style={{ background: "rgba(255,45,178,0.08)", border: "1px solid rgba(255,45,178,0.18)", color: "#ffb7eb", fontSize: 12 }}>
                {state.error}
              </div>
            )}
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
              <a href={`${sourceExplorerBaseUrl}${state.txHash}`} target="_blank" rel="noreferrer" className="btn-ghost block text-center w-full py-3 rounded-2xl mt-3">
                View Transaction
              </a>
            )}
            {state.status === "success" && <button onClick={() => { reset(); setBridgeProgress({ activeStep: 0, completedStep: 0 }); }} className="btn-ghost w-full py-3 rounded-2xl mt-3">Bridge Again</button>}
          </section>
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
      {progressOpen && (
        <BridgeProgressModal
          activeStep={bridgeProgress.activeStep}
          completedStep={bridgeProgress.completedStep}
          token={selectedToken}
          fromLabel={CHAIN_META[state.fromChain as SupportedChain]?.label ?? state.fromChain}
          toLabel={CHAIN_META[state.toChain as SupportedChain]?.label ?? state.toChain}
        />
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
        explorerBaseUrl={successTx?.explorerBaseUrl ?? sourceExplorerBaseUrl}
        onClose={() => setSuccessTx(null)}
      />
    </div>
  );
}

function BridgeProgressModal({ activeStep, completedStep, token, fromLabel, toLabel }: { activeStep: number; completedStep: number; token: TokenSymbol; fromLabel: string; toLabel: string }) {
  const steps = ["Confirm", "Submit"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.76)", backdropFilter: "blur(12px)" }}>
      <div className="arc-card rounded-3xl p-6 w-[min(460px,92vw)]">
        <div className="flex items-center gap-4 mb-5">
          <div className="lunexis-bridge-orbit">
            <TokenIcon symbol={token} size={42} />
            <span className="lunexis-bridge-orbit-dot" aria-hidden="true" />
          </div>
          <div>
            <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Bridge in progress
            </div>
            <h3 style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontSize: 20, fontWeight: 900 }}>
              {fromLabel} to {toLabel}
            </h3>
          </div>
        </div>
        <div className="lunexis-bridge-flow">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const done = completedStep >= stepNumber;
            const active = activeStep === stepNumber && !done;
            return (
              <div key={step} className={`${done ? "is-done" : ""} ${active ? "is-active" : ""}`}>
                <i>{done ? "OK" : stepNumber}</i>
                <span>{step}</span>
                <b />
              </div>
            );
          })}
        </div>
        <p style={{ color: "#9fb2c4", fontSize: 13, lineHeight: 1.6, marginTop: 18 }}>
          Keep the wallet open. Each confirmed wallet transaction completes one step.
        </p>
      </div>
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
