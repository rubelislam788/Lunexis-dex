// src/components/layout/Sidebar.tsx
"use client";

import type { Page } from "@/types";
import { useProfile } from "@/hooks/useProfile";
import FaucetButton from "@/components/ui/FaucetButton";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  show: boolean;
  isOverlaySidebar: boolean;
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

const SIDE_LINKS: Array<{ label: string; page: Page; icon: string }> = [
  { label: "Overview", page: "stats", icon: "grid_view" },
  { label: "Missions", page: "missions", icon: "assignment_turned_in" },
  { label: "Leaderboard", page: "leaderboard", icon: "leaderboard" },
  { label: "Rewards", page: "rewards", icon: "workspace_premium" },
  { label: "Swap", page: "swap", icon: "swap_horiz" },
  { label: "Profile", page: "profile", icon: "account_circle" },
];

export default function Sidebar({
  currentPage,
  onNavigate,
  show,
  isOverlaySidebar,
  isOpen,
  isCollapsed,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const { profile, address } = useProfile();
  if (!show) return null;

  const showLabels = !isCollapsed || isOverlaySidebar;

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    if (isOverlaySidebar) onCloseMobile();
  };

  return (
    <>
      {isOverlaySidebar && isOpen && <button className="arc-sidebar-backdrop" aria-label="Close sidebar" onClick={onCloseMobile} />}
      <aside
        className={`arc-sidebar-shell ${isOverlaySidebar ? "arc-sidebar-overlay" : ""} ${isOpen ? "is-open" : ""} ${isCollapsed && !isOverlaySidebar ? "is-collapsed" : ""}`}
      >
        <div className="arc-sidebar-header">
          <div className="arc-sidebar-brand-row arc-sidebar-control-row">
            <button onClick={isOverlaySidebar ? onCloseMobile : onToggleCollapse} className="arc-sidebar-plain arc-sidebar-menu" aria-label={isOverlaySidebar ? "Close sidebar" : "Collapse sidebar"}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {isOverlaySidebar ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        <nav className="arc-sidebar-nav">
          {SIDE_LINKS.map(({ label, page, icon }, index) => {
            const active = currentPage === page || (currentPage === "quest-detail" && page === "missions");
            return (
              <button key={page} onClick={() => handleNavigate(page)} className={`arc-sidebar-plain arc-sidebar-nav-item ${active ? "is-active" : ""}`}>
                <span className="material-symbols-outlined arc-sidebar-nav-icon">{icon}</span>
                {showLabels && <span className="arc-sidebar-nav-label">{label}</span>}
                {showLabels && index === 1 && <span className="arc-sidebar-badge">4</span>}
                {showLabels && index === 3 && <span className="arc-sidebar-badge is-new">New</span>}
              </button>
            );
          })}
        </nav>

        <div className="arc-sidebar-spacer" />

        {showLabels && (
          <div className="arc-sidebar-faucet">
            <FaucetButton label="Faucet" compact />
          </div>
        )}

        <button className="arc-sidebar-plain arc-sidebar-profile" onClick={() => handleNavigate("profile")}>
          <div className="arc-sidebar-avatar">
            {profile?.avatarDataUrl ? (
              <img src={profile.avatarDataUrl} alt="Arc operator" />
            ) : (
              <span>OP</span>
            )}
          </div>
          {showLabels && (
            <>
              <div className="arc-sidebar-profile-text">
                <strong>{profile?.username ?? "Operator 0117"}</strong>
                <span>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Profile not set"}</span>
              </div>
              <span className="material-symbols-outlined arc-sidebar-more">more_horiz</span>
            </>
          )}
        </button>
      </aside>
    </>
  );
}
