"use client";

import { useState } from "react";
import type { ActivityItem } from "@/types";
import { ARC_TESTNET_EXPLORER_URL } from "@/lib/arc-kit";
import TokenIcon from "@/components/ui/TokenIcon";

export default function ActivityTimeline({ activities }: { activities: ActivityItem[] }) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  if (activities.length === 0) {
    return <p style={{ color: "#849495", fontSize: 13 }}>No activity yet. Connect, swap, stake, or complete missions to start your timeline.</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {activities.slice(0, 8).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedActivity(item)}
            className="group flex w-full gap-3 p-3 rounded-xl text-left transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              cursor: "pointer",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "rgba(56,189,248,0.075)";
              event.currentTarget.style.borderColor = "rgba(56,189,248,0.22)";
              event.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "rgba(255,255,255,0.03)";
              event.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              event.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {item.token ? (
              <TokenIcon symbol={item.token} size={34} />
            ) : (
              <span className="material-symbols-outlined" style={{ color: "#38bdf8", fontSize: 24 }}>auto_awesome</span>
            )}
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 800, color: "#f8fbff" }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#849495", lineHeight: 1.5 }}>{item.description}</div>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 10, color: "#556575", marginTop: 4 }}>
                {new Date(item.timestamp).toLocaleString()}
              </div>
            </div>
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, color: item.status === "failed" ? "#ffb4ab" : "#00dce5", textTransform: "uppercase" }}>
              {item.status ?? "completed"}
            </span>
          </button>
        ))}
      </div>

      {selectedActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.76)", backdropFilter: "blur(12px)" }}
          onClick={() => setSelectedActivity(null)}
        >
          <div className="arc-card rounded-[28px] p-6 w-[min(460px,92vw)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                {selectedActivity.token ? (
                  <TokenIcon symbol={selectedActivity.token} size={44} />
                ) : (
                  <span className="material-symbols-outlined w-11 h-11 rounded-2xl grid place-items-center" style={{ color: "#38bdf8", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.22)" }}>auto_awesome</span>
                )}
                <div>
                  <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    Activity Details
                  </div>
                  <h3 style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontSize: 20, fontWeight: 900 }}>{selectedActivity.title}</h3>
                </div>
              </div>
              <button onClick={() => setSelectedActivity(null)} className="btn-ghost px-3 py-2 rounded-full" aria-label="Close activity details">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="grid gap-3">
              <DetailRow label="Description" value={selectedActivity.description} />
              <DetailRow label="Status" value={selectedActivity.status ?? "completed"} />
              <DetailRow label="Type" value={selectedActivity.type} />
              <DetailRow label="Time" value={new Date(selectedActivity.timestamp).toLocaleString()} />
              {selectedActivity.token && <DetailRow label="Token" value={selectedActivity.token} />}
              {selectedActivity.txHash && <DetailRow label="Transaction" value={`${selectedActivity.txHash.slice(0, 10)}...${selectedActivity.txHash.slice(-8)}`} />}
            </div>

            {selectedActivity.txHash && (
              <a href={`${ARC_TESTNET_EXPLORER_URL}/tx/${selectedActivity.txHash}`} target="_blank" rel="noreferrer" className="btn-primary block text-center w-full py-3 rounded-2xl mt-5">
                View Transaction
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: "#f8fbff", fontSize: 13, lineHeight: 1.5, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}
