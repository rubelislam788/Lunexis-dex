"use client";

import { useId } from "react";

export default function ArcLogo({
  size = 40,
  compact = false,
}: {
  size?: number;
  compact?: boolean;
}) {
  const labelSize = compact ? 14 : 18;
  const baseId = useId().replace(/:/g, "");
  const shellId = `${baseId}-shell`;
  const rimId = `${baseId}-rim`;
  const arcId = `${baseId}-arc`;
  const glowId = `${baseId}-glow`;

  return (
    <div className="flex items-center gap-3">
      <span
        className="relative grid place-items-center rounded-[18px]"
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle at 28% 18%, rgba(255,255,255,0.34), transparent 24%), radial-gradient(circle at 70% 86%, rgba(255,45,178,0.34), transparent 34%), linear-gradient(145deg, rgba(64,214,255,0.34), rgba(87,68,255,0.16) 46%, rgba(255,45,178,0.24)), #050b18",
          border: "1px solid rgba(184,236,255,0.34)",
          boxShadow: "0 10px 26px rgba(0,0,0,0.38), 0 0 28px rgba(56,189,248,0.28), 0 0 24px rgba(255,45,178,0.12), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -10px 18px rgba(0,0,0,0.3)",
          transform: "perspective(120px) rotateX(7deg) rotateY(-9deg)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 3,
            borderRadius: 15,
            background: "linear-gradient(145deg, rgba(255,255,255,0.18), transparent 38%, rgba(0,0,0,0.2) 100%)",
            pointerEvents: "none",
          }}
        />
        <svg width={size * 0.76} height={size * 0.76} viewBox="0 0 72 72" fill="none" aria-hidden="true" style={{ filter: "drop-shadow(0 8px 8px rgba(0,0,0,0.36))" }}>
          <g filter={`url(#${glowId})`}>
            <circle cx="36" cy="36" r="27" fill={`url(#${shellId})`} opacity="0.92" />
            <circle cx="36" cy="36" r="26" stroke={`url(#${rimId})`} strokeWidth="3.8" />
            <circle cx="36" cy="36" r="19" stroke="rgba(255,255,255,0.08)" strokeWidth="1.6" />
          </g>
          <path d="M20.5 44.5L35.5 18.5C35.72 18.12 36.28 18.12 36.5 18.5L51.5 44.5" stroke="rgba(0,0,0,0.42)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 2)" />
          <path d="M20.5 44.5L35.5 18.5C35.72 18.12 36.28 18.12 36.5 18.5L51.5 44.5" stroke={`url(#${arcId})`} strokeWidth="5.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M28 43.5H44" stroke="rgba(0,0,0,0.38)" strokeWidth="7" strokeLinecap="round" transform="translate(0 2)" />
          <path d="M28 43.5H44" stroke={`url(#${arcId})`} strokeWidth="5.4" strokeLinecap="round" />
          <circle cx="36" cy="36" r="4.4" fill="#F6FEFF" />
          <circle cx="36" cy="36" r="2" fill="#52E5FF" />
          <path d="M23 23C29 16.5 40 15.2 48 21" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
          <defs>
            <radialGradient id={shellId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(25 20) rotate(54) scale(47)">
              <stop stopColor="#FFFFFF" stopOpacity="0.22" />
              <stop offset="0.34" stopColor="#06344A" stopOpacity="0.92" />
              <stop offset="0.7" stopColor="#111B4F" />
              <stop offset="1" stopColor="#3A1039" />
            </radialGradient>
            <linearGradient id={rimId} x1="13" y1="15" x2="59" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#88F2FF" />
              <stop offset="0.48" stopColor="#4F7DFF" />
              <stop offset="1" stopColor="#FF3FBC" />
            </linearGradient>
            <linearGradient id={arcId} x1="23" y1="18" x2="50" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" />
              <stop offset="0.38" stopColor="#A9F7FF" />
              <stop offset="1" stopColor="#6E8CFF" />
            </linearGradient>
            <filter id={glowId} x="4" y="4" width="64" height="64" colorInterpolationFilters="sRGB">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#38BDF8" floodOpacity="0.36" />
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#FF2DB2" floodOpacity="0.16" />
            </filter>
          </defs>
        </svg>
      </span>
      <div>
        <div
          style={{
            fontFamily: "'Space Grotesk'",
            fontSize: labelSize,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "#F5FBFF",
            lineHeight: 1,
          }}
        >
          ARC SWAP
        </div>
        <div
          style={{
            fontFamily: "'Space Grotesk'",
            fontSize: compact ? 8 : 9,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#7DDFFF",
            marginTop: 4,
          }}
        >
          ARC Chain DEX
        </div>
      </div>
    </div>
  );
}
