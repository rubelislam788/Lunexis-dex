"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { LeaderboardEntry } from "@/types";
import { loadAllProfiles } from "@/lib/profile";

function tierFor(xp: number) {
  if (xp >= 3000) return "Elite";
  if (xp >= 1500) return "Pro";
  if (xp >= 500) return "Active";
  return "Rookie";
}

function buildEntries(): LeaderboardEntry[] {
  return loadAllProfiles().map((profile, index) => ({
    rank: index + 1,
    address: profile.walletAddress,
    username: profile.username,
    xp: profile.xp,
    quests: profile.completedMissionIds.length,
    tier: tierFor(profile.xp),
  }));
}

export default function LeaderboardPage() {
  const { address } = useAccount();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const sync = () => setEntries(buildEntries());
    sync();
    window.addEventListener("arc-profile-updated", sync);
    return () => window.removeEventListener("arc-profile-updated", sync);
  }, []);

  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <div className="relative z-10 max-w-6xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 34, fontWeight: 900, color: "#f8fbff" }}>Live Leaderboard</h1>
          <p style={{ color: "#849495", marginTop: 8 }}>Ranks update from verified wallet activity and claimed mission progress on this app.</p>
        </div>

        <div className="arc-card rounded-3xl overflow-hidden">
          {entries.length === 0 ? (
            <div className="p-10 text-center" style={{ color: "#849495" }}>Connect a wallet and verify missions to enter the leaderboard.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {entries.map((entry) => {
                const isCurrent = address?.toLowerCase() === entry.address.toLowerCase();
                return (
                  <div key={entry.address} className="grid grid-cols-[64px_1fr_90px_90px_90px] gap-3 items-center p-4" style={{ background: isCurrent ? "rgba(56,189,248,0.08)" : "transparent" }}>
                    <div style={{ color: entry.rank <= 3 ? "#38bdf8" : "#849495", fontFamily: "'Space Grotesk'", fontWeight: 900 }}>#{entry.rank}</div>
                    <div>
                      <div style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontWeight: 900 }}>{entry.username}</div>
                      <div style={{ color: "#849495", fontSize: 12 }}>{entry.address.slice(0, 6)}...{entry.address.slice(-4)}</div>
                    </div>
                    <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontWeight: 900 }}>{entry.xp.toLocaleString()}</div>
                    <div style={{ color: "#f8fbff" }}>{entry.quests} quests</div>
                    <div style={{ color: "#ffb7eb", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{entry.tier}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
