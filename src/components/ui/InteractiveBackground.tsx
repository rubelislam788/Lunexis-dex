"use client";

import { useEffect, useState } from "react";

export default function InteractiveBackground() {
  const [mounted, setMounted] = useState(false);
  const [particleCount, setParticleCount] = useState(22);

  useEffect(() => {
    setMounted(true);
    const isMobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setParticleCount(isMobile || reduceMotion ? 8 : 22);
    if (isMobile || reduceMotion) return;

    const root = document.documentElement;
    const move = (event: PointerEvent) => {
      root.style.setProperty("--lunexis-pointer-x", `${(event.clientX / window.innerWidth) * 100}%`);
      root.style.setProperty("--lunexis-pointer-y", `${(event.clientY / window.innerHeight) * 100}%`);
      root.style.setProperty("--lunexis-pointer-dx", `${(event.clientX / window.innerWidth - 0.5) * 26}px`);
      root.style.setProperty("--lunexis-pointer-dy", `${(event.clientY / window.innerHeight - 0.5) * 26}px`);
    };

    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  if (!mounted) return null;

  return (
    <div className="lunexis-interactive-bg" aria-hidden="true">
      <div className="lunexis-bg-orb lunexis-bg-orb-a" />
      <div className="lunexis-bg-orb lunexis-bg-orb-b" />
      <div className="lunexis-bg-orb lunexis-bg-orb-c" />
      <div className="lunexis-bg-grid" />
      <div className="lunexis-bg-particles">
        {Array.from({ length: particleCount }).map((_, index) => (
          <span
            key={index}
            style={{
              left: `${(index * 37) % 100}%`,
              top: `${(index * 19) % 100}%`,
              animationDuration: `${12 + index * 0.28}s`,
              animationDelay: `${index * -0.24}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
