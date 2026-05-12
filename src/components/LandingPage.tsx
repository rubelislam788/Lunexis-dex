// src/components/LandingPage.tsx
"use client";

import type { Page } from "@/types";

interface LandingPageProps {
  onNavigate: (page: Page) => void;
}

const STATS = [
  { icon: "rocket_launch", color: "#00dce5", label: "Total Missions", value: "1,204,592", tag: "STAT_01" },
  { icon: "currency_exchange", color: "#ebb2ff", label: "Total Rewards Paid", value: "4,821.40 ETH", tag: "STAT_02" },
  { icon: "shield_person", color: "#00dce5", label: "Active Operators", value: "84,931", tag: "STAT_03" },
];

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <main className="relative pt-16 min-h-screen overflow-hidden hero-bg">
      {/* Scanline + grid */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden scanline opacity-20" />
      <div className="absolute inset-0 z-0 grid-bg" />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-8 text-center" style={{ minHeight: "80vh" }}>
        <div className="relative z-10 max-w-4xl mx-auto" style={{ paddingTop: 120, paddingBottom: 80 }}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 glass-panel rounded-full" style={{ borderColor: "rgba(0,220,229,0.25)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#00dce5", boxShadow: "0 0 8px rgba(0,220,229,0.8)" }} />
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#00dce5" }}>
              NETWORK OPERATIONAL: V2.0.4
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: "clamp(36px,6vw,64px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.025em", color: "#e9feff", marginBottom: 24 }}>
            The Hub of{" "}
            <span className="gradient-text">Web3 Exploration.</span>
          </h1>

          <p style={{ fontSize: 18, lineHeight: 1.6, color: "#b9caca", maxWidth: 600, margin: "0 auto 40px" }}>
            Deploy your expertise into the most advanced cryptographic questing protocol.
            Track, earn, and dominate the decentralized frontier.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              className="btn-primary px-10 py-4 rounded-lg glow-cyan"
              style={{ fontSize: 13, minWidth: 220 }}
              onClick={() => onNavigate("missions")}
            >
              Connect Wallet to Start
            </button>
            <button
              className="btn-ghost px-10 py-4 rounded-lg"
              style={{ fontSize: 13, minWidth: 220 }}
              onClick={() => onNavigate("missions")}
            >
              View Missions
            </button>
          </div>

          {/* Swap/Bridge quick links */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => onNavigate("swap")}
              className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
              style={{
                background: "rgba(0,220,229,0.08)",
                border: "1px solid rgba(0,220,229,0.25)",
                color: "#00dce5",
                fontFamily: "'Space Grotesk'",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ⇄ Swap Tokens
            </button>
            <button
              onClick={() => onNavigate("bridge")}
              className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
              style={{
                background: "rgba(182,0,248,0.08)",
                border: "1px solid rgba(182,0,248,0.25)",
                color: "#ebb2ff",
                fontFamily: "'Space Grotesk'",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🌉 Bridge USDC
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-8 pb-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {STATS.map(({ icon, color, label, value, tag }) => (
            <div
              key={tag}
              className="glass-panel p-6 rounded-xl"
              style={{ borderLeft: `4px solid ${color}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="material-symbols-outlined" style={{ fontSize: 28, color }}>
                  {icon}
                </span>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, letterSpacing: "0.1em", color: `${color}66` }}>
                  {tag}
                </span>
              </div>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#849495", marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 26, fontWeight: 700, color: "#e5e2e3" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature highlights */}
      <section className="px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "⇄",
                title: "Swap Tokens",
                desc: "Exchange USDC and EURC on Arc Testnet via Circle Arc App Kit SDK. Zero routing complexity.",
                color: "#00dce5",
                page: "swap" as Page,
                cta: "Open Swap →",
              },
              {
                icon: "🌉",
                title: "Bridge USDC",
                desc: "Move native USDC cross-chain using Circle CCTP v2. No wrapped tokens, no trust assumptions.",
                color: "#ebb2ff",
                page: "bridge" as Page,
                cta: "Open Bridge →",
              },
              {
                icon: "🏆",
                title: "Quest & Earn",
                desc: "Complete on-chain missions, earn ARCQ rewards, and climb the leaderboard.",
                color: "#00dce5",
                page: "missions" as Page,
                cta: "View Quests →",
              },
            ].map(({ icon, title, desc, color, page, cta }) => (
              <div
                key={title}
                className="glass-panel p-6 rounded-xl transition-all cursor-pointer"
                style={{ borderTop: `2px solid ${color}22` }}
                onClick={() => onNavigate(page)}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderTopColor = color)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderTopColor = `${color}22`)}
              >
                <div style={{ fontSize: 32, marginBottom: 16 }}>{icon}</div>
                <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 700, color: "#e5e2e3", marginBottom: 8 }}>
                  {title}
                </h3>
                <p style={{ fontSize: 14, color: "#849495", lineHeight: 1.6, marginBottom: 16 }}>{desc}</p>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 700, color, letterSpacing: "0.05em" }}>
                  {cta}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
