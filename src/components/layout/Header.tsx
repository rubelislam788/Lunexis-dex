// src/components/layout/Header.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import ArcLogo from "@/components/ui/ArcLogo";
import NotificationCenter from "@/components/ui/NotificationCenter";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import { useProfile } from "@/hooks/useProfile";
import type { Page } from "@/types";

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  sidebarAvailable: boolean;
}

export default function Header({ currentPage, onNavigate, onToggleSidebar, sidebarOpen, sidebarAvailable }: HeaderProps) {
  const [hidden, setHidden] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const { profile, address, isConnected } = useProfile();

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

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [profileOpen]);

  const goTo = (page: Page) => {
    setProfileOpen(false);
    onNavigate(page);
  };

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Wallet not connected";

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
        <div className="arc-topbar-left flex items-center">
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
        </div>

        <button onClick={() => onNavigate("landing")} className="arc-floating-brand bg-transparent" aria-label="Go to home">
          <ArcLogo size={30} compact />
        </button>

        <div className="arc-topbar-right flex items-center gap-2">
          <NotificationCenter />
          <ThemeSwitcher />
          <button
            onClick={() => setProfileOpen((value) => !value)}
            className={`arc-floating-action ${currentPage === "profile" ? "is-active" : ""}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>account_circle</span>
            <span className="hidden sm:inline">Profile</span>
          </button>
          {profileOpen && (
            <div ref={profileRef} className="lunexis-header-profile-panel">
              <div className="lunexis-header-profile-avatar">
                {profile?.avatarDataUrl ? <img src={profile.avatarDataUrl} alt="Profile" /> : <span>LU</span>}
              </div>
              <div>
                <strong>{profile?.username ?? "Lunexis Operator"}</strong>
                <small>{isConnected ? shortAddress : "Connect wallet to sync profile"}</small>
              </div>
              <div className="lunexis-header-profile-stats">
                <span>{profile?.xp ?? 0} XP</span>
                <span>{profile?.completedMissionIds.length ?? 0} Missions</span>
              </div>
              <button onClick={() => goTo("profile")}>Open Profile</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
