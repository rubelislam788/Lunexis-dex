"use client";

import { useAppStats } from "@/hooks/useAppStats";
import FaucetButton from "@/components/ui/FaucetButton";

export default function StatsPage() {
  const stats = useAppStats();

  const cards = [
    ["Arc Block", stats.arcBlock, "Latest Arc Testnet block from RPC"],
    ["Arc Gas", stats.arcGasPrice, "Current Arc native USDC gas price"],
    ["Operators", stats.profiles.toLocaleString(), "Synced wallet profiles across Lunexis"],
    ["Verified Missions", stats.missionsCompleted.toLocaleString(), "Completed mission verifications"],
    ["Rewards Claimed", `${stats.rewardsClaimed.toLocaleString()} points`, "Claimed mission reward points"],
    ["Confirmed Swaps", stats.swaps.toLocaleString(), "Wallet-confirmed swap activities"],
  ];

  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between gap-5 mb-8">
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 34, fontWeight: 900, color: "#f8fbff" }}>Network Stats</h1>
            <p style={{ color: "#849495", marginTop: 8 }}>
              {stats.lastSynced ? `Live sync ${stats.lastSynced}` : "Reading live Arc data"}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={stats.refresh} disabled={stats.isLoading} className="btn-outline-cyan px-5 py-3 rounded-xl">
              {stats.isLoading ? "Syncing..." : "Refresh"}
            </button>
            <FaucetButton label="Faucet" compact />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map(([label, value, detail]) => (
            <div key={label} className="arc-card rounded-3xl p-5">
              <div style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
              <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 26, fontWeight: 900, marginTop: 10, overflowWrap: "anywhere" }}>{value}</div>
              <div style={{ color: "#6f8699", fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>{detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
