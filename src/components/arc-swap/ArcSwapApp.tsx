"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { maxUint256, parseUnits, zeroAddress } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { useToast } from "@/components/ui/Toast";
import ArcLogo from "@/components/ui/ArcLogo";
import ArcSwapConnectButton from "@/components/arc-swap/ArcSwapConnectButton";
import { useArcDexStore } from "@/hooks/useArcDexStore";
import { useArcTokenBalances } from "@/hooks/useArcTokenBalances";
import { useResponsiveSidebar } from "@/hooks/useResponsiveSidebar";
import {
  ARC_CHAIN_ID,
  ARC_SWAP_TOKENS,
  BRIDGE_ABI,
  DASHBOARD_SERIES,
  DEX_CONTRACTS,
  ERC20_ABI,
  FOOTER_LINKS,
  LP_MANAGER_ABI,
  SEPOLIA_CHAIN_ID,
  SWAP_ROUTER_ABI,
  VIEW_LABELS,
  type ArcSwapToken,
  type DexTransaction,
  type DexView,
} from "@/lib/arc-dex";

const NAV_ITEMS: Array<{ view: DexView; icon: string; note: string }> = [
  { view: "dashboard", icon: "dashboard", note: "TVL, volume, activity" },
  { view: "swap", icon: "swap_horiz", note: "Approve and trade" },
  { view: "liquidity", icon: "waterfall_chart", note: "Add and remove LP" },
  { view: "bridge", icon: "conversion_path", note: "Sepolia to ARC Chain" },
  { view: "portfolio", icon: "account_balance_wallet", note: "Balances and history" },
  { view: "admin", icon: "shield_lock", note: "Token and protocol controls" },
];

function getRate(tokenIn: ArcSwapToken, tokenOut: ArcSwapToken) {
  if (tokenIn.symbol === tokenOut.symbol) return 1;
  const pairs: Record<string, number> = {
    "ARC-USDC": 1.18,
    "USDC-ARC": 0.84,
    "USDC-EURO": 0.92,
    "EURO-USDC": 1.08,
    "WETH-USDC": 3110,
    "USDC-WETH": 0.00032,
    "ARC-WETH": 0.00039,
    "WETH-ARC": 2575,
  };
  return pairs[`${tokenIn.symbol}-${tokenOut.symbol}`] ?? 1;
}

function parseAmount(value: string, decimals: number) {
  if (!value.trim()) return BigInt(0);
  try {
    return parseUnits(value, decimals);
  } catch {
    return null;
  }
}

