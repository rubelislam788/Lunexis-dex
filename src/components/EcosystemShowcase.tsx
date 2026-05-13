// src/components/EcosystemShowcase.tsx
"use client";

import { ECOSYSTEM_ASSETS } from "@/lib/ecosystem";
import type { CSSProperties } from "react";

interface EcosystemShowcaseProps {
  compact?: boolean;
}

export default function EcosystemShowcase({ compact = false }: EcosystemShowcaseProps) {
  return (
    <section className={compact ? "arc-token-grid compact" : "arc-token-grid"}>
      {ECOSYSTEM_ASSETS.map((asset, index) => (
        <article
          key={asset.name}
          className="arc-token-card"
          style={{
            "--token-glow": asset.glow,
            animationDelay: `${index * 120}ms`,
          } as CSSProperties}
        >
          <div className="arc-token-orb">
            <span className="arc-token-ring" />
            <img src={asset.src} alt={`${asset.name} logo`} className="arc-token-logo" />
          </div>
          <div className="arc-token-name">{asset.name}</div>
          <div className="arc-token-role">{asset.role}</div>
        </article>
      ))}
    </section>
  );
}
