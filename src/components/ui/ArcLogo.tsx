"use client";

import LunexisLogoMark from "@/components/ui/LunexisLogoMark";

export default function ArcLogo({
  size = 40,
  compact = false,
}: {
  size?: number;
  compact?: boolean;
}) {
  const labelSize = compact ? 14 : 18;
  return (
    <div className="flex items-center gap-3">
      <span
        className="relative grid place-items-center rounded-[18px] lunexis-header-logo"
        style={{
          width: size,
          height: size,
        }}
      >
        <LunexisLogoMark size={size * 1.08} animated />
      </span>
      <div>
        <div
          style={{
            fontFamily: "'Space Grotesk'",
            fontSize: labelSize,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "#F5FBFF",
            lineHeight: 1,
          }}
        >
          Lunexis
        </div>
        <div
          style={{
            fontFamily: "'Space Grotesk'",
            fontSize: compact ? 8 : 9,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#7DDFFF",
            marginTop: 4,
          }}
        >
          ARC Chain DEX
        </div>
      </div>
    </div>
  );
}
