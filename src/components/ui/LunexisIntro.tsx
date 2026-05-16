"use client";

import { useEffect, useState } from "react";
import LunexisLogoMark from "@/components/ui/LunexisLogoMark";

const PARTICLES = Array.from({ length: 42 }, (_, index) => ({
  id: index,
  left: `${(index * 29) % 100}%`,
  top: `${(index * 47) % 100}%`,
  delay: `${(index % 12) * 0.22}s`,
  size: `${2 + (index % 4)}px`,
}));

const ORBIT_NODES = Array.from({ length: 6 }, (_, index) => index);

export default function LunexisIntro() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const skipIntro = window.matchMedia("(max-width: 768px), (pointer: coarse), (prefers-reduced-motion: reduce)").matches;
    if (skipIntro) {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setVisible(false), 8200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="lunexis-intro" aria-label="Lunexis animated logo intro">
      <div className="lunexis-intro-space" />
      <div className="lunexis-intro-particles" aria-hidden="true">
        {PARTICLES.map((particle) => (
          <span
            key={particle.id}
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              animationDelay: particle.delay,
            }}
          />
        ))}
      </div>

      <div className="lunexis-intro-stage">
        <span className="lunexis-lens-flare" />
        <span className="lunexis-energy-ring" />
        <span className="lunexis-energy-ring is-secondary" />
        <span className="lunexis-energy-pulse" />

        <div className="lunexis-orbit-system" aria-hidden="true">
          <span className="lunexis-orbit-path is-one" />
          <span className="lunexis-orbit-path is-two" />
          <span className="lunexis-orbit-path is-three" />
          {ORBIT_NODES.map((node) => (
            <span key={node} className={`lunexis-orbit-node node-${node + 1}`} />
          ))}
        </div>

        <div className="lunexis-intro-logo">
          <LunexisLogoMark size={250} animated />
        </div>

        <div className="lunexis-intro-wordmark">
          <span>LUNEXIS</span>
        </div>
      </div>
    </div>
  );
}
