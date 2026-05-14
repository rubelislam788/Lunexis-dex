// src/components/layout/Sidebar.tsx
"use client";

import type { Page } from "@/types";
import { useProfile } from "@/hooks/useProfile";
import ArcLogo from "@/components/ui/ArcLogo";

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
  { label: "Missions", page: "missions", icon: "grid_view" },
  { label: "Leaderboard", page: "leaderboard", icon: "leaderboard" },
  { label: "Rewards", page: "rewards", icon: "workspace_premium" },
  { label: "Stats", page: "stats", icon: "query_stats" },
  { label: "Profile", page: "profile", icon: "account_circle" },
  { label: "Swap", page: "swap", icon: "swap_horiz" },
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
        <div className="px-4 pt-5 pb-4 border-b" style={{ borderColor: "rgba(148,217,255,0.12)" }}>
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => handleNavigate("landing")} className="text-left bg-transparent border-none p-0 cursor-pointer">
              <ArcLogo size={44} compact={!showLabels} />
            </button>
            <button onClick={isOverlaySidebar ? onCloseMobile : onToggleCollapse} className="arc-icon-action w-10 h-10 rounded-full" aria-label={isOverlaySidebar ? "Close sidebar" : "Collapse sidebar"}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {isOverlaySidebar ? "close" : isCollapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}
              </span>
            </button>
          </div>
        </div>

        <div className="px-4 py-5">
          <div className="glass-panel rounded-2xl p-3 flex items-center gap-3" style={{ justifyContent: showLabels ? "flex-start" : "center" }}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: "linear-gradient(135deg,#38bdf8,#ff2db2)", boxShadow: "0 0 22px rgba(56,189,248,0.28)" }}
            >
              {profile?.avatarDataUrl ? (
                <img src={profile.avatarDataUrl} alt="Arc operator" style={{ width: 40, height: 40, objectFit: "cover" }} />
              ) : (
                <span style={{ color: "white", fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900 }}>OP</span>
              )}
            </div>
            {showLabels && (
              <div className="min-w-0">
                <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#00dce5" }}>
                  {profile?.username ?? "OPERATOR_01"}
                </div>
                <div style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#555", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Tier: Orbital Elite"}
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-2 px-3">
          {SIDE_LINKS.map(({ label, page, icon }) => {
            const active = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => handleNavigate(page)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all text-left"
                style={{
                  fontFamily: "'Space Grotesk'",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: active ? "#DFF9FF" : "#8BA6BB",
                  background: active ? "linear-gradient(145deg, rgba(56,189,248,0.14), rgba(255,45,178,0.08))" : "transparent",
                  border: `1px solid ${active ? "rgba(56,189,248,0.32)" : "transparent"}`,
                  justifyContent: showLabels ? "flex-start" : "center",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: active ? "#38BDF8" : "#6E8698" }}>
                  {icon}
                </span>
                {showLabels && label}
              </button>
            );
          })}
        </nav>

        {showLabels && (
          <div className="p-4">
            <button className="btn-primary w-full py-3 rounded-full flex items-center justify-center gap-2" onClick={() => handleNavigate("profile")}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
              Profile
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
