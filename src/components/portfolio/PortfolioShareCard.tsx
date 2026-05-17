"use client";

import { useMemo, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import LunexisLogoMark from "@/components/ui/LunexisLogoMark";

type ClipboardImageItem = new (items: Record<string, Blob>) => ClipboardItem;

const SHARE_THEMES = {
  nebula: { label: "Nebula", stops: ["#001d24", "#111a3f", "#340028"], text: "#ffffff", muted: "#9fb2c4", accent: "#38bdf8", accent2: "#ff4fc8" },
  white: { label: "White", stops: ["#f7fbf8", "#ffffff", "#dff0ee"], text: "#0D1E1C", muted: "#3A5C58", accent: "#2A9D8F", accent2: "#C98A3B" },
  utopia: { label: "Utopia", stops: ["#dce9ef", "#f2f6ef", "#86b98f"], text: "#102522", muted: "#3c5b55", accent: "#0f766e", accent2: "#e879a7" },
  bloom: { label: "Bloom", stops: ["#edf6ff", "#f8ede8", "#f1aacb"], text: "#271722", muted: "#705261", accent: "#d85d91", accent2: "#5aa897" },
  cyber: { label: "Cyber", stops: ["#06131f", "#10375d", "#00dce5"], text: "#effcff", muted: "#9bd8e4", accent: "#00dce5", accent2: "#8b5cf6" },
  aurora: { label: "Aurora", stops: ["#06261f", "#123e50", "#5f2d8c"], text: "#f4fffb", muted: "#b5d8d1", accent: "#34d399", accent2: "#a78bfa" },
  sunset: { label: "Sunset", stops: ["#2a1329", "#7a2e43", "#ffb86b"], text: "#fff7ed", muted: "#ffd7b0", accent: "#ff8a5b", accent2: "#ffd166" },
  ocean: { label: "Ocean", stops: ["#042f3a", "#075985", "#14b8a6"], text: "#ecfeff", muted: "#a7f3d0", accent: "#22d3ee", accent2: "#5eead4" },
} as const;

type ShareTheme = keyof typeof SHARE_THEMES;

function parseUsd(value?: string) {
  const numeric = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&apos;" }[char] ?? char));
}

function portfolioLogoSvg(accent: string, accent2: string) {
  return `
    <g transform="translate(934 102) scale(.48)" opacity=".94">
      <ellipse cx="80" cy="80" rx="78" ry="78" fill="rgba(255,255,255,.14)" stroke="${accent}" stroke-width="3"/>
      <path d="M19 88C45 62 116 54 143 78C113 94 52 106 19 88Z" fill="none" stroke="${accent2}" stroke-width="3" opacity=".8"/>
      <path d="M113 22C80 17 45 34 29 66C10 105 35 149 78 151C45 132 39 90 63 57C77 38 94 27 113 22Z" fill="${accent}"/>
      <path d="M104 34C82 35 63 50 52 71C39 97 45 125 66 140C44 130 34 100 47 72C58 49 79 34 104 34Z" fill="#ffffff" opacity=".78"/>
      <path d="M113 22C84 31 61 58 57 89C54 114 64 135 80 150C50 134 41 92 64 58C78 38 94 27 113 22Z" fill="#07112C" opacity=".5"/>
      <path d="M17 88C47 104 111 101 145 78" fill="none" stroke="${accent2}" stroke-width="4" stroke-linecap="round"/>
      <path d="M54 111L91 75L110 59" fill="none" stroke="#eafbff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="54" cy="111" r="8" fill="${accent2}" stroke="#EAFBFF" stroke-width="3"/>
      <circle cx="91" cy="75" r="9" fill="${accent2}" stroke="#EAFBFF" stroke-width="3"/>
      <circle cx="110" cy="59" r="9" fill="${accent2}" stroke="#EAFBFF" stroke-width="3"/>
    </g>`;
}

function svgToPngBlob(svg: string) {
  return new Promise<Blob>((resolve, reject) => {
    const image = new Image();
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not create portfolio card image."));
        return;
      }
      context.drawImage(image, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not prepare portfolio card image."));
      }, "image/png");
    };
    image.onerror = () => reject(new Error("Could not load portfolio card preview."));
    image.src = url;
  });
}

