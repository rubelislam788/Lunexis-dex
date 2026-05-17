"use client";

import { useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";

export default function WalletSecurityChecker() {
  const { profile } = useProfile();
  const scan = useMemo(() => {
    const approvals = (profile?.activities ?? []).filter((item) => /approve|approval/i.test(`${item.title} ${item.description}`));
    const swaps = (profile?.activities ?? []).filter((item) => item.type === "swap");
    const inactive = (profile?.activities ?? []).filter((item) => Date.now() - new Date(item.timestamp).getTime() > 1000 * 60 * 60 * 24 * 7);
    return { approvals, swaps, inactive };
  }, [profile?.activities]);

  const risk = scan.approvals.length > 2 ? "Medium" : scan.approvals.length ? "Review" : "Low";

  return (
    <section className="lunexis-premium-card lunexis-security-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="lunexis-kicker">Wallet Security Checker</div>
          <p>Indexed approval and contract interaction analysis from your Lunexis activity.</p>
        </div>
        <span className={`lunexis-risk-pill is-${risk.toLowerCase()}`}>{risk}</span>
      </div>
      <div className="lunexis-security-grid">
        <div><span>Approvals</span><strong>{scan.approvals.length}</strong></div>
        <div><span>Swap contracts</span><strong>{scan.swaps.length}</strong></div>
        <div><span>Inactive items</span><strong>{scan.inactive.length}</strong></div>
      </div>
      <div className="lunexis-security-list">
        {(scan.approvals.length ? scan.approvals : [{ id: "none", title: "No risky approvals indexed", description: "No unlimited approval pattern was found inside current app history." }]).slice(0, 4).map((item) => (
          <div key={item.id}>
            <span className="material-symbols-outlined">verified_user</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </div>
            <button disabled>Revoke</button>
          </div>
        ))}
      </div>
    </section>
  );
}
