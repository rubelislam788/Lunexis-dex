"use client";

import type { Page } from "@/types";

const MOBILE_TABS: Array<{ page: Page; label: string; icon: string }> = [
  { page: "landing", label: "Home", icon: "home" },
  { page: "swap", label: "Swap", icon: "swap_horiz" },
  { page: "bridge", label: "Bridge", icon: "account_tree" },
  { page: "staking", label: "Stake", icon: "lock_open" },
  { page: "profile", label: "Profile", icon: "account_circle" },
];

interface MobileBottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onToggleMenu: () => void;
  menuOpen: boolean;
}

export default function MobileBottomNav({ currentPage, onNavigate, onToggleMenu, menuOpen }: MobileBottomNavProps) {
  return (
    <nav className="lunexis-mobile-bottom-nav" aria-label="Mobile navigation">
      <button type="button" onClick={onToggleMenu} className={`lunexis-mobile-menu-tab ${menuOpen ? "is-active" : ""}`} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-pressed={menuOpen}>
        <span className="material-symbols-outlined">{menuOpen ? "close" : "menu"}</span>
        <small>Menu</small>
      </button>
      {MOBILE_TABS.map((tab) => {
        const active = currentPage === tab.page || (currentPage === "quest-detail" && tab.page === "missions");
        return (
          <button key={tab.page} type="button" onClick={() => onNavigate(tab.page)} className={active ? "is-active" : ""}>
            <span className="material-symbols-outlined">{tab.icon}</span>
            <small>{tab.label}</small>
          </button>
        );
      })}
    </nav>
  );
}
