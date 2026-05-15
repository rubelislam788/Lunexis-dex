"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    const next = THEMES.some((item) => item.id === stored) ? stored! : "dark";
    setTheme(next);
    document.documentElement.dataset.lunexisTheme = next;
  }, []);

  const selectTheme = (next: ThemeId) => {
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.dataset.lunexisTheme = next;
    setOpen(false);
  };

  return (
    <div className="lunexis-theme-switcher">
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
