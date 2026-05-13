// src/components/layout/Sidebar.tsx
"use client";

import type { Page } from "@/types";
import { useProfile } from "@/hooks/useProfile";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  show: boolean;
}

const SIDE_LINKS: Array<{ label: string; page: Page; icon: string }> = [
  { label: "All Quests", page: "missions", icon: "grid_view" },
  { label: "Active", page: "quest-detail", icon: "rocket_launch" },
  { label: "Profile", page: "profile", icon: "account_circle" },
  { label: "Rewards", page: "rewards", icon: "workspace_premium" },
  { label: "Completed", page: "stats", icon: "verified" },
];

export default function Sidebar({ currentPage, onNavigate, show }: SidebarProps) {
  const { profile, address } = useProfile();
  if (!show) return null;

  return (
    <aside
      className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 flex flex-col pt-8 border-r z-40"
      style={{
        background: "linear-gradient(180deg, rgba(3,7,18,0.78), rgba(8,17,34,0.72))",
        backdropFilter: "blur(24px)",
        borderColor: "rgba(148,217,255,0.16)",
        boxShadow: "18px 0 54px rgba(0,0,0,0.3)",
      }}
    >
      {/* User profile */}
      <div className="px-6 mb-8">
        <div className="glass-panel p-3 rounded-xl flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#38bdf8,#ff2db2)", boxShadow: "0 0 22px rgba(56,189,248,0.28)" }}
          >
            {profile?.avatarDataUrl ? (
              <img src={profile.avatarDataUrl} alt="Arc operator" style={{ width: 28, height: 28, borderRadius: 999, objectFit: "cover" }} />
            ) : (
              <span style={{ color: "white", fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900 }}>OP</span>
            )}
          </div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#00dce5" }}>
              {profile?.username ?? "OPERATOR_01"}
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#555" }}>
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Tier: Orbital Elite"}
            </div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-1">
        {SIDE_LINKS.map(({ label, page, icon }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className="flex items-center gap-3 px-6 py-4 cursor-pointer transition-all text-left"
            style={{
              fontFamily: "'Space Grotesk'",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: currentPage === page ? "#00dce5" : "#555",
              background: currentPage === page ? "rgba(0,220,229,0.1)" : "transparent",
              borderRight: currentPage === page ? "4px solid #00dce5" : "4px solid transparent",
              border: "none",
              borderRightWidth: 4,
              borderRightStyle: "solid",
              borderRightColor: currentPage === page ? "#00dce5" : "transparent",
              cursor: "pointer",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {icon}
            </span>
            {label}
          </button>
        ))}

        {/* Bridge shortcut */}
        <button
          onClick={() => onNavigate("bridge")}
          className="flex items-center gap-3 px-6 py-4 cursor-pointer transition-all text-left"
          style={{
            fontFamily: "'Space Grotesk'",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: currentPage === "bridge" ? "#ebb2ff" : "#555",
            background: currentPage === "bridge" ? "rgba(182,0,248,0.1)" : "transparent",
            border: "none",
            borderRightWidth: 4,
            borderRightStyle: "solid",
            borderRightColor: currentPage === "bridge" ? "#b600f8" : "transparent",
            cursor: "pointer",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>swap_horiz</span>
          Bridge USDC
        </button>
      </nav>

      {/* Sync button */}
      <div className="p-6">
        <button
          className="w-full py-3 flex items-center justify-center gap-2 rounded-xl transition-all"
          style={{
            border: "1px solid rgba(0,220,229,0.3)",
            color: "#00dce5",
            fontFamily: "'Space Grotesk'",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            background: "transparent",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,220,229,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sync</span>
          Sync Quests
        </button>
      </div>
    </aside>
  );
}
