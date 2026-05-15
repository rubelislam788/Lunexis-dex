"use client";

import type { Page } from "@/types";

const MOBILE_TABS: Array<{ page: Page; label: string; icon: string }> = [
  { page: "landing", label: "Home", icon: "home" },
  { page: "swap", label: "Swap", icon: "swap_horiz" },
  { page: "staking", label: "Stake", icon: "lock_open" },
  { page: "missions", label: "Missions", icon: "task_alt" },
  { page: "profile", label: "Profile", icon: "account_circle" },
];

export default function MobileBottomNav({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  return (
    <nav className="lunexis-mobile-bottom-nav" aria-label="Mobile navigation">
      {MOBILE_TABS.map((tab) => {
        const active = currentPage === tab.page || (currentPage === "quest-detail" && tab.page === "missions");
        return (
          <button key={tab.page} onClick={() => onNavigate(tab.page)} className={active ? "is-active" : ""}>
            <span className="material-symbols-outlined">{tab.icon}</span>
            <small>{tab.label}</small>
          </button>
        );
      })}
    </nav>
  );
}
