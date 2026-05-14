// src/components/swap/SwapPage.tsx
"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { parseEther, zeroAddress, isAddressEqual, type Address } from "viem";
import { useArcSwap } from "@/hooks/useArcSwap";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import { useToast } from "@/components/ui/Toast";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER_URL } from "@/lib/arc-kit";
import { MOCK_WETH_ABI } from "@/lib/arc-dex";
import { createActivity } from "@/lib/profile";
import { SWAP_TOKENS, TOKEN_CONTRACTS, TOKEN_META } from "@/lib/tokens";
import type { TokenSymbol } from "@/types";
import TokenIcon from "@/components/ui/TokenIcon";
import FaucetButton from "@/components/ui/FaucetButton";
import TransactionSuccessModal from "@/components/ui/TransactionSuccessModal";

export default function SwapPage() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { state, updateState, executeSwap, approve, needsApproval, routerConfigured, swapReady, currentChainId, requiredChainId, estimatedOut, quoteLoading, reset } = useArcSwap();
  const { pushActivity } = useProfile();
  const { balances, isLoading: balancesLoading, refresh } = usePortfolioBalances();
  const { show, ToastContainer } = useToast();
  const { switchChainAsync, isPending: isSwitchingNetwork } = useSwitchChain();
  const [selector, setSelector] = useState<"from" | "to" | null>(null);
  const [showFaucetHint, setShowFaucetHint] = useState(false);
  const [successTx, setSuccessTx] = useState<{ hash?: string; gasFee?: string; timestamp: string } | null>(null);

  const fromToken = TOKEN_META[state.fromToken as TokenSymbol] ?? TOKEN_META.USDC;
  const toToken = TOKEN_META[state.toToken as TokenSymbol] ?? TOKEN_META.EURC;
  const selectableSwapTokens = SWAP_TOKENS;
  const wethAddress = TOKEN_CONTRACTS.WETH?.[ARC_TESTNET_CHAIN_ID];
  const wethFaucetReady = Boolean(routerConfigured && wethAddress && !isAddressEqual(wethAddress, zeroAddress));
  const swapIntro = routerConfigured
    ? "Swap ARC, USDC, EURC, and WETH with live wallet balances and onchain execution."
    : "Swap tokens on Arc Testnet with a clean wallet-first trading experience.";
  const balanceLabel = (symbol: TokenSymbol) => {
    const item = balances.find((balance) => balance.token === symbol);
    if (balancesLoading || item?.isLoading) return "Loading...";
    return item?.displayAmount || `${item?.amount ?? "0"} ${symbol}`;
  };

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

  const mintWeth = async () => {
    if (!walletClient || !publicClient || !wethAddress || isAddressEqual(wethAddress, zeroAddress)) {
      show("WETH faucet is unavailable right now.", "error");
      return;
    }

    try {
      const account = walletClient.account;
      if (!account) throw new Error("Wallet signer account is not available.");

      const { request } = await publicClient.simulateContract({
        address: wethAddress as Address,
        abi: MOCK_WETH_ABI,
        functionName: "faucet",
        args: [parseEther("1")],
        account,
      });
      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      refresh();
      show("Minted 1 test WETH", "success");
    } catch (err: any) {
      show(err?.message || "WETH faucet failed", "error");
    }
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
            <p style={{ color: "#849495", fontSize: 16 }}>{swapIntro}</p>
          </div>
          <div className="flex gap-3">
            <FaucetButton label="Need Test USDC?" />
            {wethFaucetReady && (
              <button onClick={mintWeth} className="btn-outline-cyan px-4 py-3 rounded-xl" style={{ fontSize: 11 }}>
                Mint Test WETH
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 justify-center lg:grid-cols-[minmax(0,760px)] gap-6">
          <section className="arc-card arc-swap-card rounded-[28px] p-6">
            <TokenAmountPanel label="You Pay" token={fromToken.symbol} amount={state.amountIn} balance={balanceLabel(fromToken.symbol)} onAmount={(amount) => updateState({ amountIn: amount })} onToken={() => setSelector("from")} />
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
              balance={balanceLabel(toToken.symbol)}
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
        </div>
      </div>

      {selector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }} onClick={() => setSelector(null)}>
          <div className="arc-card rounded-3xl p-6 w-96" onClick={(event) => event.stopPropagation()}>
            <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff", marginBottom: 16 }}>Select Token</h3>
            {selectableSwapTokens.map((symbol) => {
              const token = TOKEN_META[symbol];
              return (
                <button key={symbol} onClick={() => pickToken(symbol)} className="w-full flex items-center gap-4 p-4 rounded-2xl mb-2 btn-ghost" style={{ borderColor: `${token.accent}44` }}>
                  <TokenIcon symbol={symbol} size={44} />
                  <div className="text-left">
                    <div style={{ fontFamily: "'Space Grotesk'", color: "#f8fbff", fontWeight: 900 }}>{symbol}</div>
                    <div style={{ color: "#849495", fontSize: 12 }}>{token.label}</div>
                    <div style={{ color: "#6f8699", fontSize: 11, marginTop: 4 }}>Balance: {balanceLabel(symbol)}</div>
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

function TokenAmountPanel({ label, token, amount, balance, readOnly, onAmount, onToken }: { label: string; token: TokenSymbol; amount: string; balance: string; readOnly?: boolean; onAmount?: (amount: string) => void; onToken: () => void }) {
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
      <div className="mt-3 flex justify-end">
        <div
          className="rounded-xl px-3 py-1.5"
          style={{
            background: `${TOKEN_META[token].accent}10`,
            border: `1px solid ${TOKEN_META[token].accent}24`,
            color: "#9fb2c4",
            fontSize: 12,
            fontFamily: "'Space Grotesk'",
            fontWeight: 700,
          }}
        >
          Balance: <span style={{ color: "#dbeafe" }}>{balance}</span>
        </div>
      </div>
    </div>
  );
}
