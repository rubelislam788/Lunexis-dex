// src/components/swap/SwapPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useArcSwap } from "@/hooks/useArcSwap";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import { useToast } from "@/components/ui/Toast";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER_URL, getArcKitKey, setArcKitKey } from "@/lib/arc-kit";
import { createActivity } from "@/lib/profile";
import { SWAP_TOKENS, TOKEN_META } from "@/lib/tokens";
import type { TokenSymbol } from "@/types";
import TokenIcon from "@/components/ui/TokenIcon";
import FaucetButton from "@/components/ui/FaucetButton";
import TransactionSuccessModal from "@/components/ui/TransactionSuccessModal";

export default function SwapPage() {
  const { isConnected } = useAccount();
  const { state, updateState, executeSwap, approve, needsApproval, swapReady, routeMode, currentChainId, requiredChainId, estimatedOut, quoteLoading, reset } = useArcSwap();
  const { pushActivity } = useProfile();
  const { balances, isLoading: balancesLoading, refresh } = usePortfolioBalances();
  const { show, ToastContainer } = useToast();
  const { switchChainAsync, isPending: isSwitchingNetwork } = useSwitchChain();
  const [selector, setSelector] = useState<"from" | "to" | null>(null);
  const [showFaucetHint, setShowFaucetHint] = useState(false);
  const [successTx, setSuccessTx] = useState<{ hash?: string; gasFee?: string; timestamp: string } | null>(null);
  const [kitKeyInput, setKitKeyInput] = useState("");

  const fromToken = TOKEN_META[state.fromToken as TokenSymbol] ?? TOKEN_META.USDC;
  const toToken = TOKEN_META[state.toToken as TokenSymbol] ?? TOKEN_META.EURC;

  useEffect(() => {
    const syncKey = () => setKitKeyInput(getArcKitKey());
    syncKey();
    window.addEventListener("arc-kit-key-updated", syncKey);
    return () => window.removeEventListener("arc-kit-key-updated", syncKey);
  }, []);

  const handleSwap = async () => {
    if (!isConnected) {
      show("Please connect your wallet first", "error");
      return;
    }
    try {
      const result = await executeSwap();
      pushActivity(createActivity("swap", "Swap completed", `Swapped ${state.amountIn} ${state.fromToken} to ${state.toToken}.`, state.fromToken as TokenSymbol, "completed", result?.hash));
      setSuccessTx({ hash: result?.hash, gasFee: result?.gasFee, timestamp: new Date().toISOString() });
      refresh();
      show(`Swapped ${state.amountIn} ${state.fromToken} to ${state.toToken}`, "success");
    } catch (err: any) {
      const message = err?.message || "Swap failed";
      setShowFaucetHint(/insufficient|funds|balance/i.test(message));
      show(message, "error");
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchChainAsync({ chainId: requiredChainId });
      show("Wallet switched to ARC Chain", "success");
    } catch (err: any) {
      show(err?.message || "Network switch failed", "error");
    }
  };

  const handleApprove = async () => {
    try {
      const result = await approve();
      pushActivity(createActivity("wallet", `Approved ${state.fromToken}`, `Approval confirmed for ${state.fromToken} swap routing.`, state.fromToken as TokenSymbol, "completed", result?.hash));
      show(`Approved ${state.fromToken}`, "success");
    } catch (err: any) {
      show(err?.message || "Approval failed", "error");
    }
  };

  const handleSaveKitKey = () => {
    setArcKitKey(kitKeyInput);
    show(kitKeyInput.trim() ? "Arc App Kit key saved in this browser" : "Arc App Kit key removed", "success");
  };

  const pickToken = (symbol: TokenSymbol) => {
    if (selector === "from") {
      updateState(symbol === state.toToken ? { fromToken: symbol, toToken: state.fromToken } : { fromToken: symbol });
    } else {
      updateState(symbol === state.fromToken ? { toToken: symbol, fromToken: state.toToken } : { toToken: symbol });
    }
    setSelector(null);
  };

  const isLoading = state.status === "approving" || state.status === "swapping";
  const actionDisabled = isLoading || !state.amountIn || needsApproval || !swapReady || currentChainId !== requiredChainId;
  const routeLabel =
    routeMode === "router"
      ? "Router Contract"
      : routeMode === "appkit"
        ? "Arc App Kit"
        : routeMode === "appkit-missing-key"
          ? "Kit Key Required"
          : "Not Configured";
  const routeColor =
    routeMode === "router" || routeMode === "appkit"
      ? "#22c55e"
      : "#ffb7eb";

  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <ToastContainer />
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3" style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.22)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#38bdf8" }} />
              <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#38bdf8" }}>
                ARC SWAP TERMINAL
              </span>
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 40, fontWeight: 900, color: "#f8fbff" }}>Token Swap</h1>
            <p style={{ color: "#849495", fontSize: 16 }}>Swap ARC, USDC, EURO, and WETH with live wallet balance context.</p>
          </div>
          <FaucetButton label="Need Test USDC?" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 arc-card rounded-3xl p-6">
            <TokenAmountPanel label="You Pay" token={fromToken.symbol} amount={state.amountIn} onAmount={(amount) => updateState({ amountIn: amount })} onToken={() => setSelector("from")} />
            <div className="flex justify-center my-4">
              <button
                onClick={() => updateState({ fromToken: state.toToken, toToken: state.fromToken })}
                className="arc-icon-action w-12 h-12 rounded-full"
                aria-label="Switch swap direction"
              >
                <span className="material-symbols-outlined">swap_vert</span>
              </button>
            </div>
            <TokenAmountPanel
              label="You Receive"
              token={toToken.symbol}
              amount={quoteLoading ? "Loading..." : estimatedOut ? `~ ${estimatedOut}` : ""}
              readOnly
              onToken={() => setSelector("to")}
            />

            <div className="grid grid-cols-3 gap-3 my-6">
              {["auto", "0.5%", "1%"].map((slippage) => (
                <button key={slippage} onClick={() => updateState({ slippage })} className="btn-ghost rounded-xl py-3" style={{ color: state.slippage === slippage ? "#38bdf8" : "#849495", fontSize: 12 }}>
                  {slippage}
                </button>
              ))}
            </div>

            <div className="flex justify-between rounded-2xl p-4 mb-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "#849495" }}>Price Impact</span>
              <span style={{ color: estimatedOut ? "#22c55e" : "#849495", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{estimatedOut ? "< 0.1%" : "Onchain Quote"}</span>
            </div>

            <div className="grid gap-3 mb-6">
              <div className="flex justify-between rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "#849495" }}>Network</span>
                <span style={{ color: currentChainId === ARC_TESTNET_CHAIN_ID ? "#38bdf8" : "#ffb7eb", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>
                  {currentChainId === ARC_TESTNET_CHAIN_ID ? "Arc Testnet" : "Switch to Arc Testnet"}
                </span>
              </div>
              <div className="flex justify-between rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "#849495" }}>Route Engine</span>
                <span style={{ color: routeColor, fontFamily: "'Space Grotesk'", fontWeight: 800 }}>
                  {routeLabel}
                </span>
              </div>
            </div>

            {routeMode === "appkit-missing-key" && (
              <div className="rounded-2xl p-4 mb-6" style={{ background: "rgba(255,45,178,0.08)", border: "1px solid rgba(255,45,178,0.18)" }}>
                <div style={{ color: "#ffb7eb", fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Swap Setup Needed
                </div>
                <p style={{ color: "#f2cadf", fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>
                  USDC and EURO can use Arc App Kit, but `NEXT_PUBLIC_ARC_KIT_KEY` is missing. Add the key below or set it in your environment to enable the default ARC Chain swap flow.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={kitKeyInput}
                    onChange={(event) => setKitKeyInput(event.target.value)}
                    placeholder="Paste your Arc App Kit public key"
                    className="flex-1 px-4 py-3 rounded-2xl"
                    style={{ background: "rgba(0,0,0,0.28)" }}
                  />
                  <button onClick={handleSaveKitKey} className="btn-outline-cyan px-5 py-3 rounded-2xl">
                    Save Key
                  </button>
                </div>
              </div>
            )}

            {routeMode === "unavailable" && (
              <div className="rounded-2xl p-4 mb-6" style={{ background: "rgba(255,45,178,0.08)", border: "1px solid rgba(255,45,178,0.18)" }}>
                <div style={{ color: "#ffb7eb", fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Contract Setup Needed
                </div>
                <p style={{ color: "#f2cadf", fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>
                  This token pair needs a real router contract and token addresses on ARC Chain before swap execution can start.
                </p>
              </div>
            )}

            {currentChainId !== requiredChainId && isConnected && (
              <button onClick={handleSwitchNetwork} disabled={isSwitchingNetwork} className="btn-outline-cyan w-full py-4 rounded-2xl mb-3">
                {isSwitchingNetwork ? "Switching Network..." : "Switch to ARC Chain"}
              </button>
            )}
            {needsApproval && currentChainId === requiredChainId && (
              <button onClick={handleApprove} disabled={state.status === "approving" || !state.amountIn} className="btn-outline-cyan w-full py-4 rounded-2xl mb-3">
                {state.status === "approving" ? `Approving ${state.fromToken}...` : `Approve ${state.fromToken}`}
              </button>
            )}
            <button onClick={handleSwap} disabled={actionDisabled} className="btn-primary w-full py-4 rounded-2xl">
              {isLoading ? "Swapping..." : isConnected ? "Confirm Swap" : "Connect Wallet to Swap"}
            </button>
            {!isConnected && (
              <div className="mt-3 flex items-center justify-between rounded-2xl p-3" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.16)" }}>
                <span style={{ color: "#849495", fontSize: 12 }}>Need test funds after connecting?</span>
                <FaucetButton label="Faucet" compact />
              </div>
            )}
            {showFaucetHint && (
              <div className="mt-3 flex items-center justify-between rounded-2xl p-3" style={{ background: "rgba(255,45,178,0.08)", border: "1px solid rgba(255,45,178,0.18)" }}>
                <span style={{ color: "#ffb7eb", fontSize: 12 }}>Transaction may need test tokens.</span>
                <FaucetButton label="Get Test Tokens" compact />
              </div>
            )}
            {state.txHash && (
              <a href={`${ARC_TESTNET_EXPLORER_URL}/tx/${state.txHash}`} target="_blank" rel="noreferrer" className="btn-ghost block text-center w-full py-3 rounded-2xl mt-3">
                View Transaction
              </a>
            )}
            {state.status === "success" && (
              <button onClick={reset} className="btn-ghost w-full py-3 rounded-2xl mt-3">Swap Again</button>
            )}
          </section>

          <aside className="lg:col-span-2 flex flex-col gap-4">
            <div className="arc-card rounded-3xl p-5">
              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 900, color: "#f8fbff", marginBottom: 14 }}>Live Balances</h3>
              <div className="grid gap-2">
                {balances.filter((item) => SWAP_TOKENS.includes(item.token)).map((item) => (
                  <div key={item.token} className="flex items-center justify-between rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2"><TokenIcon symbol={item.token} size={32} /><span style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{item.token}</span></div>
                    <span style={{ color: "#849495" }}>{balancesLoading || item.isLoading ? "..." : item.amount}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="arc-card rounded-3xl p-5">
              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 900, color: "#f8fbff", marginBottom: 12 }}>Swap Route</h3>
              <p style={{ color: "#849495", fontSize: 13, lineHeight: 1.6 }}>
                {routeMode === "router" && "Wallet approvals, real transaction hashes, live ARC balances, and router-backed execution through your configured contract."}
                {routeMode === "appkit" && "USDC and EURO are using Arc App Kit fallback on ARC Chain, with wallet confirmations and live balance refresh."}
                {routeMode === "appkit-missing-key" && "The default USDC/EURO route is available through Arc App Kit, but the public kit key still needs to be configured."}
                {routeMode === "unavailable" && "This pair needs a router contract deployment or supported App Kit route before execution can begin."}
              </p>
            </div>
          </aside>
        </div>
      </div>

      {selector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }} onClick={() => setSelector(null)}>
          <div className="arc-card rounded-3xl p-6 w-96" onClick={(event) => event.stopPropagation()}>
            <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff", marginBottom: 16 }}>Select Token</h3>
            {SWAP_TOKENS.map((symbol) => {
              const token = TOKEN_META[symbol];
              return (
                <button key={symbol} onClick={() => pickToken(symbol)} className="w-full flex items-center gap-4 p-4 rounded-2xl mb-2 btn-ghost" style={{ borderColor: `${token.accent}44` }}>
                  <TokenIcon symbol={symbol} size={44} />
                  <div className="text-left">
                    <div style={{ fontFamily: "'Space Grotesk'", color: "#f8fbff", fontWeight: 900 }}>{symbol}</div>
                    <div style={{ color: "#849495", fontSize: 12 }}>{token.label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <TransactionSuccessModal
        open={Boolean(successTx)}
        kind="swap"
        amount={state.amountIn}
        fromLabel={state.fromToken}
        toLabel={state.toToken}
        network="ARC Chain"
        txHash={successTx?.hash}
        gasFee={successTx?.gasFee}
        timestamp={successTx?.timestamp}
        explorerBaseUrl={`${ARC_TESTNET_EXPLORER_URL}/tx/`}
        onClose={() => setSuccessTx(null)}
      />
    </div>
  );
}

function TokenAmountPanel({ label, token, amount, readOnly, onAmount, onToken }: { label: string; token: TokenSymbol; amount: string; readOnly?: boolean; onAmount?: (amount: string) => void; onToken: () => void }) {
  return (
    <div className="rounded-3xl p-5" style={{ background: "rgba(0,0,0,0.32)", border: `1px solid ${TOKEN_META[token].accent}44` }}>
      <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#849495", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
      <div className="flex items-center gap-4">
        <input
          type={readOnly ? "text" : "number"}
          value={amount}
          readOnly={readOnly}
          onChange={(event) => onAmount?.(event.target.value)}
          placeholder="0.00"
          className="flex-1 bg-transparent border-none outline-none"
          style={{ fontFamily: "'Space Grotesk'", fontSize: 32, fontWeight: 900, color: "#f8fbff", background: "transparent", border: "none", boxShadow: "none" }}
        />
        <button onClick={onToken} className="btn-ghost flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ borderColor: `${TOKEN_META[token].accent}66` }}>
          <TokenIcon symbol={token} size={34} />
          <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 900, color: "#f8fbff" }}>{token}</span>
        </button>
      </div>
    </div>
  );
}