export default function PortfolioShareCard() {
  const { profile, address } = useProfile();
  const { balances } = usePortfolioBalances();
  const [theme, setTheme] = useState<ShareTheme>("nebula");
  const [copyStatus, setCopyStatus] = useState("");

  const stats = useMemo(() => {
    const total = balances.reduce((sum, item) => sum + parseUsd(item.value), 0);
    const top = [...balances].sort((a, b) => parseUsd(b.value) - parseUsd(a.value))[0];
    return { total, top };
  }, [balances]);

  const username = profile?.username ?? "Lunexis Operator";
  const wallet = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Wallet not connected";
  const topToken = stats.top?.token ?? "N/A";
  const activeTheme = SHARE_THEMES[theme];
  const scenicScene = theme === "utopia"
    ? `
    <path d="M0 430 C170 330 280 390 430 315 C570 250 705 310 845 230 C1000 140 1095 215 1200 150 L1200 630 L0 630Z" fill="#b7d2ba" opacity=".82"/>
    <path d="M0 515 C210 455 270 500 455 430 C620 368 760 410 910 350 C1040 298 1120 328 1200 280 L1200 630 L0 630Z" fill="#79aa83" opacity=".58"/>
    <path d="M130 445 C330 380 520 392 700 330 C810 292 905 292 1000 250" fill="none" stroke="#f5f8ef" stroke-width="30" opacity=".72"/>
    <circle cx="165" cy="125" r="86" fill="#ffffff" opacity=".26"/>
    <g opacity=".34" fill="#ffffff">
      <ellipse cx="245" cy="130" rx="78" ry="16"/>
      <ellipse cx="562" cy="88" rx="62" ry="13"/>
      <ellipse cx="925" cy="106" rx="70" ry="14"/>
    </g>
    <rect x="802" y="110" width="42" height="24" fill="#f2e7d8" opacity=".78"/>
    <rect x="846" y="110" width="54" height="24" fill="#d85d91" opacity=".72"/>
    <rect x="715" y="422" width="24" height="24" fill="#e879a7" opacity=".72"/>
    <g opacity=".42" fill="#0f766e">
      ${Array.from({ length: 22 }).map((_, index) => `<rect x="${index * 18}" y="${500 + (index % 3) * 7}" width="10" height="3" rx="1"/>`).join("")}
      ${Array.from({ length: 18 }).map((_, index) => `<rect x="${930 + index * 14}" y="${205 + (index % 5) * 8}" width="8" height="3" rx="1"/>`).join("")}
    </g>`
    : "";

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="${activeTheme.stops[0]}"/>
        <stop offset=".55" stop-color="${activeTheme.stops[1]}"/>
        <stop offset="1" stop-color="${activeTheme.stops[2]}"/>
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    ${scenicScene}
    <circle cx="1020" cy="90" r="220" fill="${activeTheme.accent}" opacity=".18"/>
    <circle cx="150" cy="520" r="230" fill="${activeTheme.accent2}" opacity=".14"/>
    <rect x="70" y="72" width="1060" height="486" rx="46" fill="rgba(255,255,255,.13)" stroke="${activeTheme.accent}" stroke-width="2"/>
    ${portfolioLogoSvg(activeTheme.accent, activeTheme.accent2)}
    <text x="110" y="150" fill="${activeTheme.accent}" font-family="Inter, Arial" font-size="26" font-weight="800" letter-spacing="5">LUNEXIS PORTFOLIO</text>
    <text x="110" y="245" fill="${activeTheme.text}" font-family="Inter, Arial" font-size="64" font-weight="900">${escapeXml(username)}</text>
    <text x="112" y="292" fill="${activeTheme.muted}" font-family="Inter, Arial" font-size="28">${escapeXml(wallet)}</text>
    <text x="110" y="390" fill="${activeTheme.accent}" font-family="Inter, Arial" font-size="28">Portfolio value</text>
    <text x="110" y="456" fill="${activeTheme.text}" font-family="Inter, Arial" font-size="58" font-weight="900">$${stats.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</text>
    <text x="670" y="378" fill="${activeTheme.accent}" font-family="Inter, Arial" font-size="28">XP</text>
    <text x="670" y="438" fill="${activeTheme.accent}" font-family="Inter, Arial" font-size="52" font-weight="900">${profile?.xp ?? 0}</text>
    <text x="860" y="378" fill="${activeTheme.accent}" font-family="Inter, Arial" font-size="28">Top asset</text>
    <text x="860" y="438" fill="${activeTheme.accent2}" font-family="Inter, Arial" font-size="52" font-weight="900">${escapeXml(topToken)}</text>
  </svg>`;

  const copyCard = async () => {
    setCopyStatus("");
    const shareText = `My Lunexis portfolio is live: ${username} | Top asset ${topToken} | XP ${profile?.xp ?? 0}`;
    try {
      const ClipboardItemCtor = (window as unknown as { ClipboardItem?: ClipboardImageItem }).ClipboardItem;
      if (navigator.clipboard?.write && ClipboardItemCtor) {
        const png = await svgToPngBlob(svg);
        await navigator.clipboard.write([new ClipboardItemCtor({ "image/png": png })]);
        setCopyStatus("Card image copied");
        return true;
      }
      await navigator.clipboard?.writeText(shareText);
      setCopyStatus("Share text copied");
      return true;
    } catch (error) {
      await navigator.clipboard?.writeText(shareText).catch(() => undefined);
      setCopyStatus(error instanceof Error ? error.message : "Copy failed");
      return false;
    }
  };

  const shareToX = async () => {
    await copyCard();
    const text = encodeURIComponent(`My Lunexis portfolio is live: ${username} | Top asset ${topToken} | XP ${profile?.xp ?? 0}`);
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="lunexis-premium-card">
      <div className="lunexis-share-header">
        <div>
          <div className="lunexis-kicker">One Click Portfolio Share</div>
          <h2>Social Portfolio Card</h2>
        </div>
        <div className="lunexis-share-theme-row">
          {Object.entries(SHARE_THEMES).map(([id, item]) => (
            <button
              key={id}
              onClick={() => setTheme(id as ShareTheme)}
              className={theme === id ? "is-active" : ""}
              type="button"
            >
              <i style={{ background: `linear-gradient(135deg, ${item.stops.join(", ")})` }} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className={`lunexis-share-preview is-${theme}`}>
        <div className="lunexis-share-preview-logo" aria-hidden="true">
          <LunexisLogoMark size={54} />
        </div>
        <div>
          <span>LUNEXIS PORTFOLIO</span>
          <h3>{username}</h3>
          <p>{wallet}</p>
        </div>
        <div className="lunexis-share-stats">
          <strong>${stats.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
          <small>{profile?.xp ?? 0} XP - {profile?.completedMissionIds.length ?? 0} missions - Top {stats.top?.token ?? "N/A"}</small>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-4">
        <button onClick={copyCard}>Copy Card</button>
        <button onClick={shareToX}>Share to X</button>
      </div>
      {copyStatus && <p className="lunexis-share-status">{copyStatus}</p>}
    </section>
  );
}
