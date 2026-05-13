// src/components/layout/Header.tsx
"use client";

import dynamic from "next/dynamic";
import FaucetButton from "@/components/ui/FaucetButton";
import ArcLogo from "@/components/ui/ArcLogo";
import type { Page } from "@/types";

const ArcSwapConnectButton = dynamic(() => import("@/components/arc-swap/ArcSwapConnectButton"), { ssr: false });

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  showSidebar: boolean;
  isOverlaySidebar: boolean;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

const NAV_LINKS: Array<{ label: string; page: Page }> = [
  { label: "Missions", page: "missions" },
  { label: "Leaderboard", page: "leaderboard" },
  { label: "Rewards", page: "rewards" },
  { label: "Stats", page: "stats" },
];

export default function Header({ currentPage, onNavigate, showSidebar, isOverlaySidebar, sidebarOpen, sidebarCollapsed, onToggleSidebar }: HeaderProps) {
  return (
    <header
      className="fixed top-0 w-full z-50 flex justify-between items-center px-3 sm:px-6 h-16 border-b"
      style={{
        background: "linear-gradient(90deg, rgba(2,4,10,0.88), rgba(6,20,40,0.76), rgba(2,4,10,0.88))",
        backdropFilter: "blur(22px)",
        borderColor: "rgba(148,217,255,0.16)",
        boxShadow: "0 14px 44px rgba(0,0,0,0.32)",
      }}
    >
      <div className="flex items-center gap-3 lg:gap-8 min-w-0">
        {showSidebar && (
          <button onClick={onToggleSidebar} className="arc-icon-action w-10 h-10 rounded-2xl flex-shrink-0" aria-label="Toggle sidebar">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {isOverlaySidebar ? (sidebarOpen ? "close" : "menu") : sidebarCollapsed ? "menu_open" : "dock_to_left"}
            </span>
          </button>
        )}

        <button onClick={() => onNavigate("landing")} className="bg-transparent border-none p-0 cursor-pointer min-w-0">
          <div className="hidden sm:block">
            <ArcLogo size={40} />
          </div>
          <div className="sm:hidden">
            <ArcLogo size={38} compact />
          </div>
        </button>

        <nav className="hidden xl:flex items-center gap-6">
          {NAV_LINKS.map(({ label, page }) => (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className="transition-colors"
              style={{
                fontFamily: "'Space Grotesk'",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: currentPage === page ? "#00dce5" : "#8a9494",
                borderBottom: currentPage === page ? "2px solid #00dce5" : "2px solid transparent",
                paddingBottom: 4,
                background: "none",
                border: "none",
                borderBottomWidth: 2,
                borderBottomStyle: "solid",
                borderBottomColor: currentPage === page ? "#00dce5" : "transparent",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}

          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)", display: "inline-block" }} />

          <button
            onClick={() => onNavigate("swap")}
            className="flex items-center gap-2 transition-all"
            style={{
              fontFamily: "'Space Grotesk'",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "5px 14px",
              borderRadius: 99,
              background: currentPage === "swap" ? "rgba(0,220,229,0.25)" : "rgba(0,220,229,0.1)",
              border: `1px solid ${currentPage === "swap" ? "rgba(0,220,229,0.6)" : "rgba(0,220,229,0.35)"}`,
              color: "#00dce5",
              boxShadow: currentPage === "swap" ? "0 0 16px rgba(0,220,229,0.3)" : "none",
              cursor: "pointer",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 4.5H12M12 4.5L9.5 2M12 4.5L9.5 7" stroke="#00dce5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 9.5H2M2 9.5L4.5 7M2 9.5L4.5 12" stroke="#00dce5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Swap
          </button>

          <button
            onClick={() => onNavigate("bridge")}
            className="flex items-center gap-2 transition-all"
            style={{
              fontFamily: "'Space Grotesk'",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "5px 14px",
              borderRadius: 99,
              background: currentPage === "bridge" ? "rgba(182,0,248,0.25)" : "rgba(182,0,248,0.1)",
              border: `1px solid ${currentPage === "bridge" ? "rgba(182,0,248,0.6)" : "rgba(182,0,248,0.35)"}`,
              color: "#ebb2ff",
              boxShadow: currentPage === "bridge" ? "0 0 16px rgba(182,0,248,0.3)" : "none",
              cursor: "pointer",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 7H13M7 1L13 7L7 13" stroke="#ebb2ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Bridge
          </button>
          <FaucetButton label="Faucet" compact />
        </nav>
      </div>

      <ArcSwapConnectButton />
    </header>
  );
}
