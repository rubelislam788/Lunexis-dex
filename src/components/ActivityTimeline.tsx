"use client";

import type { ActivityItem } from "@/types";
import TokenIcon from "@/components/ui/TokenIcon";

export default function ActivityTimeline({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return <p style={{ color: "#849495", fontSize: 13 }}>No activity yet. Connect, swap, bridge, or complete missions to start your timeline.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {activities.slice(0, 8).map((item) => (
        <div key={item.id} className="flex gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
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
        </div>
      ))}
    </div>
  );
}
