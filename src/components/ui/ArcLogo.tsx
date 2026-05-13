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
  const ringId = useId().replace(/:/g, "");
  const strokeId = useId().replace(/:/g, "");

  return (
    <div className="flex items-center gap-3">
      <span
        className="relative grid place-items-center rounded-[16px]"
        style={{
          width: size,
          height: size,
          background: "radial-gradient(circle at 28% 24%, rgba(255,255,255,0.22), transparent 30%), linear-gradient(145deg, rgba(56,189,248,0.3), rgba(255,45,178,0.18)), rgba(5,11,24,0.92)",
          border: "1px solid rgba(148,217,255,0.28)",
          boxShadow: "0 0 26px rgba(56,189,248,0.22), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <circle cx="32" cy="32" r="25" stroke={`url(#${ringId})`} strokeWidth="4.5" opacity="0.96" />
          <path d="M17 39L31.5 14L46 39" stroke={`url(#${strokeId})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24 39H40" stroke={`url(#${strokeId})`} strokeWidth="5" strokeLinecap="round" />
          <circle cx="32" cy="32" r="3.8" fill="#EAFBFF" />
          <defs>
            <linearGradient id={ringId} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
              <stop stopColor="#5CE1FF" />
              <stop offset="1" stopColor="#FF4FB7" />
            </linearGradient>
            <linearGradient id={strokeId} x1="18" y1="16" x2="46" y2="43" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F6FEFF" />
              <stop offset="1" stopColor="#8EE9FF" />
            </linearGradient>
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
