// src/components/swap/SwapPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useArcSwap } from "@/hooks/useArcSwap";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import { useToast } from "@/components/ui/Toast";
import { ARC_TESTNET_EXPLORER_URL } from "@/lib/arc-kit";
import { createActivity } from "@/lib/profile";
import { SWAP_TOKENS, TOKEN_CONTRACTS, TOKEN_META } from "@/lib/tokens";
import type { TokenSymbol } from "@/types";
import TokenIcon from "@/components/ui/TokenIcon";
import FaucetButton from "@/components/ui/FaucetButton";
import TransactionSuccessModal from "@/components/ui/TransactionSuccessModal";
import TokenPriceChart from "@/components/swap/TokenPriceChart";

type TokenPriceMap = Partial<Record<TokenSymbol, number>>;
type SmartError = { title: string; message: string; action: string; tone?: "warning" | "error" };
const RECENT_SWAP_TOKEN_KEY = "lunexis.recent-swap-tokens.v1";

function formatUsd(value: number) {
  if (!Number.isFinite(value)) return "Price syncing";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: value >= 1 ? 2 : 4,
    maximumFractionDigits: value >= 1 ? 2 : 6,
  })}`;
}

function parseDisplayAmount(value: string) {
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeSwapError(error: any): SmartError {
  const raw = String(error?.shortMessage || error?.message || error || "Swap failed");
  const message = raw.toLowerCase();

  if (/user rejected|rejected|denied|cancel/i.test(raw)) {
    return { title: "Wallet rejected transaction", message: "You cancelled the wallet confirmation. No funds were moved.", action: "Open the wallet prompt again when you are ready." };
  }
  if (/insufficient|exceeds balance|funds|balance/i.test(raw)) {
    return { title: "Insufficient balance", message: "Your wallet does not have enough test USDC/EURC for this swap and gas.", action: "Use the Circle faucet, then refresh balances.", tone: "warning" };
  }
  if (/network|chain|switch/i.test(raw)) {
    return { title: "Wrong network selected", message: "Stablecoin swaps run on ARC Testnet only.", action: "Switch your wallet to ARC Chain and try again.", tone: "warning" };
  }
  if (/slippage|amountoutmin|price impact/i.test(raw)) {
    return { title: "Slippage too high", message: "The quote moved before the transaction could confirm.", action: "Try 0.5% or 1% slippage, or reduce the amount.", tone: "warning" };
  }
  if (/liquidity|route|amounts out|pair/i.test(raw)) {
    return { title: "Not enough liquidity", message: "The USDC/EURC route could not return a valid onchain quote.", action: "Try a smaller amount or wait for route liquidity." };
  }
  if (/timeout|timed out|deadline/i.test(raw)) {
    return { title: "Transaction timeout", message: "The wallet or RPC connection took too long to respond.", action: "Check mobile data/WiFi and submit again." };
  }
  if (/rpc|fetch|connection|network error|failed to fetch/i.test(raw)) {
    return { title: "RPC connection failed", message: "The mobile network could not reach the ARC RPC endpoint.", action: "Lunexis will retry through fallback RPC. Refresh and try again." };
  }

  return { title: "Swap could not complete", message: raw.slice(0, 160), action: "Review amount, balance, and network, then try again." };
}

function loadRecentTokens(): TokenSymbol[] {
  if (typeof window === "undefined") return SWAP_TOKENS;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_SWAP_TOKEN_KEY) || "[]") as TokenSymbol[];
    return [...parsed.filter((symbol) => SWAP_TOKENS.includes(symbol)), ...SWAP_TOKENS].filter((symbol, index, list) => list.indexOf(symbol) === index);
  } catch {
    return SWAP_TOKENS;
  }
}

export default function SwapPage() {
  const { isConnected } = useAccount();
  const { state, updateState, executeSwap, approve, needsApproval, routerConfigured, swapReady, currentChainId, requiredChainId, estimatedOut, quoteLoading, reset } = useArcSwap();
  const { pushActivity } = useProfile();
  const { balances, isLoading: balancesLoading, refresh } = usePortfolioBalances();
  const { show, ToastContainer } = useToast();
  const { switchChainAsync, isPending: isSwitchingNetwork } = useSwitchChain();
  const [selector, setSelector] = useState<"from" | "to" | null>(null);
  const [showFaucetHint, setShowFaucetHint] = useState(false);
  const [showNetworkSwitchModal, setShowNetworkSwitchModal] = useState(false);
  const [successTx, setSuccessTx] = useState<{ hash?: string; gasFee?: string; timestamp: string } | null>(null);
  const [tokenPrices, setTokenPrices] = useState<TokenPriceMap>({ USDC: 1, EURC: 1 });
  const [smartError, setSmartError] = useState<SmartError | null>(null);
  const [tokenSearch, setTokenSearch] = useState("");
  const [recentTokens, setRecentTokens] = useState<TokenSymbol[]>(SWAP_TOKENS);
  const [customSlippage, setCustomSlippage] = useState("");
  const [showSlippageMenu, setShowSlippageMenu] = useState(false);

  const fromToken = TOKEN_META[state.fromToken as TokenSymbol] ?? TOKEN_META.USDC;
  const toToken = TOKEN_META[state.toToken as TokenSymbol] ?? TOKEN_META.EURC;
  const selectableSwapTokens = SWAP_TOKENS;
  const filteredTokens = useMemo(() => {
    const query = tokenSearch.trim().toLowerCase();
    if (!query) return selectableSwapTokens;
    return selectableSwapTokens.filter((symbol) => {
      const meta = TOKEN_META[symbol];
      const addresses = Object.values(TOKEN_CONTRACTS[symbol] ?? {}).map((address) => String(address).toLowerCase());
      return symbol.toLowerCase().includes(query) || meta.label.toLowerCase().includes(query) || addresses.some((address) => address.includes(query));
    });
  }, [selectableSwapTokens, tokenSearch]);
  const unsupportedTokenSearch = tokenSearch.trim().length > 3 && filteredTokens.length === 0;
  const swapIntro = routerConfigured
    ? "Swap USDC and EURC with live wallet balances and onchain execution."
    : "Swap tokens on Arc Testnet with a clean wallet-first trading experience.";
  const balanceLabel = (symbol: TokenSymbol) => {
    const item = balances.find((balance) => balance.token === symbol);
    if (balancesLoading || item?.isLoading) return "Loading...";
    return item?.displayAmount || `${item?.amount ?? "0"} ${symbol}`;
  };
  const priceLabel = (symbol: TokenSymbol) => {
    const item = balances.find((balance) => balance.token === symbol);
    if (balancesLoading || item?.isLoading) return "Price syncing";
    return item?.unitPrice || "Price syncing";
  };
  const amountValueLabel = (symbol: TokenSymbol, value: string) => {
    const amount = parseDisplayAmount(value);
    const price = tokenPrices[symbol];
    if (!amount || !Number.isFinite(price)) return priceLabel(symbol);
    return `~ ${formatUsd(amount * Number(price))}`;
  };
  const quoteRate = (() => {
    const amountIn = Number(state.amountIn || 0);
    const amountOut = Number(estimatedOut || 0);
    if (!Number.isFinite(amountIn) || !Number.isFinite(amountOut) || amountIn <= 0 || amountOut <= 0) {
      return "Enter amount for live quote";
    }
    const rate = amountOut / amountIn;
    return `1 ${fromToken.symbol} = ${rate.toLocaleString(undefined, { minimumFractionDigits: rate >= 1 ? 2 : 4, maximumFractionDigits: 6 })} ${toToken.symbol}`;
  })();
  const fromBalanceAmount = balances.find((balance) => balance.token === fromToken.symbol)?.amount ?? "0";
  const toBalanceAmount = balances.find((balance) => balance.token === toToken.symbol)?.amount ?? "0";
  const emptyWallet = isConnected && !balancesLoading && Number(fromBalanceAmount || 0) <= 0 && Number(toBalanceAmount || 0) <= 0;
  const lowBalance = isConnected && !balancesLoading && Number(fromBalanceAmount || 0) > 0 && Number(fromBalanceAmount || 0) < Number(state.amountIn || 0);
  const priceImpact = (() => {
    const amountIn = Number(state.amountIn || 0);
    const amountOut = Number(estimatedOut || 0);
    if (!amountIn || !amountOut) return 0;
    return Math.abs(1 - amountOut / amountIn) * 100;
  })();
  const highPriceImpact = priceImpact >= 1;
  const setPercentAmount = (percent: number) => {
    const numeric = Number(fromBalanceAmount || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    const next = percent === 100 ? numeric : numeric * (percent / 100);
    updateState({ amountIn: next.toFixed(next >= 1 ? 4 : 6).replace(/\.?0+$/, "") });
  };

  useEffect(() => {
    let cancelled = false;

    fetch("/api/token-prices")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled) return;
        setTokenPrices({
          USDC: 1,
          EURC: Number(data?.prices?.EURC) || 1,
        });
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setRecentTokens(loadRecentTokens());
  }, []);

  useEffect(() => {
    if (isConnected && currentChainId !== requiredChainId) {
      setShowNetworkSwitchModal(true);
    } else if (currentChainId === requiredChainId) {
      setShowNetworkSwitchModal(false);
    }
  }, [currentChainId, isConnected, requiredChainId]);

  const handleSwap = async () => {
    if (!isConnected) {
      show("Please connect your wallet first", "error");
      return;
    }
    if (currentChainId !== requiredChainId) {
      setShowNetworkSwitchModal(true);
      return;
    }
    try {
      const result = await executeSwap();
      pushActivity(createActivity("swap", "Swap completed", `Swapped ${state.amountIn} ${state.fromToken} to ${state.toToken}.`, state.fromToken as TokenSymbol, "completed", result?.hash));
      setSuccessTx({ hash: result?.hash, gasFee: result?.gasFee, timestamp: new Date().toISOString() });
      refresh();
      show(`Swapped ${state.amountIn} ${state.fromToken} to ${state.toToken}`, "success");
    } catch (err: any) {
      const nextError = normalizeSwapError(err);
      setSmartError(nextError);
      setShowFaucetHint(/balance|faucet|funds/i.test(`${nextError.title} ${nextError.message} ${nextError.action}`));
      show(nextError.title, "error");
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchChainAsync({ chainId: requiredChainId });
      setShowNetworkSwitchModal(false);
      show("Wallet switched to ARC Chain", "success");
    } catch (err: any) {
      const nextError = normalizeSwapError(err);
      setSmartError({
        title: /4902|unrecognized|not configured/i.test(String(err?.message)) ? "Add ARC Chain to wallet" : nextError.title,
        message: /4902|unrecognized|not configured/i.test(String(err?.message)) ? "Your wallet does not have ARC Testnet yet. RainbowKit can add it from the configured chain list." : nextError.message,
        action: "Open wallet network settings or retry the switch button.",
      });
      show("Network switch needs attention", "error");
    }
  };

  const handleApprove = async () => {
    try {
      const result = await approve();
      pushActivity(createActivity("wallet", `Approved ${state.fromToken}`, `Approval confirmed for ${state.fromToken} swap routing.`, state.fromToken as TokenSymbol, "completed", result?.hash));
      show(`Approved ${state.fromToken}`, "success");
    } catch (err: any) {
      const nextError = normalizeSwapError(err);
      setSmartError(nextError);
      show(nextError.title, "error");
    }
  };

  const pickToken = (symbol: TokenSymbol) => {
    if (selector === "from") {
      updateState(symbol === state.toToken ? { fromToken: symbol, toToken: state.fromToken } : { fromToken: symbol });
    } else {
      updateState(symbol === state.fromToken ? { toToken: symbol, fromToken: state.toToken } : { toToken: symbol });
    }
    const nextRecent = [symbol, ...recentTokens.filter((item) => item !== symbol)].filter((item, index, list) => list.indexOf(item) === index && SWAP_TOKENS.includes(item));
    setRecentTokens(nextRecent);
    window.localStorage.setItem(RECENT_SWAP_TOKEN_KEY, JSON.stringify(nextRecent));
    setTokenSearch("");
    setSelector(null);
  };

  const setSlippage = (slippage: string) => {
    setCustomSlippage("");
    updateState({ slippage });
  };

  const applyCustomSlippage = (value: string) => {
    setCustomSlippage(value);
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0 && numeric <= 10) {
      updateState({ slippage: `${numeric}%` });
    }
  };

  const isLoading = state.status === "approving" || state.status === "swapping";
  const wrongNetwork = isConnected && currentChainId !== requiredChainId;
  const actionDisabled = isLoading || !state.amountIn || needsApproval || (!swapReady && !wrongNetwork);
  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <ToastContainer />
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3" style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.22)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#38bdf8" }} />
              <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#38bdf8" }}>
                LUNEXIS TERMINAL
              </span>
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 40, fontWeight: 900, color: "#f8fbff" }}>Token Swap</h1>
            <p style={{ color: "#849495", fontSize: 16 }}>{swapIntro}</p>
          </div>
          <div className="flex gap-3">
            <FaucetButton label="Need Test USDC?" />
          </div>
        </div>

        <div className="grid grid-cols-1 justify-center xl:grid-cols-[minmax(0,760px)_minmax(320px,420px)] gap-6 items-start">
          <section className="arc-card arc-swap-card rounded-[28px] p-6">
            <div className="lunexis-swap-top-row is-slippage-only">
              <span aria-hidden="true" />
              <SlippageSelector
                value={state.slippage}
                customValue={customSlippage}
                open={showSlippageMenu}
                onOpen={setShowSlippageMenu}
                onSelect={setSlippage}
                onCustom={applyCustomSlippage}
              />
            </div>

            <TokenAmountPanel
              label="You Pay"
              token={fromToken.symbol}
              amount={state.amountIn}
              balance={balanceLabel(fromToken.symbol)}
              price={amountValueLabel(fromToken.symbol, state.amountIn)}
              quote={quoteLoading ? "Fetching quote..." : quoteRate}
              impact={estimatedOut ? `${priceImpact.toFixed(2)}% impact` : "Impact pending"}
              impactTone={highPriceImpact ? "warning" : estimatedOut ? "success" : "muted"}
              onAmount={(amount) => updateState({ amountIn: amount })}
              onToken={() => setSelector("from")}
              onQuickAmount={setPercentAmount}
            />

            {emptyWallet && <EmptyWalletGuide />}
            <div className="flex justify-center my-4">
              <button
                onClick={() => updateState({ fromToken: state.toToken, toToken: state.fromToken })}
                className="arc-icon-action w-12 h-12 rounded-full"
                aria-label="Switch swap direction"
              >
                <svg className="arc-swap-direction-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 4v12" />
                  <path d="M8 4 4.8 7.2" />
                  <path d="M8 4l3.2 3.2" />
                  <path d="M16 20V8" />
                  <path d="M16 20l-3.2-3.2" />
                  <path d="M16 20l3.2-3.2" />
                </svg>
              </button>
            </div>
            <TokenAmountPanel
              label="You Receive"
              token={toToken.symbol}
              amount={quoteLoading ? "Loading..." : estimatedOut ? `~ ${estimatedOut}` : ""}
              balance={balanceLabel(toToken.symbol)}
              price={amountValueLabel(toToken.symbol, estimatedOut)}
              quote={estimatedOut ? `Receive ${estimatedOut} ${toToken.symbol}` : "Output updates live"}
              readOnly
              onToken={() => setSelector("to")}
            />

            {highPriceImpact && (
              <div className="lunexis-impact-warning mb-6">
                <strong>High price impact detected</strong>
                <span>Large trade may affect output. Consider reducing the amount.</span>
              </div>
            )}

            <RoutePreview fromToken={fromToken.symbol} toToken={toToken.symbol} show={Boolean(state.amountIn || estimatedOut)} />

            {needsApproval && currentChainId === requiredChainId && (
              <button onClick={handleApprove} disabled={state.status === "approving" || !state.amountIn} className="btn-outline-cyan w-full py-4 rounded-2xl mb-3">
                {state.status === "approving" ? `Approving ${state.fromToken}...` : `Approve ${state.fromToken}`}
              </button>
            )}
            <button onClick={handleSwap} disabled={actionDisabled} className="btn-primary w-full py-4 rounded-2xl">
              {isLoading ? "Swapping..." : wrongNetwork ? "Switch to ARC Chain" : isConnected ? "Confirm Swap" : "Connect Wallet to Swap"}
            </button>
            {!isConnected && (
              <div className="mt-3 flex items-center justify-between rounded-2xl p-3" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.16)" }}>
                <span style={{ color: "#849495", fontSize: 12 }}>Need test funds after connecting?</span>
                <FaucetButton label="Faucet" compact />
              </div>
            )}
            {showFaucetHint && (
              <FaucetHelper />
            )}
            {lowBalance && <FaucetHelper />}
            {state.txHash && (
              <a href={`${ARC_TESTNET_EXPLORER_URL}/tx/${state.txHash}`} target="_blank" rel="noreferrer" className="btn-ghost block text-center w-full py-3 rounded-2xl mt-3">
                View Transaction
              </a>
            )}
            {state.status === "success" && (
              <button onClick={reset} className="btn-ghost w-full py-3 rounded-2xl mt-3">Swap Again</button>
            )}
          </section>
          <TokenPriceChart activeToken={fromToken.symbol} />
        </div>
      </div>

      {selector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }} onClick={() => setSelector(null)}>
          <div className="arc-card rounded-3xl p-6 w-[min(440px,92vw)]" onClick={(event) => event.stopPropagation()}>
            <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff", marginBottom: 16 }}>Select Token</h3>
            <input
              value={tokenSearch}
              onChange={(event) => setTokenSearch(event.target.value)}
              placeholder="Search USDC, EURC, or contract address"
              className="lunexis-token-search mb-4"
              autoFocus
            />
            <div className="lunexis-recent-tokens mb-4">
              <span>Recent</span>
              {recentTokens.map((symbol) => (
                <button key={symbol} onClick={() => pickToken(symbol)}>
                  <TokenIcon symbol={symbol} size={20} />
                  {symbol}
                </button>
              ))}
            </div>
            {unsupportedTokenSearch && (
              <div className="lunexis-unsupported-token mb-4">
                <strong>Unsupported Token</strong>
                <span>Lunexis currently supports only USDC and EURC.</span>
              </div>
            )}
            {filteredTokens.map((symbol) => {
              const token = TOKEN_META[symbol];
              return (
                <button key={symbol} onClick={() => pickToken(symbol)} className="w-full flex items-center gap-4 p-4 rounded-2xl mb-2 btn-ghost" style={{ borderColor: `${token.accent}44` }}>
                  <TokenIcon symbol={symbol} size={44} />
                  <div className="text-left">
                    <div style={{ fontFamily: "'Space Grotesk'", color: "#f8fbff", fontWeight: 900 }}>{symbol}</div>
                    <div style={{ color: "#849495", fontSize: 12 }}>{token.label}</div>
                    <div style={{ color: "#6f8699", fontSize: 11, marginTop: 4 }}>Balance: {balanceLabel(symbol)}</div>
                    <div style={{ color: "#38bdf8", fontSize: 11, marginTop: 2, fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{priceLabel(symbol)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showNetworkSwitchModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(14px)" }}
          onClick={() => setShowNetworkSwitchModal(false)}
        >
          <div className="arc-card rounded-[28px] p-6 w-[min(440px,92vw)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(0,229,255,0.18), rgba(255,45,178,0.14))",
                  border: "1px solid rgba(56,189,248,0.32)",
                  boxShadow: "0 0 26px rgba(56,189,248,0.18)",
                }}
              >
                <TokenIcon symbol="ARC" size={34} />
              </div>
              <div>
                <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Network Required
                </div>
                <h3 style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: 900 }}>Switch to Arc Chain</h3>
              </div>
            </div>
            <p style={{ color: "#9fb2c4", fontSize: 14, lineHeight: 1.7, marginBottom: 22 }}>
              USDC and EURC swaps execute only on ARC Testnet. Switch once and Lunexis will recheck your wallet automatically.
            </p>
            <button onClick={handleSwitchNetwork} disabled={isSwitchingNetwork} className="btn-primary w-full py-3.5 rounded-2xl mb-3">
              {isSwitchingNetwork ? "Switching..." : "Switch to Arc Chain"}
            </button>
            <button onClick={() => setShowNetworkSwitchModal(false)} className="btn-ghost w-full py-3 rounded-2xl">
              Cancel
            </button>
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
      {smartError && <SmartErrorPopup error={smartError} onClose={() => setSmartError(null)} />}
    </div>
  );
}

function SlippageSelector({
  value,
  customValue,
  open,
  onOpen,
  onSelect,
  onCustom,
}: {
  value: string;
  customValue: string;
  open: boolean;
  onOpen: (value: boolean) => void;
  onSelect: (value: string) => void;
  onCustom: (value: string) => void;
}) {
  return (
    <div className="lunexis-slippage-compact">
      <button type="button" onClick={() => onOpen(!open)} className="btn-ghost rounded-full">
        <span>Slippage</span>
        <strong>{value}</strong>
        <span className="material-symbols-outlined" aria-hidden="true">expand_more</span>
      </button>
      {open && (
        <div className="lunexis-slippage-menu">
          {["0.1%", "0.5%", "1%"].map((slippage) => (
            <button
              key={slippage}
              type="button"
              onClick={() => {
                onSelect(slippage);
                onOpen(false);
              }}
              className={value === slippage ? "is-active" : ""}
            >
              {slippage}
            </button>
          ))}
          <input
            value={customValue}
            onChange={(event) => onCustom(event.target.value)}
            placeholder="Custom %"
            inputMode="decimal"
          />
        </div>
      )}
    </div>
  );
}

function RoutePreview({ fromToken, toToken, show }: { fromToken: TokenSymbol; toToken: TokenSymbol; show: boolean }) {
  if (!show || !SWAP_TOKENS.includes(fromToken) || !SWAP_TOKENS.includes(toToken)) return null;
  return (
    <div className="lunexis-route-preview">
      <span>Route</span>
      <div>
        <TokenIcon symbol={fromToken} size={28} />
        <strong>{fromToken}</strong>
        <i />
        <TokenIcon symbol={toToken} size={28} />
        <strong>{toToken}</strong>
      </div>
    </div>
  );
}

function FaucetHelper() {
  return (
    <div className="lunexis-faucet-helper mt-3">
      <div>
        <strong>Low balance detected</strong>
        <span>Need test tokens? Get faucet funds from Circle.</span>
      </div>
      <FaucetButton label="Get Faucet Funds" compact />
    </div>
  );
}

function EmptyWalletGuide() {
  return (
    <div className="lunexis-empty-guide mt-4">
      <strong>Start your first stablecoin swap</strong>
      {["Get faucet funds", "Connect wallet", "Swap USDC <> EURC", "Complete first transaction"].map((step, index) => (
        <div key={step}>
          <span>{index + 1}</span>
          {step}
        </div>
      ))}
    </div>
  );
}

function SmartErrorPopup({ error, onClose }: { error: SmartError; onClose: () => void }) {
  return (
    <div className={`lunexis-smart-error is-${error.tone ?? "error"}`}>
      <button onClick={onClose} aria-label="Close error">x</button>
      <strong>{error.title}</strong>
      <span>{error.message}</span>
      <small>{error.action}</small>
    </div>
  );
}

function TokenAmountPanel({ label, token, amount, balance, price, quote, impact, impactTone = "muted", readOnly, onAmount, onToken, onQuickAmount }: { label: string; token: TokenSymbol; amount: string; balance: string; price: string; quote?: string; impact?: string; impactTone?: "success" | "warning" | "muted"; readOnly?: boolean; onAmount?: (amount: string) => void; onToken: () => void; onQuickAmount?: (percent: number) => void }) {
  return (
    <div className="arc-token-amount-panel rounded-3xl p-5" style={{ background: "rgba(0,0,0,0.32)", border: `1px solid ${TOKEN_META[token].accent}44` }}>
      <div className="mb-3">
        <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#849495", textTransform: "uppercase" }}>{label}</div>
      </div>
      <div className="arc-token-amount-row flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            inputMode={readOnly ? undefined : "decimal"}
            value={amount}
            readOnly={readOnly}
            onChange={(event) => onAmount?.(event.target.value)}
            placeholder="0.00"
            className="arc-swap-amount-input"
          />
          <div className="lunexis-amount-live-meta">
            <span>{price}</span>
            {quote && <span>{quote}</span>}
            {impact && <strong className={`is-${impactTone}`}>{impact}</strong>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {onQuickAmount && (
              <>
                {[
                  ["25%", 25],
                  ["50%", 50],
                  ["75%", 75],
                  ["Max", 100],
                ].map(([quickLabel, percent]) => (
                  <button
                    key={quickLabel}
                    onClick={() => onQuickAmount(Number(percent))}
                    className="btn-ghost rounded-full py-1 px-3"
                    style={{ fontSize: 10, letterSpacing: "0.04em", minHeight: 26 }}
                  >
                    {quickLabel}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="arc-token-selector-column flex flex-col items-end gap-2 self-start pt-8">
          <button
            onClick={onToken}
            className="flex items-center gap-2 px-3 py-2 rounded-full transition-all"
            style={{
              background: `linear-gradient(135deg, ${TOKEN_META[token].accent}18, rgba(255,255,255,0.045))`,
              border: `1px solid ${TOKEN_META[token].accent}44`,
              boxShadow: `0 0 22px ${TOKEN_META[token].accent}18`,
              minWidth: 112,
            }}
          >
            <TokenIcon symbol={token} size={30} />
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 15, fontWeight: 900, color: "#f8fbff" }}>{token}</span>
          </button>
          <div
            className="rounded-full px-2.5 py-1"
            style={{
              background: "rgba(255,255,255,0.035)",
              border: `1px solid ${TOKEN_META[token].accent}18`,
              color: "#9fb2c4",
              fontSize: 10,
              fontFamily: "'Space Grotesk'",
              fontWeight: 700,
              letterSpacing: 0,
            }}
          >
            Bal <span style={{ color: "#dbeafe" }}>{balance}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
