"use client";

import { useEffect, useRef, useState } from "react";

const THEMES = [
  { id: "dark", label: "Dark" },
  { id: "cyber", label: "Cyber" },
  { id: "neon", label: "Neon" },
  { id: "space", label: "Space" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];
const STORAGE_KEY = "lunexis.theme.v1";

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>("dark");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    const next = THEMES.some((item) => item.id === stored) ? stored! : "dark";
    setTheme(next);
    document.body.dataset.lunexisTheme = next;
    document.documentElement.dataset.lunexisTheme = next;
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
    setOpen(false);
  };

  return (
    <div className="lunexis-theme-switcher" ref={rootRef}>
      <button type="button" className="arc-floating-action lunexis-icon-button" onClick={() => setOpen((value) => !value)} aria-label="Switch theme">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>palette</span>
        <span className="hidden sm:inline">{theme}</span>
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
