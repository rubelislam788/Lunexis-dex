// src/components/LandingPage.tsx
"use client";

import type { Page } from "@/types";
import { useAppStats } from "@/hooks/useAppStats";
import FaucetButton from "@/components/ui/FaucetButton";

interface LandingPageProps {
  onNavigate: (page: Page) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const stats = useAppStats();
  const liveStats = [
    { icon: "rocket_launch", color: "#00dce5", label: "Verified Missions", value: stats.missionsCompleted.toLocaleString(), tag: "LIVE_01" },
    { icon: "currency_exchange", color: "#3d6aff", label: "Rewards Claimed", value: `${stats.rewardsClaimed.toLocaleString()} points`, tag: "LIVE_02" },
    { icon: "shield_person", color: "#8b5cf6", label: "Arc Block", value: stats.arcBlock, tag: "LIVE_03" },
  ];

  return (
    <main className="arc-home-shimmer relative pt-16 min-h-screen overflow-hidden hero-bg">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden scanline opacity-20" />
      <div className="absolute inset-0 z-0 grid-bg" />
      <span className="arc-floating-orb" style={{ width: 260, height: 260, left: "7%", top: "18%", background: "rgba(56,189,248,0.13)" }} />
      <span className="arc-floating-orb" style={{ width: 220, height: 220, right: "9%", top: "28%", background: "rgba(255,45,178,0.12)", animationDelay: "1.2s" }} />

      <section className="relative flex flex-col items-center justify-center px-6 sm:px-8 text-center" style={{ minHeight: "80vh" }}>
        <div className="relative z-10 max-w-5xl mx-auto arc-fade-up" style={{ paddingTop: 112, paddingBottom: 72 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 glass-panel rounded-full" style={{ borderColor: "rgba(0,220,229,0.25)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#00dce5", boxShadow: "0 0 8px rgba(0,220,229,0.8)" }} />
            <span className="arc-shimmer-text" style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#00dce5" }}>
              NETWORK OPERATIONAL: V2.0.4
            </span>
          </div>

          <h1 className="arc-aurora-title" style={{ fontFamily: "'Space Grotesk'", fontSize: "clamp(36px,6vw,64px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: 0, color: "#e9feff", marginBottom: 24 }}>
            ARC Swap <span>Operator Control.</span>
            <span className="arc-title-aurora" aria-hidden="true">
              <span className="arc-title-aurora__item" />
              <span className="arc-title-aurora__item" />
              <span className="arc-title-aurora__item" />
              <span className="arc-title-aurora__item" />
            </span>
          </h1>

          <p style={{ fontSize: 18, lineHeight: 1.6, color: "#b9caca", maxWidth: 600, margin: "0 auto 40px" }}>
            A cleaner ARC Chain operator surface for live token swaps, mission verification, and wallet-based portfolio tracking.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="btn-primary px-10 py-4 rounded-lg glow-cyan" style={{ fontSize: 13, minWidth: 220 }} onClick={() => onNavigate("missions")}>
              <span className="arc-shimmer-text">Launch Operator Mode</span>
            </button>
            <button className="btn-ghost px-10 py-4 rounded-lg" style={{ fontSize: 13, minWidth: 220 }} onClick={() => onNavigate("missions")}>
              <span className="arc-shimmer-text">View Missions</span>
            </button>
            <FaucetButton label="Claim Faucet Tokens" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
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
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>swap_horiz</span>
              <span className="arc-shimmer-text">Swap Tokens</span>
            </button>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 sm:px-8 pb-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {liveStats.map(({ icon, color, label, value, tag }) => (
            <div key={tag} className="glass-panel arc-card p-6 rounded-xl" style={{ borderLeft: `4px solid ${color}` }}>
              <div className="flex items-center justify-between mb-4">
                <span className="material-symbols-outlined" style={{ fontSize: 28, color }}>
                  {icon}
                </span>
                <span className="arc-shimmer-text" style={{ fontFamily: "'Space Grotesk'", fontSize: 10, letterSpacing: "0.1em", color: `${color}66` }}>
                  {tag}
                </span>
              </div>
              <div className="arc-shimmer-text" style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#849495", marginBottom: 6 }}>
                {label}
              </div>
              <div className="arc-shimmer-text" style={{ fontFamily: "'Space Grotesk'", fontSize: 26, fontWeight: 700, color: "#e5e2e3" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-6 sm:px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "swap_horiz",
                title: "Swap Tokens",
                desc: "Exchange USDC and EURC with live balances, approvals, and wallet-confirmed execution.",
                color: "#00dce5",
                page: "swap" as Page,
                cta: "Open Swap",
              },
              {
                icon: "account_balance_wallet",
                title: "Live Portfolio",
                desc: "Track wallet balances, activity, rewards, and operator progress in one clean profile surface.",
                color: "#3d6aff",
                page: "profile" as Page,
                cta: "Open Profile",
              },
              {
                icon: "military_tech",
                title: "Quest & Earn",
                desc: "Complete on-chain missions, earn points, and climb the leaderboard.",
                color: "#8b5cf6",
                page: "missions" as Page,
                cta: "View Quests",
              },
            ].map(({ icon, title, desc, color, page, cta }) => (
              <div
                key={title}
                className="glass-panel arc-card p-6 rounded-xl transition-all cursor-pointer"
                style={{ borderTop: `2px solid ${color}22` }}
                onClick={() => onNavigate(page)}
                onMouseEnter={(event) => ((event.currentTarget as HTMLElement).style.borderTopColor = color)}
                onMouseLeave={(event) => ((event.currentTarget as HTMLElement).style.borderTopColor = `${color}22`)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 16, color, display: "inline-block" }}>{icon}</span>
                <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 700, color: "#e5e2e3", marginBottom: 8 }}>
                  {title}
                </h3>
                <p style={{ fontSize: 14, color: "#849495", lineHeight: 1.6, marginBottom: 16 }}>{desc}</p>
                <span className="arc-shimmer-text" style={{ fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 700, color, letterSpacing: "0.05em" }}>
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
