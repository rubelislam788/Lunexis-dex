"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useArcDexStore } from "@/hooks/useArcDexStore";
import { useToast } from "@/components/ui/Toast";
import { ARC_CHAIN_ID, DEX_CONTRACTS, type ArcSwapToken } from "@/lib/arc-dex";

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
      addToken({
        symbol: form.symbol.toUpperCase(),
        name: form.name,
        address: form.address ? (form.address as `0x${string}`) : undefined,
        decimals: Number(form.decimals),
        accent: form.accent,
        icon: form.icon,
        chainId: ARC_CHAIN_ID,
      } satisfies ArcSwapToken);
      show(`Added ${form.symbol.toUpperCase()} to token list`, "success");
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
          </section>

          <section className="arc-card rounded-3xl p-6">
            <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff", marginBottom: 16 }}>Analytics Overview</h2>
            <div className="grid gap-3">
              <InfoRow label="Connected wallet" value={address || "Not connected"} />
              <InfoRow label="Router configured" value={DEX_CONTRACTS.swapRouter || "Missing"} />
              <InfoRow label="Bridge configured" value={DEX_CONTRACTS.bridge || "Missing"} />
              <InfoRow label="LP manager configured" value={DEX_CONTRACTS.lpManager || "Missing"} />
              <InfoRow label="Custom tokens" value={`${store.customTokens.length}`} />
              <InfoRow label="Swap status" value={store.swapPaused ? "Paused" : "Active"} />
            </div>

            <div className="mt-6">
              <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 900, color: "#f8fbff", marginBottom: 12 }}>Token Registry</h3>
              <div className="grid gap-2">
                {store.customTokens.length === 0 && (
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)", color: "#849495", fontSize: 13 }}>
                    No admin-added tokens yet.
                  </div>
                )}
                {store.customTokens.map((token) => (
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
