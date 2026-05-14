"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Page } from "@/types";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import LandingPage from "@/components/LandingPage";
import MissionsPage, { QUESTS } from "@/components/MissionsPage";
import QuestDetailPage from "@/components/QuestDetailPage";
import SwapPage from "@/components/swap/SwapPage";
import ProfilePage from "@/components/ProfilePage";
import RewardsPage from "@/components/RewardsPage";
import LeaderboardPage from "@/components/LeaderboardPage";
import StatsPage from "@/components/StatsPage";

export const dynamic = "force-dynamic";

const PAGES_WITH_SIDEBAR: Page[] = ["missions", "quest-detail", "leaderboard", "rewards", "stats", "swap", "profile"];

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>("landing");
  const [selectedQuestId, setSelectedQuestId] = useState<string>("q2");
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

  const selectQuest = (questId: string) => {
    setSelectedQuestId(questId);
    setCurrentPage("quest-detail");
    if (isOverlaySidebar) setSidebarOpen(false);
  };

  const showSidebar = PAGES_WITH_SIDEBAR.includes(currentPage);
  const selectedQuest = QUESTS.find((quest) => quest.id === selectedQuestId);
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

      {showSidebar && (
        <footer
          className="arc-footer-shell py-8 px-6 md:px-12 flex flex-col gap-4 md:flex-row md:justify-between md:items-center border-t"
          style={{
            background: "#000",
            borderColor: "rgba(255,255,255,0.05)",
          }}
        >
          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#444" }}>
            (C) 2026 ARC SWAP. ARC CHAIN OPERATOR SURFACE.
          </p>
          <div className="flex gap-5 md:gap-8">
            {["Protocols", "Security", "Status"].map((link) => (
              <a
                key={link}
                href="#"
                style={{ fontFamily: "'Space Grotesk'", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#444" }}
                onMouseEnter={(event) => ((event.currentTarget as HTMLElement).style.color = "#00dce5")}
                onMouseLeave={(event) => ((event.currentTarget as HTMLElement).style.color = "#444")}
              >
                {link}
              </a>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
