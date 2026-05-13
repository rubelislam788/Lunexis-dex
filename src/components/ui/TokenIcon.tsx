import { TOKEN_META } from "@/lib/tokens";
import type { TokenSymbol } from "@/types";

export default function TokenIcon({ symbol, size = 36 }: { symbol: TokenSymbol; size?: number }) {
  const token = TOKEN_META[symbol];
  return (
    <span
      className="inline-grid place-items-center rounded-full"
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
        style={{ width: size * 0.72, height: size * 0.72, objectFit: "contain", borderRadius: 999 }}
      />
    </span>
  );
}
