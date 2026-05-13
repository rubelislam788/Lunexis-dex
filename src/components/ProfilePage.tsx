"use client";

import type { ChangeEvent } from "react";
import { useProfile } from "@/hooks/useProfile";
import { ARC_FAUCET_URL } from "@/lib/constants";
import { TOKEN_META } from "@/lib/tokens";
import TokenIcon from "@/components/ui/TokenIcon";
import ActivityTimeline from "@/components/ActivityTimeline";

export default function ProfilePage() {
  const { profile, address, isConnected, update } = useProfile();

  const handleAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ avatarDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  if (!isConnected || !profile) {
    return (
      <div className="min-h-screen pt-16 pl-64 arc-page-shell">
        <div className="relative z-10 max-w-4xl mx-auto px-8 py-16 text-center">
          <div className="arc-card rounded-3xl p-10">
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 36, fontWeight: 900, color: "#f8fbff" }}>Connect Wallet</h1>
            <p style={{ color: "#849495", marginTop: 10 }}>Your editable profile, rewards, balances, and history appear after wallet connection.</p>
            <a href={ARC_FAUCET_URL} target="_blank" rel="noreferrer" className="btn-primary inline-block mt-6 px-6 py-3 rounded-xl">Open Faucet</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pl-64 arc-page-shell">
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="arc-card rounded-3xl p-6">
            <div className="flex items-center gap-4">
              <label className="relative cursor-pointer">
                {profile.avatarDataUrl ? (
                  <img src={profile.avatarDataUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover" style={{ border: "1px solid rgba(56,189,248,0.45)", boxShadow: "0 0 34px rgba(56,189,248,0.28)" }} />
                ) : (
                  <span className="w-24 h-24 rounded-full grid place-items-center" style={{ background: "linear-gradient(135deg,#38bdf8,#ff2db2)", color: "white", fontFamily: "'Space Grotesk'", fontSize: 24, fontWeight: 900, boxShadow: "0 0 34px rgba(56,189,248,0.28)" }}>OP</span>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              </label>
              <div>
                <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900, color: "#f8fbff" }}>{profile.username}</h1>
                <p style={{ color: "#849495", fontSize: 12 }}>{address?.slice(0, 6)}...{address?.slice(-4)}</p>
              </div>
            </div>

            <div className="grid gap-3 mt-6">
              {[
                ["username", "Username", profile.username],
                ["xUsername", "Twitter/X", profile.xUsername],
                ["githubUsername", "GitHub", profile.githubUsername],
              ].map(([key, label, value]) => (
                <label key={key} style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "#849495", textTransform: "uppercase" }}>
                  {label}
                  <input
                    value={value}
                    onChange={(e) => update({ [key]: e.target.value } as any)}
                    className="mt-1 w-full px-4 py-3 rounded-xl"
                    placeholder={label}
                  />
                </label>
              ))}
            </div>

            <a href={ARC_FAUCET_URL} target="_blank" rel="noreferrer" className="btn-primary block text-center mt-5 px-5 py-3 rounded-xl">Open Arc Faucet</a>

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
              ["Rewards", `${profile.rewardsEarned.toLocaleString()} ARCQ`],
              ["Missions", `${profile.completedMissionIds.length} done`],
            ].map(([label, value]) => (
              <div key={label} className="arc-card rounded-2xl p-5">
                <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "#849495", letterSpacing: "0.1em" }}>{label}</div>
                <div style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900, color: "#38bdf8", marginTop: 8 }}>{value}</div>
              </div>
            ))}

            <div className="md:col-span-3 arc-card rounded-3xl p-6">
              <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff", marginBottom: 16 }}>Portfolio Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {profile.balances.map((balance) => (
                  <div key={balance.token} className="p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${TOKEN_META[balance.token].accent}44` }}>
                    <TokenIcon symbol={balance.token} size={42} />
                    <div style={{ fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 900, color: "#f8fbff", marginTop: 10 }}>{balance.amount} {balance.token}</div>
                    <div style={{ color: "#849495", fontSize: 11 }}>{balance.value}</div>
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
    </div>
  );
}
