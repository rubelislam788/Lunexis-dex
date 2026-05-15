"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useProfile } from "@/hooks/useProfile";
import ActivityTimeline from "@/components/ActivityTimeline";
import FaucetButton from "@/components/ui/FaucetButton";
import CongratulationsModal from "@/components/ui/CongratulationsModal";
import { isAdminWallet } from "@/lib/admin";
import { DEFAULT_REWARDS, formatRewardAmount, formatRewardTotals, normalizeRewards, type RewardConfig } from "@/lib/rewards";

const REWARD_STORAGE_KEY = "lunexis.rewards.v1";

function readStoredRewards() {
  if (typeof window === "undefined") return DEFAULT_REWARDS;
  try {
    return normalizeRewards(JSON.parse(window.localStorage.getItem(REWARD_STORAGE_KEY) || "null"));
  } catch {
    return DEFAULT_REWARDS;
  }
}

function missionIdsToText(missionIds: string[]) {
  return missionIds.join(", ");
}

function textToMissionIds(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default function RewardsPage() {
  const { profile, isConnected, claim } = useProfile();
  const { address } = useAccount();
  const [rewards, setRewards] = useState<RewardConfig[]>(() => DEFAULT_REWARDS);
  const [showRewardAdmin, setShowRewardAdmin] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [claimingRewardId, setClaimingRewardId] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState("");
  const [successReward, setSuccessReward] = useState<{ amount: string; txHash?: string } | null>(null);
  const isRewardAdmin = isAdminWallet(address);

  useEffect(() => {
    setRewards(readStoredRewards());
    fetch("/api/rewards")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (Array.isArray(data?.rewards)) {
          const nextRewards = normalizeRewards(data.rewards);
          setRewards(nextRewards);
          window.localStorage.setItem(REWARD_STORAGE_KEY, JSON.stringify(nextRewards));
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!isRewardAdmin) setShowRewardAdmin(false);
  }, [isRewardAdmin]);

  const updateReward = (rewardId: string, patch: Partial<RewardConfig>) => {
    if (!isRewardAdmin) return;
    setRewards((current) => current.map((reward) => reward.id === rewardId ? { ...reward, ...patch } : reward));
    setSaveState("idle");
  };

  const addReward = () => {
    if (!isRewardAdmin) return;
    const reward: RewardConfig = {
      id: `reward-custom-${Date.now()}`,
      title: `Custom Reward ${rewards.length + 1}`,
      amount: 5,
      token: "USDC",
      requirement: "Admin configured reward",
      missionIds: [],
    };
    setRewards((current) => [...current, reward]);
    setSaveState("idle");
  };

  const removeReward = (rewardId: string) => {
    if (!isRewardAdmin || rewards.length <= 1) return;
    setRewards((current) => current.filter((reward) => reward.id !== rewardId));
    setSaveState("idle");
  };

  const syncProfileBeforePayout = async () => {
    if (!profile) return;
    await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    }).catch(() => null);
  };

  const saveRewards = async () => {
    if (!isRewardAdmin || !address) return;
    const nextRewards = normalizeRewards(rewards);
    setRewards(nextRewards);
    window.localStorage.setItem(REWARD_STORAGE_KEY, JSON.stringify(nextRewards));
    setSaveState("saving");
    const response = await fetch("/api/rewards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-wallet": address,
      },
      body: JSON.stringify({ rewards: nextRewards }),
    }).catch(() => null);

    if (response?.ok) {
      setSaveState("saved");
      return;
    }
    setSaveState("error");
  };

  const claimTokenReward = async (reward: RewardConfig) => {
    if (!address || claimingRewardId) return;
    setClaimingRewardId(reward.id);
    setClaimMessage("");
    try {
      await syncProfileBeforePayout();
      const response = await fetch("/api/reward-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId: reward.id,
          token: reward.token,
          amount: reward.amount,
          recipient: address,
          requiredMissionIds: reward.missionIds,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Reward payout failed.");
      }
      claim(reward.id, reward.amount, reward.token, data?.hash);
      setClaimMessage(`${formatRewardAmount(reward.amount, reward.token)} paid to your wallet.`);
      setSuccessReward({ amount: formatRewardAmount(reward.amount, reward.token), txHash: data?.hash });
    } catch (error: any) {
      setClaimMessage(error?.message || "Reward payout failed.");
    } finally {
      setClaimingRewardId(null);
    }
  };

  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 34, fontWeight: 900, color: "#f8fbff" }}>Rewards Command</h1>
            <p style={{ color: "#849495" }}>Claim USDC and EURC rewards, monitor XP, and track achievements.</p>
          </div>
          <div className="flex items-center gap-3">
            {isRewardAdmin && (
              <button onClick={() => setShowRewardAdmin((value) => !value)} className="btn-primary px-4 py-2 rounded-full text-xs">
                Reward Control
              </button>
            )}
            <FaucetButton label="Get Test Tokens" />
          </div>
        </div>

        {isRewardAdmin && showRewardAdmin && (
          <section className="arc-card rounded-3xl p-6 mb-6" id="reward-control-panel">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div>
                <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>Admin Only</div>
                <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 24, fontWeight: 900, color: "#f8fbff" }}>Reward Control</h2>
                <p style={{ color: "#849495", fontSize: 13 }}>Create, edit, remove, and publish rewards for all users.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={addReward} className="btn-ghost px-4 py-2 rounded-full text-xs">Add Reward</button>
                <button onClick={saveRewards} disabled={saveState === "saving"} className="btn-primary px-4 py-2 rounded-full text-xs">
                  {saveState === "saving" ? "Saving..." : "Save Rewards"}
                </button>
              </div>
            </div>
            {saveState !== "idle" && (
              <p style={{ color: saveState === "error" ? "#ffb7eb" : "#22c55e", fontSize: 12, marginBottom: 16 }}>
                {saveState === "saved" ? "Rewards saved and published." : saveState === "error" ? "Could not publish rewards. Local changes are saved in this browser." : "Saving rewards..."}
              </p>
            )}
            <div className="grid gap-4">
              {rewards.map((reward, index) => (
                <div key={reward.id} className="rounded-3xl p-4" style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(56,189,248,0.16)" }}>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 900 }}>Reward {index + 1}</div>
                    <button onClick={() => removeReward(reward.id)} disabled={rewards.length <= 1} className="btn-ghost px-3 py-2 rounded-full text-xs">Remove</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="grid gap-2">
                      <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Reward Title</span>
                      <input value={reward.title} onChange={(event) => updateReward(reward.id, { title: event.target.value })} className="rounded-2xl px-4 py-3" />
                    </label>
                    <label className="grid gap-2">
                      <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Amount</span>
                      <input type="number" min="0" value={reward.amount} onChange={(event) => updateReward(reward.id, { amount: Number(event.target.value) })} className="rounded-2xl px-4 py-3" />
                    </label>
                    <label className="grid gap-2">
                      <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Reward Token</span>
                      <select value={reward.token} onChange={(event) => updateReward(reward.id, { token: event.target.value as RewardConfig["token"] })} className="rounded-2xl px-4 py-3">
                        <option value="USDC">USDC</option>
                        <option value="EURC">EURC</option>
                      </select>
                    </label>
                    <label className="grid gap-2 md:col-span-2">
                      <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Requirement Text</span>
                      <input value={reward.requirement} onChange={(event) => updateReward(reward.id, { requirement: event.target.value })} className="rounded-2xl px-4 py-3" />
                    </label>
                    <label className="grid gap-2 md:col-span-2">
                      <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Required Mission IDs</span>
                      <input
                        value={missionIdsToText(reward.missionIds)}
                        onChange={(event) => updateReward(reward.id, { missionIds: textToMissionIds(event.target.value) })}
                        placeholder="q1, q2, social-follow"
                        className="rounded-2xl px-4 py-3"
                      />
                      <span style={{ color: "#64748b", fontSize: 11 }}>Leave empty to make this reward claimable by any connected wallet.</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            ["Total XP", profile?.xp ?? 0],
            ["Rewards Earned", formatRewardTotals(profile?.rewardTokenTotals, profile?.rewardsEarned ?? 0)],
            ["Completed", profile?.completedMissionIds.length ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="arc-card rounded-2xl p-5">
              <div style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
              <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900, marginTop: 8 }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {rewards.map((reward) => {
            const claimed = profile?.claimedRewardIds.includes(reward.id);
            const eligible = Boolean(isConnected && profile && (reward.missionIds.length === 0 || reward.missionIds.every((id) => profile.completedMissionIds.includes(id))));
            const isClaiming = claimingRewardId === reward.id;
            return (
              <div key={reward.id} className="arc-card rounded-3xl p-6">
                <div style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff" }}>{reward.title}</div>
                <p style={{ color: "#849495", fontSize: 13, marginTop: 8 }}>{reward.requirement}</p>
                <p style={{ color: eligible ? "#22c55e" : "#ffb7eb", fontSize: 12, marginTop: 10 }}>
                  {eligible ? "Eligible from verified missions" : reward.missionIds.length ? `Complete mission ID: ${reward.missionIds.join(", ")}` : "Connect wallet to claim"}
                </p>
                <div style={{ color: "#ff2db2", fontFamily: "'Space Grotesk'", fontSize: 26, fontWeight: 900, marginTop: 18 }}>{formatRewardAmount(reward.amount, reward.token)}</div>
                <button
                  disabled={!eligible || claimed || Boolean(claimingRewardId)}
                  onClick={() => claimTokenReward(reward)}
                  className="btn-primary w-full mt-5 py-3 rounded-xl"
                >
                  {claimed ? "Completed" : isClaiming ? "Paying..." : "Claim Reward"}
                </button>
              </div>
            );
          })}
        </div>
        {claimMessage && (
          <div className="arc-card rounded-2xl p-4 mt-5" style={{ color: claimMessage.includes("paid") ? "#22c55e" : "#ffb7eb", fontSize: 13 }}>
            {claimMessage}
          </div>
        )}

        <div className="arc-card rounded-3xl p-6 mt-6">
          <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff", marginBottom: 16 }}>Reward Activity</h2>
          <ActivityTimeline activities={profile?.activities ?? []} />
        </div>
      </div>
      <CongratulationsModal
        open={Boolean(successReward)}
        title="Congratulations"
        amount={successReward?.amount}
        message="Your reward has been paid to your connected wallet after mission verification."
        txHash={successReward?.txHash}
        onClose={() => setSuccessReward(null)}
      />
    </div>
  );
}
