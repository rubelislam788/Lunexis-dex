// src/components/layout/Header.tsx
"use client";

import { useEffect, useState } from "react";
import ArcLogo from "@/components/ui/ArcLogo";
import NotificationCenter from "@/components/ui/NotificationCenter";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import WalletButton from "@/components/ui/WalletButton";
import type { Page } from "@/types";

const TOP_NAV_ITEMS: Array<{ page: Page; label: string; icon: string }> = [
  { page: "missions", label: "Missions", icon: "assignment_turned_in" },
  { page: "leaderboard", label: "Leaderboard", icon: "leaderboard" },
  { page: "rewards", label: "Rewards", icon: "workspace_premium" },
  { page: "stats", label: "Stats", icon: "query_stats" },
  { page: "staking", label: "Stake", icon: "account_balance" },
  { page: "swap", label: "Swap", icon: "swap_horiz" },
];

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  sidebarAvailable: boolean;
}

export default function Header({ currentPage, onNavigate, onToggleSidebar, sidebarOpen, sidebarAvailable }: HeaderProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const nextY = window.scrollY;
      setHidden(nextY > 90 && nextY > lastY);
      lastY = nextY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (page: Page) => {
    onNavigate(page);
  };

  return (
    <header
      className="arc-topbar fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 pt-3 pointer-events-none"
      style={{
        transform: hidden ? "translateY(-110%)" : "translateY(0)",
        transition: "transform 0.28s ease, opacity 0.28s ease",
        opacity: hidden ? 0 : 1,
      }}
    >
      <div className="arc-floating-topbar pointer-events-auto">
        <div className="arc-topbar-left flex items-center gap-2">
          {sidebarAvailable ? (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={`arc-floating-menu-button ${sidebarOpen ? "is-active" : ""}`}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              aria-pressed={sidebarOpen}
            >
              <span className="hamburger-label" aria-hidden="true">
                <span className="line1" />
                <span className="line2" />
                <span className="line3" />
              </span>
            </button>
          ) : (
            <span className="arc-topbar-left-spacer" aria-hidden="true" />
          )}
          <nav className="arc-topbar-nav" aria-label="Primary navigation">
            {TOP_NAV_ITEMS.slice(0, 4).map((item) => (
              <button
                key={item.page}
                type="button"
                onClick={() => goTo(item.page)}
                className={`arc-floating-nav-link ${currentPage === item.page ? "is-active" : ""}`}
              >
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 15 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <button onClick={() => onNavigate("landing")} className="arc-floating-brand bg-transparent" aria-label="Go to home">
          <ArcLogo size={30} compact />
        </button>

        <div className="arc-topbar-right flex items-center gap-2">
          <nav className="arc-topbar-nav arc-topbar-nav-actions" aria-label="Trading navigation">
            {TOP_NAV_ITEMS.slice(4).map((item) => (
              <button
                key={item.page}
                type="button"
                onClick={() => goTo(item.page)}
                className={`arc-floating-nav-link ${currentPage === item.page ? "is-active" : ""}`}
              >
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 15 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <NotificationCenter />
          <ThemeSwitcher />
          <div className="arc-topbar-wallet">
            <WalletButton onNavigate={goTo} />
          </div>
        </div>
      </div>
    </header>
  );
}
