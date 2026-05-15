"use client";

import { useMemo, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";

type ClipboardImageItem = new (items: Record<string, Blob>) => ClipboardItem;

function parseUsd(value?: string) {
  const numeric = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&apos;" }[char] ?? char));
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
  const [theme, setTheme] = useState("nebula");
  const [copyStatus, setCopyStatus] = useState("");

  const stats = useMemo(() => {
    const total = balances.reduce((sum, item) => sum + parseUsd(item.value), 0);
    const top = [...balances].sort((a, b) => parseUsd(b.value) - parseUsd(a.value))[0];
    return { total, top };
  }, [balances]);

  const username = profile?.username ?? "Lunexis Operator";
  const wallet = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Wallet not connected";
  const topToken = stats.top?.token ?? "N/A";

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="${theme === "nebula" ? "#001d24" : "#090016"}"/>
        <stop offset=".55" stop-color="#111a3f"/>
        <stop offset="1" stop-color="${theme === "nebula" ? "#340028" : "#00324a"}"/>
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <circle cx="1020" cy="90" r="220" fill="#00dce5" opacity=".18"/>
    <circle cx="150" cy="520" r="230" fill="#ff2db2" opacity=".14"/>
    <rect x="70" y="72" width="1060" height="486" rx="46" fill="rgba(255,255,255,.06)" stroke="#38bdf8" stroke-width="2"/>
    <text x="110" y="150" fill="#38bdf8" font-family="Inter, Arial" font-size="26" font-weight="800" letter-spacing="5">LUNEXIS PORTFOLIO</text>
    <text x="110" y="245" fill="white" font-family="Inter, Arial" font-size="64" font-weight="900">${escapeXml(username)}</text>
    <text x="112" y="292" fill="#9fb2c4" font-family="Inter, Arial" font-size="28">${escapeXml(wallet)}</text>
    <text x="110" y="390" fill="#9ff7ff" font-family="Inter, Arial" font-size="28">Portfolio value</text>
    <text x="110" y="456" fill="white" font-family="Inter, Arial" font-size="58" font-weight="900">$${stats.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</text>
    <text x="670" y="378" fill="#9ff7ff" font-family="Inter, Arial" font-size="28">XP</text>
    <text x="670" y="438" fill="#38bdf8" font-family="Inter, Arial" font-size="52" font-weight="900">${profile?.xp ?? 0}</text>
    <text x="860" y="378" fill="#9ff7ff" font-family="Inter, Arial" font-size="28">Top asset</text>
    <text x="860" y="438" fill="#ff4fc8" font-family="Inter, Arial" font-size="52" font-weight="900">${escapeXml(topToken)}</text>
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="lunexis-kicker">One Click Portfolio Share</div>
          <h2>Social Portfolio Card</h2>
        </div>
        <div className="flex gap-2">
          {["nebula", "cyber"].map((item) => (
            <button key={item} onClick={() => setTheme(item)} className={theme === item ? "is-active" : ""}>{item}</button>
          ))}
        </div>
      </div>
      <div className={`lunexis-share-preview is-${theme}`}>
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
