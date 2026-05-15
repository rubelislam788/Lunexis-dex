"use client";

import { useId } from "react";

export default function LunexisLogoMark({
  size = 96,
  animated = false,
  className = "",
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  const baseId = useId().replace(/:/g, "");
  const crescentId = `${baseId}-crescent`;
  const innerId = `${baseId}-inner`;
  const orbitId = `${baseId}-orbit`;
  const glowId = `${baseId}-glow`;
  const nodeId = `${baseId}-node`;

  return (
    <svg
      className={`${animated ? "lunexis-logo-mark is-animated" : "lunexis-logo-mark"} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={crescentId} x1="36" y1="30" x2="112" y2="136" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FCFF" />
          <stop offset="0.16" stopColor="#A9F3FF" />
          <stop offset="0.48" stopColor="#5B7CFF" />
          <stop offset="0.78" stopColor="#7E5BFF" />
          <stop offset="1" stopColor="#EF4CEB" />
        </linearGradient>
        <linearGradient id={innerId} x1="43" y1="42" x2="100" y2="123" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.32" stopColor="#D7F9FF" />
          <stop offset="0.7" stopColor="#70B9FF" />
          <stop offset="1" stopColor="#3D57CF" />
        </linearGradient>
        <linearGradient id={orbitId} x1="13" y1="80" x2="145" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CFF" stopOpacity="0" />
          <stop offset="0.2" stopColor="#7BEFFF" />
          <stop offset="0.55" stopColor="#4B7CFF" />
          <stop offset="0.82" stopColor="#D58AFF" />
          <stop offset="1" stopColor="#8B5CFF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={nodeId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(75 72) rotate(90) scale(11)">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#B9F7FF" />
          <stop offset="1" stopColor="#815CFF" />
        </radialGradient>
        <filter id={glowId} x="-28" y="-28" width="216" height="216" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#72E8FF" floodOpacity="0.78" />
          <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor="#5865FF" floodOpacity="0.42" />
          <feDropShadow dx="0" dy="0" stdDeviation="14" floodColor="#D946EF" floodOpacity="0.22" />
        </filter>
      </defs>

      <g filter={`url(#${glowId})`}>
        <path className="lunexis-orbit lunexis-orbit-back" d="M19 88C45 62 116 54 143 78C113 94 52 106 19 88Z" stroke={`url(#${orbitId})`} strokeWidth="3" />
        <path className="lunexis-crescent-shadow" d="M103 28C78 21 50 31 34 55C13 87 28 128 62 143C42 122 43 89 59 65C71 47 87 35 103 28Z" fill="#050B19" opacity="0.9" />
        <path className="lunexis-crescent-main" d="M113 22C80 17 45 34 29 66C10 105 35 149 78 151C45 132 39 90 63 57C77 38 94 27 113 22Z" fill={`url(#${crescentId})`} />
        <path className="lunexis-crescent-cut" d="M104 34C82 35 63 50 52 71C39 97 45 125 66 140C44 130 34 100 47 72C58 49 79 34 104 34Z" fill={`url(#${innerId})`} opacity="0.95" />
        <path className="lunexis-crescent-core" d="M113 22C84 31 61 58 57 89C54 114 64 135 80 150C50 134 41 92 64 58C78 38 94 27 113 22Z" fill="#07112C" opacity="0.55" />
        <path className="lunexis-orbit lunexis-orbit-front" d="M17 88C47 104 111 101 145 78" stroke={`url(#${orbitId})`} strokeWidth="3.4" strokeLinecap="round" />
        <path className="lunexis-network-line" d="M54 111L91 75L110 59" stroke="#A9F7FF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path className="lunexis-network-line lunexis-network-line-glow" d="M54 111L91 75L110 59" stroke="#577BFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle className="lunexis-node" cx="54" cy="111" r="7.8" fill={`url(#${nodeId})`} stroke="#EAFBFF" strokeWidth="3" />
        <circle className="lunexis-node" cx="91" cy="75" r="9.3" fill={`url(#${nodeId})`} stroke="#EAFBFF" strokeWidth="3" />
        <circle className="lunexis-node" cx="110" cy="59" r="8.8" fill={`url(#${nodeId})`} stroke="#EAFBFF" strokeWidth="3" />
        <path className="lunexis-highlight" d="M38 74C48 47 75 28 105 25" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.84" />
      </g>
    </svg>
  );
}
