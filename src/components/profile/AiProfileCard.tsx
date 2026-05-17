"use client";

import { useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";

function parseAmount(value?: string) {
  const numeric = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

export default function AiProfileCard() {
  const { profile, address } = useProfile();
  const { balances } = usePortfolioBalances();
  const favorite = useMemo(() => [...balances].sort((a, b) => parseAmount(b.amount) - parseAmount(a.amount))[0], [balances]);
  const level = Math.max(1, Math.floor((profile?.xp ?? 0) / 500) + 1);

  return (
    <section className="lunexis-profile-card">
      <div className="lunexis-profile-orbit" />
      <div className="flex items-center gap-4">
        {profile?.avatarDataUrl ? (
          <img src={profile.avatarDataUrl} alt="Profile" />
        ) : (
          <span>LX</span>
        )}
        <div>
          <h2>{profile?.username ?? "Lunexis Operator"}</h2>
          <p>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Wallet profile"}</p>
        </div>
      </div>
      <div className="lunexis-profile-stats">
        <div><span>Level</span><strong>{level}</strong></div>
        <div><span>Missions</span><strong>{profile?.completedMissionIds.length ?? 0}</strong></div>
        <div><span>Favorite</span><strong>{favorite?.token ?? "N/A"}</strong></div>
      </div>
      <div className="lunexis-badge-row">
        {["Operator", "Arc Native", "Signal Hunter"].map((badge) => <span key={badge}>{badge}</span>)}
      </div>
    </section>
  );
}
