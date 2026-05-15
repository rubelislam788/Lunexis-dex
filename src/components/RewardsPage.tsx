"use client";

import { useProfile } from "@/hooks/useProfile";
import ActivityTimeline from "@/components/ActivityTimeline";
import FaucetButton from "@/components/ui/FaucetButton";

const REWARDS = [
  { id: "reward-social", title: "Social Signal Pack", amount: 650, requirement: "Complete all social missions", missionIds: ["social-follow", "social-rubel-post", "social-arc-post"] },
  { id: "reward-bridge", title: "Bridge Operator Bonus", amount: 800, requirement: "Complete Bridge the Arc Gate", missionIds: ["q2"] },
  { id: "reward-swap", title: "Swap Pilot Bonus", amount: 500, requirement: "Complete Lunexis Swap Initiation", missionIds: ["q1"] },
  { id: "reward-route", title: "Route Pathfinder Bonus", amount: 2500, requirement: "Complete swap and bridge route mission", missionIds: ["q4"] },
];

export default function RewardsPage() {
  const { profile, isConnected, claim } = useProfile();

  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 34, fontWeight: 900, color: "#f8fbff" }}>Rewards Command</h1>
            <p style={{ color: "#849495" }}>Claim points, monitor XP, and track achievements.</p>
          </div>
          <FaucetButton label="Get Test Tokens" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            ["Total XP", profile?.xp ?? 0],
            ["Rewards Earned", `${profile?.rewardsEarned ?? 0} points`],
            ["Completed", profile?.completedMissionIds.length ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="arc-card rounded-2xl p-5">
              <div style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
              <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900, marginTop: 8 }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {REWARDS.map((reward) => {
            const claimed = profile?.claimedRewardIds.includes(reward.id);
            const eligible = Boolean(isConnected && profile && reward.missionIds.every((id) => profile.completedMissionIds.includes(id)));
            return (
              <div key={reward.id} className="arc-card rounded-3xl p-6">
                <div style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff" }}>{reward.title}</div>
                <p style={{ color: "#849495", fontSize: 13, marginTop: 8 }}>{reward.requirement}</p>
                <p style={{ color: eligible ? "#22c55e" : "#ffb7eb", fontSize: 12, marginTop: 10 }}>
                  {eligible ? "Eligible from verified missions" : "Verify required missions first"}
                </p>
                <div style={{ color: "#ff2db2", fontFamily: "'Space Grotesk'", fontSize: 26, fontWeight: 900, marginTop: 18 }}>{reward.amount} points</div>
                <button
                  disabled={!eligible || claimed}
                  onClick={() => claim(reward.id, reward.amount)}
                  className="btn-primary w-full mt-5 py-3 rounded-xl"
                >
                  {claimed ? "Completed" : "Claim Reward"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="arc-card rounded-3xl p-6 mt-6">
          <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff", marginBottom: 16 }}>Reward Activity</h2>
          <ActivityTimeline activities={profile?.activities ?? []} />
        </div>
      </div>
    </div>
  );
}
