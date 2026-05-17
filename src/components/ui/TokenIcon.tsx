import { TOKEN_META } from "@/lib/tokens";
import type { TokenSymbol } from "@/types";

export default function TokenIcon({ symbol, size = 36 }: { symbol: TokenSymbol; size?: number }) {
  const token = TOKEN_META[symbol];
  const showArcBadge = symbol === "USDC" || symbol === "EURC";
  const badgeSize = Math.max(15, Math.round(size * 0.42));

  return (
    <span
      className="relative inline-grid place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: "rgba(255,255,255,0.08)",
        border: `1px solid ${token.accent}66`,
        boxShadow: `0 0 18px ${token.accent}44`,
        flexShrink: 0,
      }}
    >
      <img
        src={token.logoSrc}
        alt={`${token.symbol} logo`}
        style={{ width: size * 0.72, height: size * 0.72, objectFit: "contain", borderRadius: 999, filter: "none", imageRendering: "auto" }}
      />
      {showArcBadge && (
        <span
          aria-hidden="true"
          className="absolute grid place-items-center rounded-full"
          style={{
            right: -Math.max(1, Math.round(size * 0.08)),
            bottom: -Math.max(1, Math.round(size * 0.08)),
            width: badgeSize,
            height: badgeSize,
            background: "#06203d",
            border: "1px solid rgba(125, 211, 252, 0.8)",
            boxShadow: "0 0 0 1px rgba(4, 24, 55, 0.9), 0 0 10px rgba(56, 189, 248, 0.55)",
            overflow: "hidden",
          }}
        >
          <img
            src="/arc-assets/arc-badge.png"
            alt=""
            style={{
              width: badgeSize,
              height: badgeSize,
              objectFit: "cover",
              objectPosition: "center",
              filter: "contrast(1.08) brightness(1.08)",
            }}
          />
        </span>
      )}
    </span>
  );
}