function createTransaction(kind: DexTransaction["kind"], title: string, details: string, hash?: string, status: DexTransaction["status"] = "confirmed"): DexTransaction {
  return {
    id: `${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    title,
    details,
    hash,
    status,
    timestamp: new Date().toISOString(),
  };
}

export default function ArcSwapApp() {
  const [view, setView] = useState<DexView>("dashboard");
  const sidebar = useResponsiveSidebar();
  const { address, isConnected, chainId } = useAccount();
  const { store, addToken, toggleSwapPaused, addTransaction } = useArcDexStore();
  const allTokens = useMemo(() => {
    const combined = [...ARC_SWAP_TOKENS, ...store.customTokens];
    return combined.filter((token, index) => combined.findIndex((item) => item.symbol === token.symbol) === index);
  }, [store.customTokens]);
  const { balances, isLoading: balancesLoading, refreshBalances } = useArcTokenBalances(allTokens);
  const { show, ToastContainer } = useToast();

  const offsetStyle = { ["--arc-sidebar-offset" as any]: sidebar.contentOffset } as CSSProperties;

  const goToView = (next: DexView) => {
    setView(next);
    sidebar.closeMobile();
  };

  return (
    <div className="arc-app-root arc-page-shell min-h-screen" style={offsetStyle}>
      <ToastContainer />
      {sidebar.isOverlay && sidebar.isOpen && <button className="arc-sidebar-backdrop" aria-label="Close sidebar" onClick={sidebar.closeMobile} />}

      <aside className={`arc-sidebar-shell ${sidebar.isOverlay ? "arc-sidebar-overlay" : ""} ${sidebar.isOpen ? "is-open" : ""} ${sidebar.isCollapsed && !sidebar.isOverlay ? "is-collapsed" : ""}`}>
        <div className="px-4 pt-5 pb-4 border-b" style={{ borderColor: "rgba(148,217,255,0.12)" }}>
          <div className="flex items-center justify-between gap-3">
            <ArcLogo size={44} compact={sidebar.isCollapsed && !sidebar.isOverlay} />
            <button onClick={sidebar.toggle} className="arc-icon-action w-10 h-10 rounded-2xl" aria-label="Toggle sidebar">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {sidebar.isOverlay ? "close" : sidebar.isCollapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}
              </span>
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="glass-panel rounded-2xl p-3">
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, letterSpacing: "0.1em", color: "#7dd3fc", textTransform: "uppercase" }}>ARC Chain</div>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff", marginTop: 8 }}>ARC Swap</div>
            {(!sidebar.isCollapsed || sidebar.isOverlay) && (
              <p style={{ color: "#8aa1b4", fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>
                Modern DEX tooling for swaps, liquidity, bridging, and portfolio monitoring.
              </p>
            )}
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-2 px-3">
          {NAV_ITEMS.map((item) => {
            const active = item.view === view;
            return (
              <button
                key={item.view}
                onClick={() => goToView(item.view)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                style={{
                  color: active ? "#F8FBFF" : "#8BA6BB",
                  background: active ? "linear-gradient(145deg, rgba(124,58,237,0.22), rgba(56,189,248,0.12))" : "transparent",
                  border: `1px solid ${active ? "rgba(124,58,237,0.28)" : "transparent"}`,
                  justifyContent: sidebar.isCollapsed && !sidebar.isOverlay ? "center" : "flex-start",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: active ? "#c4b5fd" : "#6E8698" }}>{item.icon}</span>
                {(!sidebar.isCollapsed || sidebar.isOverlay) && (
                  <span>
                    <span style={{ display: "block", fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 700 }}>{VIEW_LABELS[item.view]}</span>
                    <span style={{ display: "block", fontSize: 10, color: "#71879b", marginTop: 2 }}>{item.note}</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4">
          <div className="glass-panel rounded-2xl p-3">
            <div style={{ color: "#8aa1b4", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Network Status</div>
            <div style={{ color: chainId === ARC_CHAIN_ID ? "#22c55e" : "#f59e0b", fontFamily: "'Space Grotesk'", fontWeight: 900, marginTop: 8 }}>
              {chainId === ARC_CHAIN_ID ? "ARC Chain Online" : chainId === SEPOLIA_CHAIN_ID ? "Sepolia Connected" : "Connect Supported Chain"}
            </div>
          </div>
        </div>
      </aside>

      <header className="fixed top-0 left-0 right-0 z-50 h-16 px-3 sm:px-6 border-b flex items-center justify-between" style={{ background: "linear-gradient(90deg, rgba(3,7,18,0.92), rgba(8,17,34,0.88))", backdropFilter: "blur(22px)", borderColor: "rgba(148,217,255,0.14)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={sidebar.toggle} className="arc-icon-action w-10 h-10 rounded-2xl">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {sidebar.isOverlay ? (sidebar.isOpen ? "close" : "menu") : sidebar.isCollapsed ? "menu_open" : "dock_to_left"}
            </span>
          </button>
          <div className="hidden sm:block">
            <ArcLogo size={38} compact />
          </div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, letterSpacing: "0.12em", color: "#c4b5fd", textTransform: "uppercase" }}>
              ARC Swap
            </div>
            <div style={{ color: "#8aa1b4", fontSize: 12 }}>{VIEW_LABELS[view]}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.1)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: chainId === ARC_CHAIN_ID ? "#22c55e" : "#f59e0b" }} />
            <span style={{ color: "#dbeafe", fontSize: 12 }}>RPC healthy</span>
          </div>
          <ArcSwapConnectButton />
        </div>
      </header>

      <main className="arc-with-sidebar-page">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {view === "dashboard" && (
            <DashboardView
              onOpenView={goToView}
              balances={balances}
              transactions={store.transactions}
              connected={isConnected}
            />
          )}
          {view === "swap" && (
            <SwapView
              tokens={allTokens.filter((token) => !token.isNative)}
              balances={balances}
              paused={store.swapPaused}
              addTransaction={addTransaction}
              refreshBalances={refreshBalances}
              notify={show}
            />
          )}
          {view === "liquidity" && (
            <LiquidityView
              tokens={allTokens.filter((token) => !token.isNative)}
              balances={balances}
              addTransaction={addTransaction}
              refreshBalances={refreshBalances}
              notify={show}
            />
          )}
          {view === "bridge" && (
            <BridgeView
              tokens={allTokens.filter((token) => token.symbol === "ARC" || token.symbol === "USDC")}
              balances={balances}
              transactions={store.transactions}
              addTransaction={addTransaction}
              notify={show}
            />
          )}
          {view === "portfolio" && (
            <PortfolioView balances={balances} isLoading={balancesLoading} transactions={store.transactions} refreshBalances={refreshBalances} />
          )}
          {view === "admin" && (
            <AdminView
              address={address}
              customTokens={store.customTokens}
              swapPaused={store.swapPaused}
              addToken={addToken}
              toggleSwapPaused={toggleSwapPaused}
              notify={show}
            />
          )}
        </div>
      </main>

      <footer className="arc-footer-shell border-t mt-8" style={{ borderColor: "rgba(148,217,255,0.08)", background: "rgba(2,4,10,0.78)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 900, color: "#f8fbff" }}>ARC Swap</div>
            <div style={{ color: "#6f8699", fontSize: 12, marginTop: 4 }}>Swap, bridge, LP, and portfolio tools for the ARC Chain ecosystem.</div>
          </div>
          <div className="flex items-center gap-5">
            {FOOTER_LINKS.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer" style={{ color: "#9bb3c7", fontSize: 12 }}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

function DashboardView({
  onOpenView,
  balances,
  transactions,
  connected,
}: {
  onOpenView: (view: DexView) => void;
  balances: Array<ArcSwapToken & { formatted: string }>;
  transactions: DexTransaction[];
  connected: boolean;
}) {
  const totalValue = balances.reduce((sum, token) => sum + Number(token.formatted), 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="arc-card rounded-[28px] p-6 sm:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div style={{ color: "#c4b5fd", fontFamily: "'Space Grotesk'", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>ARC Chain DEX</div>
              <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: "clamp(2rem,5vw,4rem)", fontWeight: 900, lineHeight: 1.02, color: "#f8fbff", marginTop: 12 }}>
                Trade, bridge, and manage liquidity across the ARC ecosystem.
              </h1>
              <p style={{ color: "#8ca3b6", fontSize: 16, lineHeight: 1.7, marginTop: 18, maxWidth: 680 }}>
                ARC Swap is a modern Web3 trading surface for ARC, USDC, EURO, and WETH, with wallet-based approvals, portfolio visibility, and admin controls for your chain environment.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary px-5 py-3 rounded-2xl" onClick={() => onOpenView("swap")}>Open Swap</button>
              <button className="btn-ghost px-5 py-3 rounded-2xl" onClick={() => onOpenView("bridge")}>Bridge Assets</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              ["TVL", "$742k"],
              ["24h Volume", "$268k"],
              ["Connected Assets", `${balances.length} tokens`],
            ].map(([label, value]) => (
              <SectionCard key={label} title={label} value={value} />
            ))}
          </div>

          <div className="h-[280px] rounded-[24px] p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,217,255,0.08)" }}>
            <div className="flex items-center justify-between mb-4">
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 900, color: "#f8fbff" }}>Volume & TVL</div>
              <span style={{ color: "#8ca3b6", fontSize: 12 }}>{connected ? "Wallet connected" : "Connect wallet for live portfolio context"}</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DASHBOARD_SERIES}>
                <defs>
                  <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="tvlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,217,255,0.08)" vertical={false} />
                <XAxis dataKey="name" stroke="#7b93a7" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#08111f", border: "1px solid rgba(148,217,255,0.12)", borderRadius: 16 }} />
                <Area type="monotone" dataKey="volume" stroke="#8b5cf6" fill="url(#volumeFill)" strokeWidth={2.4} />
                <Area type="monotone" dataKey="tvl" stroke="#38bdf8" fill="url(#tvlFill)" strokeWidth={2.4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="arc-card rounded-[28px] p-6">
          <div className="flex items-center justify-between mb-4">
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 900, color: "#f8fbff" }}>Portfolio Snapshot</div>
            <span style={{ color: "#8ca3b6", fontSize: 12 }}>{totalValue.toFixed(2)} total units</span>
          </div>
          <div className="grid gap-3">
            {balances.slice(0, 5).map((token) => (
              <div key={token.symbol} className="flex items-center justify-between rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,217,255,0.08)" }}>
                <div className="flex items-center gap-3">
                  <img src={token.icon} alt={token.symbol} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <div style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{token.symbol}</div>
                    <div style={{ color: "#6f8699", fontSize: 12 }}>{token.name}</div>
                  </div>
                </div>
                <div style={{ color: "#dbeafe", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{token.formatted}</div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="arc-card rounded-[28px] p-6">
          <div className="flex items-center justify-between mb-4">
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 900, color: "#f8fbff" }}>Recent Transactions</div>
            <button className="btn-ghost px-3 py-2 rounded-2xl" onClick={() => onOpenView("portfolio")}>Portfolio</button>
          </div>
          <div className="grid gap-3">
            {transactions.length === 0 && <EmptyMessage message="No recent wallet activity yet. Execute a swap, bridge, or liquidity action to populate this feed." />}
            {transactions.slice(0, 4).map((tx) => (
              <ActivityRow key={tx.id} item={tx} />
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function SwapView({
  tokens,
  balances,
  paused,
  addTransaction,
  refreshBalances,
  notify,
}: {
  tokens: ArcSwapToken[];
  balances: Array<ArcSwapToken & { formatted: string }>;
  paused: boolean;
  addTransaction: (transaction: DexTransaction) => void;
  refreshBalances: () => void;
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [tokenIn, setTokenIn] = useState(tokens[0]);
  const [tokenOut, setTokenOut] = useState(tokens[1] ?? tokens[0]);
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const balanceEntry = balances.find((item) => item.symbol === tokenIn.symbol);
  const router = DEX_CONTRACTS.swapRouter;
  const rate = getRate(tokenIn, tokenOut);
  const numericAmount = Number(amountIn);
  const outputEstimate = amountIn && Number.isFinite(numericAmount) ? (numericAmount * rate).toFixed(4) : "0.0000";
  const parsedAmount = parseAmount(amountIn, tokenIn.decimals);
  const allowanceEnabled = Boolean(address && router && tokenIn.address);
  const allowanceArgs = allowanceEnabled ? [address!, router!] as const : [zeroAddress, zeroAddress] as const;

  const { data: allowance } = useReadContract({
    address: tokenIn.address ?? zeroAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: allowanceArgs,
    query: { enabled: allowanceEnabled },
  });

  const needsApproval = Boolean(tokenIn.address && router && parsedAmount && parsedAmount > BigInt(0) && (allowance ?? BigInt(0)) < parsedAmount);

  const approve = async () => {
    if (!router || !tokenIn.address || !publicClient) {
      notify("Set NEXT_PUBLIC_ARC_SWAP_ROUTER_ADDRESS to enable real approvals.", "error");
      return;
    }
    try {
      const hash = await writeContractAsync({
        address: tokenIn.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [router, maxUint256] as const,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      addTransaction(createTransaction("approve", `Approved ${tokenIn.symbol}`, `Approval granted to ARC Swap router for ${tokenIn.symbol}.`, hash));
      refreshBalances();
      notify(`Approved ${tokenIn.symbol}`, "success");
    } catch (error: any) {
      notify(error?.message || "Approval failed", "error");
    }
  };

  const swap = async () => {
    if (!isConnected || !address) {
      notify("Connect your wallet before swapping.", "error");
      return;
    }
    if (paused) {
      notify("Swap is paused by admin.", "error");
      return;
    }
    if (!parsedAmount || parsedAmount <= BigInt(0)) {
      notify("Enter a valid input amount before swapping.", "error");
      return;
    }
    if (tokenIn.symbol === tokenOut.symbol) {
      notify("Choose two different tokens for the swap.", "error");
      return;
    }
    if (!router || !tokenIn.address || !tokenOut.address || !publicClient) {
      notify("Configure NEXT_PUBLIC_ARC_SWAP_ROUTER_ADDRESS to execute real swaps.", "error");
      return;
    }
    try {
      const minOut = parseUnits((Number(outputEstimate) * (1 - Number(slippage) / 100)).toFixed(4), tokenOut.decimals);
      const hash = await writeContractAsync({
        address: router,
        abi: SWAP_ROUTER_ABI,
        functionName: "swapExactInput",
        args: [tokenIn.address, tokenOut.address, parsedAmount, minOut, address] as const,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      addTransaction(createTransaction("swap", `Swapped ${tokenIn.symbol} to ${tokenOut.symbol}`, `${amountIn} ${tokenIn.symbol} swapped for ~${outputEstimate} ${tokenOut.symbol}.`, hash));
      refreshBalances();
      notify("Swap confirmed", "success");
    } catch (error: any) {
      notify(error?.message || "Swap failed", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="arc-card rounded-[28px] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900, color: "#f8fbff" }}>Swap</h2>
            <p style={{ color: "#8ca3b6", marginTop: 8 }}>Approve assets, set slippage, and route trades through your ARC swap router.</p>
          </div>
          <div className="flex gap-2">
            {["0.1", "0.5", "1.0"].map((value) => (
              <button key={value} className={value === slippage ? "btn-primary px-3 py-2 rounded-2xl" : "btn-ghost px-3 py-2 rounded-2xl"} onClick={() => setSlippage(value)}>
                {value}%
              </button>
            ))}
          </div>
        </div>

        <SwapPanel label="From" token={tokenIn} amount={amountIn} onAmount={setAmountIn} onToken={setTokenIn} tokens={tokens} balance={balanceEntry?.formatted || "0.0000"} />
        <div className="flex justify-center my-4">
          <button className="arc-icon-action w-12 h-12 rounded-full" onClick={() => {
            setTokenIn(tokenOut);
            setTokenOut(tokenIn);
          }}>
            <span className="material-symbols-outlined">swap_vert</span>
          </button>
        </div>
        <SwapPanel label="To" token={tokenOut} amount={outputEstimate} onAmount={() => undefined} onToken={setTokenOut} tokens={tokens} readOnly balance={balances.find((item) => item.symbol === tokenOut.symbol)?.formatted || "0.0000"} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <SectionCard title="Price Impact" value="< 0.20%" compact />
          <SectionCard title="Route" value={`${tokenIn.symbol} / ${tokenOut.symbol}`} compact />
          <SectionCard title="Slippage" value={`${slippage}%`} compact />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button className="btn-ghost flex-1 py-3 rounded-2xl" onClick={() => setAmountIn(balanceEntry?.formatted || "0")}>Max</button>
          {needsApproval && <button className="btn-outline-cyan flex-1 py-3 rounded-2xl" onClick={approve}>Approve {tokenIn.symbol}</button>}
          <button className="btn-primary flex-1 py-3 rounded-2xl" onClick={swap} disabled={!amountIn || tokenIn.symbol === tokenOut.symbol || paused}>
            {paused ? "Swap Paused" : "Swap"}
          </button>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="arc-card rounded-[28px] p-6">
        <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff" }}>Swap Readiness</h3>
        <div className="grid gap-3 mt-5">
          <InfoRow label="Router address" value={router || "Missing env config"} />
          <InfoRow label="Wallet status" value={isConnected ? "Connected" : "Not connected"} />
          <InfoRow label="Input balance" value={`${balanceEntry?.formatted || "0.0000"} ${tokenIn.symbol}`} />
          <InfoRow label="Output estimate" value={`${outputEstimate} ${tokenOut.symbol}`} />
        </div>
      </motion.section>
    </div>
  );
}

function LiquidityView({
  tokens,
  balances,
  addTransaction,
  refreshBalances,
  notify,
}: {
  tokens: ArcSwapToken[];
  balances: Array<ArcSwapToken & { formatted: string }>;
  addTransaction: (transaction: DexTransaction) => void;
  refreshBalances: () => void;
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [tokenA, setTokenA] = useState(tokens[0]);
  const [tokenB, setTokenB] = useState(tokens[1] ?? tokens[0]);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [lpAmount, setLpAmount] = useState("");
  const amountANumber = Number(amountA);
  const poolShare = amountA && amountB && Number.isFinite(amountANumber) ? `${Math.min(99.99, amountANumber * 0.12).toFixed(2)}%` : "0.00%";

  const sendLiquidityTx = async (mode: "add" | "remove") => {
    if (!isConnected || !address) {
      notify("Connect your wallet before managing liquidity.", "error");
      return;
    }
    if (tokenA.symbol === tokenB.symbol) {
      notify("Choose two different tokens for the pool.", "error");
      return;
    }
    if (!DEX_CONTRACTS.lpManager || !tokenA.address || !tokenB.address || !publicClient) {
      notify("Configure NEXT_PUBLIC_ARC_LP_MANAGER_ADDRESS to execute real LP transactions.", "error");
      return;
    }
    const parsedAmountA = parseAmount(amountA, tokenA.decimals);
    const parsedAmountB = parseAmount(amountB, tokenB.decimals);
    const parsedLpAmount = parseAmount(lpAmount, 18);
    if (mode === "add" && (!parsedAmountA || !parsedAmountB || parsedAmountA <= BigInt(0) || parsedAmountB <= BigInt(0))) {
      notify("Enter valid token amounts before adding liquidity.", "error");
      return;
    }
    if (mode === "remove" && (!parsedLpAmount || parsedLpAmount <= BigInt(0))) {
      notify("Enter a valid LP amount before removing liquidity.", "error");
      return;
    }
    try {
      const hash = mode === "add"
        ? await writeContractAsync({
            address: DEX_CONTRACTS.lpManager,
            abi: LP_MANAGER_ABI,
            functionName: "addLiquidity",
            args: [tokenA.address, tokenB.address, parsedAmountA!, parsedAmountB!, address] as const,
          })
        : await writeContractAsync({
            address: DEX_CONTRACTS.lpManager,
            abi: LP_MANAGER_ABI,
            functionName: "removeLiquidity",
            args: [tokenA.address, tokenB.address, parsedLpAmount!, address] as const,
          });
      await publicClient.waitForTransactionReceipt({ hash });
      addTransaction(createTransaction(mode === "add" ? "liquidity-add" : "liquidity-remove", mode === "add" ? "Liquidity added" : "Liquidity removed", `${tokenA.symbol}/${tokenB.symbol} position updated.`, hash));
      refreshBalances();
      notify(mode === "add" ? "Liquidity added" : "Liquidity removed", "success");
    } catch (error: any) {
      notify(error?.message || "Liquidity transaction failed", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="arc-card rounded-[28px] p-6">
        <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900, color: "#f8fbff" }}>Liquidity</h2>
        <p style={{ color: "#8ca3b6", marginTop: 8, marginBottom: 24 }}>Add or remove liquidity using your LP manager contract configuration.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SwapPanel label="Token A" token={tokenA} amount={amountA} onAmount={setAmountA} onToken={setTokenA} tokens={tokens} balance={balances.find((item) => item.symbol === tokenA.symbol)?.formatted || "0.0000"} />
          <SwapPanel label="Token B" token={tokenB} amount={amountB} onAmount={setAmountB} onToken={setTokenB} tokens={tokens} balance={balances.find((item) => item.symbol === tokenB.symbol)?.formatted || "0.0000"} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <SectionCard title="Pool Share" value={poolShare} compact />
          <SectionCard title="LP Token" value={`${tokenA.symbol}-${tokenB.symbol} LP`} compact />
          <SectionCard title="Manager" value={DEX_CONTRACTS.lpManager ? "Configured" : "Missing"} compact />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button className="btn-primary flex-1 py-3 rounded-2xl" onClick={() => sendLiquidityTx("add")}>Add Liquidity</button>
          <button className="btn-ghost flex-1 py-3 rounded-2xl" onClick={() => sendLiquidityTx("remove")}>Remove Liquidity</button>
        </div>
        <div className="mt-4">
          <label style={{ color: "#8ca3b6", fontSize: 12 }}>LP Amount to Remove</label>
          <input value={lpAmount} onChange={(event) => setLpAmount(event.target.value)} className="mt-2 w-full px-4 py-3 rounded-2xl" placeholder="0.0" />
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="arc-card rounded-[28px] p-6">
        <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff" }}>LP Positions</h3>
        <div className="grid gap-3 mt-5">
          <EmptyMessage message="Connect an LP manager contract to read live LP position ownership and share percentages." />
        </div>
      </motion.section>
    </div>
  );
}

function BridgeView({
  tokens,
  balances,
  transactions,
  addTransaction,
  notify,
}: {
  tokens: ArcSwapToken[];
  balances: Array<ArcSwapToken & { formatted: string }>;
  transactions: DexTransaction[];
  addTransaction: (transaction: DexTransaction) => void;
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [token, setToken] = useState(tokens[0]);
  const [amount, setAmount] = useState("");
  const destinationChainId = ARC_CHAIN_ID;
  const bridgeTransactions = transactions.filter((item) => item.kind === "bridge").slice(0, 4);

  const bridge = async () => {
    if (!isConnected || !address) {
      notify("Connect your wallet before bridging.", "error");
      return;
    }
    const parsedAmount = parseAmount(amount, token.decimals);
    if (!parsedAmount || parsedAmount <= BigInt(0)) {
      notify("Enter a valid bridge amount.", "error");
      return;
    }
    if (!DEX_CONTRACTS.bridge || !token.address || !publicClient) {
      notify("Configure NEXT_PUBLIC_ARC_BRIDGE_CONTRACT_ADDRESS to enable bridge execution.", "error");
      return;
    }
    try {
      const hash = await writeContractAsync({
        address: DEX_CONTRACTS.bridge,
        abi: BRIDGE_ABI,
        functionName: "bridgeToken",
        args: [token.address, parsedAmount, BigInt(destinationChainId), address] as const,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      addTransaction(createTransaction("bridge", `Bridged ${token.symbol}`, `${amount} ${token.symbol} from Sepolia to ARC Chain.`, hash));
      notify("Bridge submitted and confirmed", "success");
    } catch (error: any) {
      notify(error?.message || "Bridge failed", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="arc-card rounded-[28px] p-6">
        <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900, color: "#f8fbff" }}>Bridge</h2>
        <p style={{ color: "#8ca3b6", marginTop: 8, marginBottom: 24 }}>Move ARC and USDC between Sepolia and ARC Chain using your configured bridge contract.</p>
        <div className="grid grid-cols-2 gap-4">
          <SectionCard title="From" value="Ethereum Sepolia" compact />
          <SectionCard title="To" value="ARC Chain" compact />
        </div>
        <SwapPanel label="Asset" token={token} amount={amount} onAmount={setAmount} onToken={setToken} tokens={tokens} balance={balances.find((item) => item.symbol === token.symbol)?.formatted || "0.0000"} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <SectionCard title="Destination" value="ARC Chain" compact />
          <SectionCard title="Status" value={DEX_CONTRACTS.bridge ? "Ready" : "Configure bridge"} compact />
          <SectionCard title="Bridge History" value="Stored locally" compact />
        </div>
        <button className="btn-primary w-full py-3 rounded-2xl mt-6" onClick={bridge}>Bridge Tokens</button>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="arc-card rounded-[28px] p-6">
        <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff" }}>Bridge History</h3>
        <div className="grid gap-3 mt-5">
          <InfoRow label="Supported assets" value="ARC, USDC" />
          <InfoRow label="Source chain" value="Sepolia" />
          <InfoRow label="Destination chain" value="ARC Chain" />
          <InfoRow label="Recipient" value={address || "Connect wallet"} />
          {bridgeTransactions.length === 0 && <EmptyMessage message="No bridge transactions recorded yet." />}
          {bridgeTransactions.map((transaction) => (
            <ActivityRow key={transaction.id} item={transaction} />
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function PortfolioView({
  balances,
  isLoading,
  transactions,
  refreshBalances,
}: {
  balances: Array<ArcSwapToken & { formatted: string }>;
  isLoading: boolean;
  transactions: DexTransaction[];
  refreshBalances: () => void;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="arc-card rounded-[28px] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900, color: "#f8fbff" }}>Portfolio</h2>
            <p style={{ color: "#8ca3b6", marginTop: 8 }}>Track user balances, LP positions, and recent transactions.</p>
          </div>
          <button className="btn-ghost px-4 py-3 rounded-2xl" onClick={() => refreshBalances()}>Refresh</button>
        </div>
        <div className="grid gap-3">
          {balances.map((token) => (
            <div key={token.symbol} className="flex items-center justify-between rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,217,255,0.08)" }}>
              <div className="flex items-center gap-3">
                <img src={token.icon} alt={token.symbol} className="w-11 h-11 rounded-full object-cover" />
                <div>
                  <div style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{token.symbol}</div>
                  <div style={{ color: "#6f8699", fontSize: 12 }}>{token.name}</div>
                </div>
              </div>
              <div style={{ color: "#dbeafe", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{isLoading ? "Loading..." : token.formatted}</div>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="arc-card rounded-[28px] p-6">
        <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff" }}>Recent Transactions</h3>
        <div className="grid gap-3 mt-5">
          {transactions.length === 0 && <EmptyMessage message="No transactions recorded yet." />}
          {transactions.map((tx) => (
            <ActivityRow key={tx.id} item={tx} />
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function AdminView({
  address,
  customTokens,
  swapPaused,
  addToken,
  toggleSwapPaused,
  notify,
}: {
  address?: string;
  customTokens: ArcSwapToken[];
  swapPaused: boolean;
  addToken: (token: ArcSwapToken) => void;
  toggleSwapPaused: () => void;
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const [form, setForm] = useState({
    symbol: "",
    name: "",
    address: "",
    decimals: "18",
    accent: "#8b5cf6",
    icon: "/arc-assets/arc.jpg",
  });

  const submitToken = () => {
    try {
      addToken({
        symbol: form.symbol.toUpperCase(),
        name: form.name,
        address: form.address ? (form.address as `0x${string}`) : undefined,
        decimals: Number(form.decimals),
        accent: form.accent,
        icon: form.icon,
        chainId: ARC_CHAIN_ID,
      });
      notify(`Added ${form.symbol.toUpperCase()} to admin token list.`, "success");
      setForm({ symbol: "", name: "", address: "", decimals: "18", accent: "#8b5cf6", icon: "/arc-assets/arc.jpg" });
    } catch (error: any) {
      notify(error?.message || "Could not add token", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="arc-card rounded-[28px] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900, color: "#f8fbff" }}>Admin Panel</h2>
            <p style={{ color: "#8ca3b6", marginTop: 8 }}>Manage token list, pause swaps, and prepare your production addresses.</p>
          </div>
          <button className={swapPaused ? "btn-primary px-4 py-3 rounded-2xl" : "btn-ghost px-4 py-3 rounded-2xl"} onClick={toggleSwapPaused}>
            {swapPaused ? "Resume Swap" : "Pause Swap"}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })} className="px-4 py-3 rounded-2xl" placeholder="Token Symbol" />
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="px-4 py-3 rounded-2xl" placeholder="Token Name" />
          <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="px-4 py-3 rounded-2xl md:col-span-2" placeholder="0x..." />
          <input value={form.decimals} onChange={(event) => setForm({ ...form, decimals: event.target.value })} className="px-4 py-3 rounded-2xl" placeholder="Decimals" />
          <input value={form.accent} onChange={(event) => setForm({ ...form, accent: event.target.value })} className="px-4 py-3 rounded-2xl" placeholder="Accent Color" />
        </div>
        <button className="btn-primary w-full py-3 rounded-2xl mt-4" onClick={submitToken}>Add New Token</button>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="arc-card rounded-[28px] p-6">
        <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff" }}>Admin Analytics</h3>
        <div className="grid gap-3 mt-5">
          <InfoRow label="Connected wallet" value={address || "Not connected"} />
          <InfoRow label="Router configured" value={DEX_CONTRACTS.swapRouter || "No"} />
          <InfoRow label="Bridge configured" value={DEX_CONTRACTS.bridge || "No"} />
          <InfoRow label="LP manager configured" value={DEX_CONTRACTS.lpManager || "No"} />
        </div>
        <div className="mt-6">
          <div style={{ color: "#8ca3b6", fontSize: 12, marginBottom: 10 }}>Custom token list</div>
          <div className="grid gap-2">
            {customTokens.length === 0 && <EmptyMessage message="No custom tokens added yet." compact />}
            {customTokens.map((token) => (
              <div key={token.symbol} className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,217,255,0.08)" }}>
                <div style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{token.symbol}</div>
                <div style={{ color: "#6f8699", fontSize: 12 }}>{token.address}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function SectionCard({ title, value, compact }: { title: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-[24px] p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,217,255,0.08)" }}>
      <div style={{ color: "#7b93a7", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "'Space Grotesk'" }}>{title}</div>
      <div style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontSize: compact ? 18 : 28, fontWeight: 900, marginTop: 10 }}>{value}</div>
    </div>
  );
}

function SwapPanel({
  label,
  token,
  amount,
  onAmount,
  onToken,
  tokens,
  balance,
  readOnly,
}: {
  label: string;
  token: ArcSwapToken;
  amount: string;
  onAmount: (value: string) => void;
  onToken: (token: ArcSwapToken) => void;
  tokens: ArcSwapToken[];
  balance: string;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-[26px] p-5 mt-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,217,255,0.08)" }}>
      <div className="flex items-center justify-between mb-3">
        <div style={{ color: "#8ca3b6", fontSize: 12 }}>{label}</div>
        <div style={{ color: "#7dd3fc", fontSize: 12 }}>Balance: {balance}</div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <input
          value={amount}
          readOnly={readOnly}
          onChange={(event) => onAmount(event.target.value)}
          className="flex-1 bg-transparent text-[2rem] font-black outline-none"
          style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'" }}
          placeholder="0.0"
        />
        <div className="md:w-56 flex items-center gap-3 rounded-2xl px-3 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.1)" }}>
          <img src={token.icon} alt={token.symbol} className="w-10 h-10 rounded-full object-contain bg-white/90 p-1.5 shrink-0" />
          <select value={token.symbol} onChange={(event) => onToken(tokens.find((item) => item.symbol === event.target.value) || token)} className="flex-1 bg-transparent px-0 py-0 rounded-none border-0 focus:shadow-none">
            {tokens.map((item) => (
              <option key={item.symbol} value={item.symbol}>{item.symbol}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,217,255,0.08)" }}>
      <div style={{ color: "#7b93a7", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "'Space Grotesk'" }}>{label}</div>
      <div style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 800, marginTop: 8, wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}

function ActivityRow({ item }: { item: DexTransaction }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,217,255,0.08)" }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{item.title}</div>
          <div style={{ color: "#7b93a7", fontSize: 12, marginTop: 6 }}>{item.details}</div>
        </div>
        <div style={{ color: item.status === "confirmed" ? "#22c55e" : item.status === "failed" ? "#ef4444" : "#f59e0b", fontSize: 12, textTransform: "uppercase" }}>{item.status}</div>
      </div>
      {item.hash && <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 10, wordBreak: "break-all" }}>{item.hash}</div>}
    </div>
  );
}

function EmptyMessage({ message, compact }: { message: string; compact?: boolean }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(148,217,255,0.14)", color: "#7b93a7", fontSize: compact ? 12 : 13 }}>
      {message}
    </div>
  );
}
