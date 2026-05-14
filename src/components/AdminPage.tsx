"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useArcDexStore } from "@/hooks/useArcDexStore";
import { useToast } from "@/components/ui/Toast";
import { ARC_CHAIN_ID, ARC_SWAP_TOKENS, DEX_CONTRACTS, type ArcSwapToken } from "@/lib/arc-dex";

const CONFIG_ROWS = [
  { label: "ARC token", value: process.env.NEXT_PUBLIC_ARC_TOKEN_ADDRESS || "0x6a801562296A1Dbc9244ca3764981D21A22974d6" },
  { label: "WETH token", value: process.env.NEXT_PUBLIC_WETH_ARC_ADDRESS || "0x7E24AF6B090871ebbD60f57BA0A09F27db898640" },
  { label: "USDC token", value: process.env.NEXT_PUBLIC_USDC_ARC_ADDRESS || "0x3600000000000000000000000000000000000000" },
  { label: "EURC token", value: process.env.NEXT_PUBLIC_EURC_ARC_ADDRESS || "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" },
];

export default function AdminPage() {
  const { address } = useAccount();
  const { store, addToken, toggleSwapPaused } = useArcDexStore();
  const { show, ToastContainer } = useToast();
  const [form, setForm] = useState({
    symbol: "",
    name: "",
    address: "",
    decimals: "18",
    accent: "#8b5cf6",
    icon: "/arc-assets/arc.jpg",
  });

  const submit = () => {
    try {
      const symbol = form.symbol.trim().toUpperCase();
      const name = form.name.trim();
      addToken({
        symbol,
        name,
        address: form.address ? (form.address as `0x${string}`) : undefined,
        decimals: Number(form.decimals),
        accent: form.accent,
        icon: form.icon,
        chainId: ARC_CHAIN_ID,
      } satisfies ArcSwapToken);
      show(`Added ${symbol} to token list`, "success");
      setForm({ symbol: "", name: "", address: "", decimals: "18", accent: "#8b5cf6", icon: "/arc-assets/arc.jpg" });
    } catch (error: any) {
      show(error?.message || "Could not add token", "error");
    }
  };

  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <ToastContainer />
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
          <section className="arc-card rounded-3xl p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 30, fontWeight: 900, color: "#f8fbff" }}>Admin Panel</h1>
                <p style={{ color: "#849495", marginTop: 8 }}>Manage token visibility, swap status, and deployment configuration.</p>
              </div>
              <button className={store.swapPaused ? "btn-primary px-4 py-3 rounded-xl" : "btn-ghost px-4 py-3 rounded-xl"} onClick={toggleSwapPaused}>
                {store.swapPaused ? "Resume Swap" : "Pause Swap"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })} className="px-4 py-3 rounded-xl" placeholder="Token Symbol" />
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="px-4 py-3 rounded-xl" placeholder="Token Name" />
              <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="px-4 py-3 rounded-xl md:col-span-2" placeholder="0x..." />
              <input value={form.decimals} onChange={(event) => setForm({ ...form, decimals: event.target.value })} className="px-4 py-3 rounded-xl" placeholder="Decimals" />
              <input value={form.accent} onChange={(event) => setForm({ ...form, accent: event.target.value })} className="px-4 py-3 rounded-xl" placeholder="Accent Color" />
            </div>

            <button className="btn-primary w-full py-3 rounded-xl mt-4" onClick={submit}>Add Token</button>

            <div className="mt-6 rounded-2xl p-4" style={{ background: DEX_CONTRACTS.swapRouter ? "rgba(34,197,94,0.08)" : "rgba(255,45,178,0.08)", border: `1px solid ${DEX_CONTRACTS.swapRouter ? "rgba(34,197,94,0.2)" : "rgba(255,45,178,0.2)"}` }}>
              <div style={{ color: DEX_CONTRACTS.swapRouter ? "#86efac" : "#ffb7eb", fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {DEX_CONTRACTS.swapRouter ? "Uniswap V2 Router Ready" : "Uniswap V2 Router Missing"}
              </div>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>
                ARC/WETH, WETH/USDC, and WETH/EURC swaps need `NEXT_PUBLIC_ARC_SWAP_ROUTER_ADDRESS` in Vercel. Token addresses are configured, but the Uniswap V2 router and liquidity must exist before WETH pairs can execute.
              </p>
            </div>
          </section>

          <section className="arc-card rounded-3xl p-6">
            <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff", marginBottom: 16 }}>Analytics Overview</h2>
            <div className="grid gap-3">
              <InfoRow label="Connected wallet" value={address || "Not connected"} />
              <InfoRow label="Factory configured" value={DEX_CONTRACTS.swapFactory || "Missing"} />
              <InfoRow label="Router configured" value={DEX_CONTRACTS.swapRouter || "Missing"} />
              <InfoRow label="Bridge configured" value={DEX_CONTRACTS.bridge || "Missing"} />
              <InfoRow label="Liquidity manager" value={DEX_CONTRACTS.swapRouter ? "Uniswap V2 Router02" : DEX_CONTRACTS.lpManager || "Missing"} />
              <InfoRow label="Custom tokens" value={`${store.customTokens.length}`} />
              <InfoRow label="Swap status" value={store.swapPaused ? "Paused" : "Active"} />
            </div>

            <div className="mt-6">
              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 900, color: "#f8fbff", marginBottom: 12 }}>Configured Token Addresses</h3>
              <div className="grid gap-2 mb-5">
                {CONFIG_ROWS.map((row) => (
                  <InfoRow key={row.label} label={row.label} value={row.value} />
                ))}
              </div>

              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 900, color: "#f8fbff", marginBottom: 12 }}>Visible Swap Tokens</h3>
              <div className="grid gap-2 mb-5">
                {ARC_SWAP_TOKENS.filter((token) => token.address || token.isNative).map((token) => (
                  <div key={token.symbol} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{token.symbol} - {token.name}</div>
                    <div style={{ color: "#849495", fontSize: 12, wordBreak: "break-all" }}>{token.address ?? "Native gas token"}</div>
                  </div>
                ))}
              </div>

              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 900, color: "#f8fbff", marginBottom: 12 }}>Admin-Added Tokens</h3>
              <div className="grid gap-2">
                {store.customTokens.length === 0 && (
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)", color: "#849495", fontSize: 13 }}>
                    No admin-added tokens yet.
                  </div>
                )}
                {store.customTokens.filter((token) => token.symbol && token.name).map((token) => (
                  <div key={token.symbol} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{token.symbol}</div>
                    <div style={{ color: "#849495", fontSize: 12 }}>{token.address}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ color: "#849495", fontSize: 11, fontFamily: "'Space Grotesk'", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontWeight: 800, fontSize: 13, marginTop: 6, wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}
