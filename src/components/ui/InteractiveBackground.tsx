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
    let frame = 0;
    let nextX = 50;
    let nextY = 50;
    const move = (event: PointerEvent) => {
      nextX = event.clientX / window.innerWidth;
      nextY = event.clientY / window.innerHeight;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        root.style.setProperty("--lunexis-pointer-x", `${nextX * 100}%`);
        root.style.setProperty("--lunexis-pointer-y", `${nextY * 100}%`);
        root.style.setProperty("--lunexis-pointer-dx", `${(nextX - 0.5) * 26}px`);
        root.style.setProperty("--lunexis-pointer-dy", `${(nextY - 0.5) * 26}px`);
        frame = 0;
      });
    };

    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      if (frame) window.cancelAnimationFrame(frame);
    };
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
