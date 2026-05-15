// src/components/layout/Header.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ArcLogo from "@/components/ui/ArcLogo";
import NotificationCenter from "@/components/ui/NotificationCenter";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import type { Page } from "@/types";

const ArcSwapConnectButton = dynamic<{ onProfile?: () => void }>(() => import("@/components/arc-swap/ArcSwapConnectButton"), { ssr: false });

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_LINKS: Array<{ label: string; page: Page }> = [
  { label: "Missions", page: "missions" },
  { label: "Leaderboard", page: "leaderboard" },
  { label: "Rewards", page: "rewards" },
  { label: "Stats", page: "stats" },
  { label: "Staking", page: "staking" },
];

export default function Header({ currentPage, onNavigate }: HeaderProps) {
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
        <nav className="arc-topbar-left hidden lg:flex items-center gap-2">
          {NAV_LINKS.map(({ label, page }) => (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={`arc-floating-nav-link ${currentPage === page ? "is-active" : ""}`}
              style={{
                fontFamily: "'Space Grotesk'",
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <button onClick={() => onNavigate("landing")} className="arc-floating-brand bg-transparent" aria-label="Go to home">
          <ArcLogo size={34} compact />
        </button>

        <div className="arc-topbar-right flex items-center gap-2">
          <NotificationCenter />
          <ThemeSwitcher />
          <button
            onClick={() => onNavigate("swap")}
            className={`arc-floating-action ${currentPage === "swap" ? "is-active" : ""}`}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 4.5H12M12 4.5L9.5 2M12 4.5L9.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 9.5H2M2 9.5L4.5 7M2 9.5L4.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">Swap</span>
          </button>

          <button
            onClick={() => onNavigate("profile")}
            className={`arc-floating-action ${currentPage === "profile" ? "is-active" : ""}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>account_circle</span>
            <span className="hidden sm:inline">Profile</span>
          </button>
          <div className="hidden xl:block arc-topbar-wallet-only">
            <ArcSwapConnectButton onProfile={() => onNavigate("profile")} />
          </div>
        </div>
      </div>
    </header>
  );
}
