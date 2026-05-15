"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import { formatRewardTotals } from "@/lib/rewards";
import { TOKEN_META } from "@/lib/tokens";
import TokenIcon from "@/components/ui/TokenIcon";
import ActivityTimeline from "@/components/ActivityTimeline";

export default function ProfilePage() {
  const { profile, address, isConnected, update } = useProfile();
  const { balances, isLoading: balancesLoading, lastUpdated, refresh } = usePortfolioBalances();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ username: "", xUsername: "", githubUsername: "", avatarDataUrl: "" });

  const handleAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((prev) => ({ ...prev, avatarDataUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const openEdit = () => {
    if (!profile) return;
    setDraft({
      username: profile.username,
      xUsername: profile.xUsername,
      githubUsername: profile.githubUsername,
      avatarDataUrl: profile.avatarDataUrl ?? "",
    });
    setIsEditing(true);
  };

  if (!isConnected || !profile) {
    return (
      <div className="arc-with-sidebar-page arc-page-shell">
        <div className="relative z-10 max-w-4xl mx-auto px-8 py-16 text-center">
          <div className="arc-card rounded-3xl p-10">
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 36, fontWeight: 900, color: "#f8fbff" }}>Connect Wallet</h1>
            <p style={{ color: "#849495", marginTop: 10 }}>Your editable profile, rewards, balances, and history appear after wallet connection.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="arc-card rounded-3xl p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                {profile.avatarDataUrl ? (
                  <img src={profile.avatarDataUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover" style={{ border: "1px solid rgba(56,189,248,0.45)", boxShadow: "0 0 34px rgba(56,189,248,0.28)" }} />
                ) : (
                  <span className="w-24 h-24 rounded-full grid place-items-center" style={{ background: "linear-gradient(135deg,#38bdf8,#ff2db2)", color: "white", fontFamily: "'Space Grotesk'", fontSize: 24, fontWeight: 900, boxShadow: "0 0 34px rgba(56,189,248,0.28)" }}>OP</span>
                )}
              </div>
              <div>
                <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900, color: "#f8fbff" }}>{profile.username}</h1>
                <p style={{ color: "#849495", fontSize: 12 }}>{address?.slice(0, 6)}...{address?.slice(-4)}</p>
              </div>
            </div>

            <div className="grid gap-3 mt-6">
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ color: "#849495", fontSize: 11 }}>Twitter/X</div>
                <div style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{profile.xUsername || "Not set"}</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ color: "#849495", fontSize: 11 }}>GitHub</div>
                <div style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontWeight: 800 }}>{profile.githubUsername || "Not set"}</div>
              </div>
            </div>

            <button onClick={openEdit} className="btn-outline-cyan w-full mt-5 px-5 py-3 rounded-xl">Edit Profile</button>
            <div className="mt-5">
              <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 900, color: "#f8fbff", marginBottom: 10 }}>Connected Wallets</h2>
              <div className="grid gap-2">
                {profile.wallets.map((wallet) => (
                  <div key={wallet} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 12 }}>
                    {wallet.slice(0, 8)}...{wallet.slice(-6)}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ["XP", profile.xp.toLocaleString()],
              ["Rewards", formatRewardTotals(profile.rewardTokenTotals, profile.rewardsEarned)],
              ["Missions", `${profile.completedMissionIds.length} done`],
            ].map(([label, value]) => (
              <div key={label} className="arc-card rounded-2xl p-5">
                <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "#849495", letterSpacing: "0.1em" }}>{label}</div>
                <div style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900, color: "#38bdf8", marginTop: 8 }}>{value}</div>
              </div>
            ))}

            <div className="md:col-span-3 arc-card rounded-3xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff" }}>Live Portfolio</h2>
                  <p style={{ color: "#849495", fontSize: 12, marginTop: 4 }}>
                    {lastUpdated ? `Synced ${lastUpdated}` : "Reading balances from your connected wallet"}
                  </p>
                </div>
                <button onClick={refresh} disabled={balancesLoading} className="btn-ghost px-4 py-2 rounded-xl" style={{ fontSize: 11 }}>
                  {balancesLoading ? "Syncing..." : "Refresh"}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {balances.map((balance) => (
                  <div key={balance.token} className="p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${TOKEN_META[balance.token].accent}44` }}>
                    <TokenIcon symbol={balance.token} size={42} />
                    <div style={{ fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 900, color: "#f8fbff", marginTop: 10 }}>
                      {balance.isLoading ? <span className="arc-skeleton inline-block w-16 h-4 rounded-full" /> : `${balance.amount} ${balance.token}`}
                    </div>
                    <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 900 }}>{balance.value}</div>
                    <div style={{ color: "#849495", fontSize: 10 }}>{balance.unitPrice}</div>
                    <div style={{ color: "#5f778b", fontSize: 10, marginTop: 3 }}>{balance.chain}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-3 arc-card rounded-3xl p-6">
              <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff", marginBottom: 16 }}>Activity Timeline</h2>
              <ActivityTimeline activities={profile.activities} />
            </div>
          </section>
        </div>
      </div>
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }}>
          <div className="arc-card rounded-3xl p-6 w-[min(520px,92vw)]">
            <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: 900, color: "#f8fbff", marginBottom: 18 }}>Edit Profile</h2>
            <label className="flex items-center gap-4 cursor-pointer mb-5">
              {draft.avatarDataUrl ? (
                <img src={draft.avatarDataUrl} alt="Profile draft" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <span className="w-20 h-20 rounded-full grid place-items-center" style={{ background: "linear-gradient(135deg,#38bdf8,#ff2db2)", color: "white", fontFamily: "'Space Grotesk'", fontWeight: 900 }}>OP</span>
              )}
              <span className="btn-ghost px-4 py-3 rounded-xl">Upload Picture</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            </label>
            {[
              ["username", "Username"],
              ["xUsername", "Twitter/X"],
              ["githubUsername", "GitHub"],
            ].map(([key, label]) => (
              <label key={key} className="block mb-3" style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "#849495", textTransform: "uppercase" }}>
                {label}
                <input value={(draft as any)[key]} onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl" />
              </label>
            ))}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setIsEditing(false)} className="btn-ghost flex-1 py-3 rounded-xl">Cancel</button>
              <button onClick={() => { update(draft); setIsEditing(false); }} className="btn-primary flex-1 py-3 rounded-xl">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
