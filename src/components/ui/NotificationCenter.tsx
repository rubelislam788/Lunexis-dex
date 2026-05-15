"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useProfile } from "@/hooks/useProfile";

const READ_KEY = "lunexis.notifications.read.v1";

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
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setReadIds(getReadIds());
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
      if (!rootRef.current?.contains(event.target as Node)) {
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
    window.localStorage.setItem(READ_KEY, JSON.stringify(Array.from(next)));
  };

  return (
    <div className="lunexis-notification-center" ref={rootRef}>
      <button type="button" className="arc-floating-action lunexis-icon-button" onClick={() => setOpen((value) => !value)} aria-label="Notifications">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>notifications</span>
        {unread > 0 && <span className="lunexis-unread-dot">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="lunexis-notification-panel">
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
      )}
    </div>
  );
}
