"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useProfile } from "@/hooks/useProfile";

const READ_KEY = "lunexis.notifications.read.v1";
const CLIENT_KEY = "lunexis.client-id.v1";

function getClientId() {
  const existing = window.localStorage.getItem(CLIENT_KEY);
  if (existing) return existing;
  const next = `client-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  window.localStorage.setItem(CLIENT_KEY, next);
  return next;
}

function getReadIds() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    return new Set(JSON.parse(window.localStorage.getItem(READ_KEY) || "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

export default function NotificationCenter() {
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [mobileOverlay, setMobileOverlay] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setReadIds(getReadIds());
    const owner = getClientId();
    fetch(`/api/preferences?owner=${encodeURIComponent(owner)}&scope=notifications-read`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (Array.isArray(data?.value)) {
          const next = new Set<string>(data.value.filter((id: unknown): id is string => typeof id === "string"));
          setReadIds(next);
          window.localStorage.setItem(READ_KEY, JSON.stringify(Array.from(next)));
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    const sync = () => setMobileOverlay(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const notifications = useMemo(() => {
    const activityNotifications = (profile?.activities ?? []).slice(0, 12).map((activity) => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      time: new Date(activity.timestamp).toLocaleString(),
      type: activity.type,
    }));

    return [
      {
        id: "security-watch",
        title: "Security monitor active",
        description: "Wallet approval risk checks are running from your indexed activity.",
        time: "Live",
        type: "wallet",
      },
      ...activityNotifications,
    ];
  }, [profile?.activities]);

  const unread = notifications.filter((item) => !readIds.has(item.id)).length;

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const markAllRead = () => {
    const next = new Set(notifications.map((item) => item.id));
    setReadIds(next);
    const value = Array.from(next);
    window.localStorage.setItem(READ_KEY, JSON.stringify(value));
    void fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: getClientId(), scope: "notifications-read", value }),
    }).catch(() => null);
  };

  const panel = (
    <div ref={panelRef} className={`lunexis-notification-panel ${mobileOverlay ? "lunexis-mobile-overlay-panel" : ""}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3>Signal Center</h3>
          <p>{unread} unread updates</p>
        </div>
        <button type="button" onClick={markAllRead}>Read all</button>
      </div>
      <div className="lunexis-notification-list">
        {notifications.map((item) => (
          <div key={item.id} className={`lunexis-notification-card ${readIds.has(item.id) ? "is-read" : ""}`}>
            <span className="material-symbols-outlined">{item.type === "reward" ? "workspace_premium" : item.type === "mission" ? "task_alt" : item.type === "swap" ? "swap_horiz" : "shield"}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <small>{item.time}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="lunexis-notification-center" ref={rootRef}>
      <button type="button" className="arc-floating-action lunexis-icon-button" onClick={() => setOpen((value) => !value)} aria-label="Notifications">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>notifications</span>
        {unread > 0 && <span className="lunexis-unread-dot">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (mobileOverlay ? createPortal(panel, document.body) : panel)}
    </div>
  );
}
