"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Page } from "@/types";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import LandingPage from "@/components/LandingPage";
import MissionsPage from "@/components/MissionsPage";
import QuestDetailPage from "@/components/QuestDetailPage";
import SwapPage from "@/components/swap/SwapPage";
import ProfilePage from "@/components/ProfilePage";
import RewardsPage from "@/components/RewardsPage";
import LeaderboardPage from "@/components/LeaderboardPage";
import StatsPage from "@/components/StatsPage";
import LunexisIntro from "@/components/ui/LunexisIntro";
import type { Quest } from "@/types";

export const dynamic = "force-dynamic";

const PAGES_WITH_SIDEBAR: Page[] = ["missions", "quest-detail", "leaderboard", "rewards", "stats", "swap", "profile"];

const SOCIAL_LINKS = [
  {
    label: "GitHub",
    href: "https://github.com/rubelislam788/arc_quest",
    social: "github",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.01c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18A10.9 10.9 0 0 1 12 6.18c.98 0 1.96.13 2.88.38 2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.08 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.03c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
      </svg>
    ),
  },
  {
    label: "Discord",
    href: "https://discord.com/tufan020/@me",
    social: "discord",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M19.54 5.34A16.86 16.86 0 0 0 15.36 4c-.18.32-.39.75-.53 1.09a15.7 15.7 0 0 0-4.66 0A11.3 11.3 0 0 0 9.63 4c-1.46.25-2.86.7-4.18 1.34-2.64 3.93-3.35 7.76-2.99 11.54A16.9 16.9 0 0 0 7.58 19.5c.41-.56.78-1.15 1.09-1.78-.6-.23-1.17-.5-1.71-.83.14-.1.28-.21.41-.32a12.08 12.08 0 0 0 10.26 0l.41.32c-.54.33-1.11.6-1.71.83.31.63.68 1.22 1.09 1.78a16.84 16.84 0 0 0 5.12-2.62c.42-4.38-.7-8.17-3-11.54ZM8.52 14.55c-1 0-1.82-.92-1.82-2.05s.8-2.05 1.82-2.05c1.01 0 1.84.92 1.82 2.05 0 1.13-.81 2.05-1.82 2.05Zm6.96 0c-1 0-1.82-.92-1.82-2.05s.81-2.05 1.82-2.05c1.02 0 1.84.92 1.82 2.05 0 1.13-.8 2.05-1.82 2.05Z" />
      </svg>
    ),
  },
  {
    label: "X",
    href: "https://x.com/rubelislam2023",
    social: "x",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M14.42 10.19 22.9 0h-2.01l-7.36 8.84L7.65 0H.87l8.89 13.35L.87 24h2.01l7.77-9.32L16.85 24h6.78l-9.21-13.81Zm-2.75 3.3-.9-1.33L3.6 1.56h3.08l5.79 8.56.9 1.33 7.52 11.11h-3.08l-6.14-9.07Z" />
      </svg>
    ),
  },
  {
    label: "Telegram",
    href: "https://t.me/robinkhan565",
    social: "telegram",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M22.26 3.1c.34-1.46-.52-2.03-1.52-1.63L2.34 8.56C1.08 9.05 1.1 9.73 2.12 10.04l4.72 1.47L17.77 4.6c.52-.32.99-.15.6.2l-8.86 8-.34 5.02c.5 0 .72-.23.99-.5l2.38-2.31 4.95 3.66c.91.5 1.57.24 1.8-.85l2.97-14.72Z" />
      </svg>
    ),
  },
];

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>("landing");
  const [selectedQuest, setSelectedQuest] = useState<Quest | undefined>();
  const [isOverlaySidebar, setIsOverlaySidebar] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const syncLayout = () => {
      const width = window.innerWidth;
      const nextOverlay = width < 1024;
      setIsOverlaySidebar(nextOverlay);
      setSidebarOpen(!nextOverlay);
      setSidebarCollapsed(width >= 1024 && width < 1280);
    };

    syncLayout();
    window.addEventListener("resize", syncLayout);
    return () => window.removeEventListener("resize", syncLayout);
  }, []);

  const navigate = (page: Page) => {
    setCurrentPage(page);
    if (isOverlaySidebar) setSidebarOpen(false);
  };

  const selectQuest = (quest: Quest) => {
    setSelectedQuest(quest);
    setCurrentPage("quest-detail");
    if (isOverlaySidebar) setSidebarOpen(false);
  };

  const showSidebar = PAGES_WITH_SIDEBAR.includes(currentPage);
  const sidebarOffset = showSidebar && !isOverlaySidebar ? (sidebarCollapsed ? "5.75rem" : "15rem") : "0rem";
  const appShellStyle = { ["--arc-sidebar-offset" as any]: sidebarOffset } as CSSProperties;

  const toggleSidebar = () => {
    if (!showSidebar) return;
    if (isOverlaySidebar) {
      setSidebarOpen((value) => !value);
      return;
    }
    setSidebarCollapsed((value) => !value);
  };

  return (
    <div className="arc-app-root" style={appShellStyle}>
      {currentPage === "landing" && <LunexisIntro />}
      <Header
        currentPage={currentPage}
        onNavigate={navigate}
        showSidebar={showSidebar}
        isOverlaySidebar={isOverlaySidebar}
        sidebarOpen={sidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        show={showSidebar}
        isOverlaySidebar={isOverlaySidebar}
        isOpen={isOverlaySidebar ? sidebarOpen : true}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <div>
        {currentPage === "landing" && <LandingPage onNavigate={navigate} />}
        {currentPage === "missions" && <MissionsPage onNavigate={navigate} onSelectQuest={selectQuest} />}
        {currentPage === "swap" && <SwapPage />}
        {currentPage === "leaderboard" && <LeaderboardPage />}
        {currentPage === "rewards" && <RewardsPage />}
        {currentPage === "stats" && <StatsPage />}
        {currentPage === "profile" && <ProfilePage />}
        {currentPage === "quest-detail" && <QuestDetailPage quest={selectedQuest} onNavigate={navigate} />}
      </div>

      <footer
        className="arc-footer-shell py-8 px-6 md:px-12 flex flex-col gap-4 md:flex-row md:justify-between md:items-center border-t"
        style={{
          background: "#000",
          borderColor: "rgba(255,255,255,0.05)",
        }}
      >
        <p style={{ fontFamily: "'Space Grotesk'", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#444" }}>
          (C) 2026 LUNEXIS. ARC CHAIN OPERATOR SURFACE.
        </p>
        <ul className="example-2 arc-social-icons" aria-label="Social links">
          {SOCIAL_LINKS.map((link) => (
            <li key={link.social} className="icon-content">
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                data-social={link.social}
                aria-label={link.label}
              >
                <span className="filled" />
                {link.icon}
              </a>
              <div className="tooltip">{link.label}</div>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
