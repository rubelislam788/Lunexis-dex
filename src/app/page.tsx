// src/app/page.tsx
"use client";

import { useState } from "react";
import type { Page } from "@/types";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import LandingPage from "@/components/LandingPage";
import MissionsPage from "@/components/MissionsPage";
import SwapPage from "@/components/swap/SwapPage";
import BridgePage from "@/components/bridge/BridgePage";

const PAGES_WITH_SIDEBAR: Page[] = ["missions", "quest-detail", "leaderboard", "rewards", "stats", "swap", "bridge"];

// Placeholder pages for routes not fully built
function PlaceholderPage({ title, onNavigate }: { title: string; onNavigate: (p: Page) => void }) {
  return (
    <div className="min-h-screen pt-16 pl-64 flex items-center justify-center" style={{ background: "#131314" }}>
      <div className="text-center">
        <div style={{ fontFamily: "'Space Grotesk'", fontSize: 48, fontWeight: 900, color: "#00dce5", marginBottom: 16 }}>
          {title}
        </div>
        <p style={{ color: "#849495", marginBottom: 24 }}>This page is under construction.</p>
        <button
          onClick={() => onNavigate("missions")}
          className="btn-outline-cyan px-6 py-3 rounded-lg text-sm"
        >
          ← Back to Missions
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>("landing");

  const navigate = (page: Page) => setCurrentPage(page);
  const showSidebar = PAGES_WITH_SIDEBAR.includes(currentPage);

  return (
    <>
      <Header currentPage={currentPage} onNavigate={navigate} />
      <Sidebar currentPage={currentPage} onNavigate={navigate} show={showSidebar} />

      <div>
        {currentPage === "landing" && <LandingPage onNavigate={navigate} />}
        {currentPage === "missions" && <MissionsPage onNavigate={navigate} />}
        {currentPage === "swap" && <SwapPage />}
        {currentPage === "bridge" && <BridgePage />}
        {currentPage === "leaderboard" && <PlaceholderPage title="Leaderboard" onNavigate={navigate} />}
        {currentPage === "rewards" && <PlaceholderPage title="Rewards" onNavigate={navigate} />}
        {currentPage === "stats" && <PlaceholderPage title="Stats" onNavigate={navigate} />}
        {currentPage === "quest-detail" && <PlaceholderPage title="Quest Detail" onNavigate={navigate} />}
      </div>

      {/* Footer */}
      {showSidebar && (
        <footer
          className="py-8 px-12 flex justify-between items-center border-t"
          style={{
            marginLeft: "16rem",
            background: "#000",
            borderColor: "rgba(255,255,255,0.05)",
          }}
        >
          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#444" }}>
            © 2025 ARC QUEST OPS. ALL SYSTEMS OPERATIONAL.
          </p>
          <div className="flex gap-8">
            {["Protocols", "Security", "Terminal"].map((link) => (
              <a
                key={link}
                href="#"
                style={{ fontFamily: "'Space Grotesk'", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#444" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#00dce5")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#444")}
              >
                {link}
              </a>
            ))}
          </div>
        </footer>
      )}
    </>
  );
}
