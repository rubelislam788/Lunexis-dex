"use client";

import { useEffect, useRef, useState } from "react";

const THEMES = [
  { id: "dark", label: "Dark" },
  { id: "cyber", label: "Cyber" },
  { id: "neon", label: "Neon" },
  { id: "elysium", label: "Elysium" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];
const STORAGE_KEY = "lunexis.theme.v1";
const CLIENT_KEY = "lunexis.client-id.v1";

function getClientId() {
  const existing = window.localStorage.getItem(CLIENT_KEY);
  if (existing) return existing;
  const next = `client-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  window.localStorage.setItem(CLIENT_KEY, next);
  return next;
}

function persistTheme(theme: ThemeId) {
  const owner = getClientId();
  void fetch("/api/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner, scope: "theme", value: theme }),
  }).catch(() => null);
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>("dark");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    const stored = (storedValue === "space" ? "elysium" : storedValue) as ThemeId | null;
    const next = THEMES.some((item) => item.id === stored) ? stored! : "dark";
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.body.dataset.lunexisTheme = next;
    document.documentElement.dataset.lunexisTheme = next;

    const owner = getClientId();
    fetch(`/api/preferences?owner=${encodeURIComponent(owner)}&scope=theme`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const remote = (data?.value === "space" ? "elysium" : data?.value) as ThemeId | null;
        if (THEMES.some((item) => item.id === remote)) {
          setTheme(remote!);
          window.localStorage.setItem(STORAGE_KEY, remote!);
          document.body.dataset.lunexisTheme = remote!;
          document.documentElement.dataset.lunexisTheme = remote!;
        }
      })
      .catch(() => null);
  }, []);

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

  const selectTheme = (next: ThemeId) => {
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.body.dataset.lunexisTheme = next;
    document.documentElement.dataset.lunexisTheme = next;
    persistTheme(next);
    setOpen(false);
  };

  const activeTheme = THEMES.find((item) => item.id === theme)?.label ?? "Dark";

  return (
    <div className="lunexis-theme-switcher" ref={rootRef}>
      <button type="button" className="arc-floating-action lunexis-icon-button" onClick={() => setOpen((value) => !value)} aria-label="Switch theme">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>palette</span>
        <span className="hidden sm:inline">{activeTheme}</span>
      </button>
      {open && (
        <div className="lunexis-theme-menu">
          {THEMES.map((item) => (
            <button key={item.id} type="button" onClick={() => selectTheme(item.id)} className={theme === item.id ? "is-active" : ""}>
              <span />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
