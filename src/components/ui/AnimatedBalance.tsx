"use client";

import { useEffect, useRef, useState } from "react";

function parseAmount(value: string) {
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatAmount(value: number, suffix = "") {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: value >= 1 ? 2 : 4,
    maximumFractionDigits: value >= 1000 ? 2 : value >= 1 ? 4 : 6,
  })}${suffix ? ` ${suffix}` : ""}`;
}

export default function AnimatedBalance({ value, suffix = "", className = "" }: { value: string | number; suffix?: string; className?: string }) {
  const target = typeof value === "number" ? value : parseAmount(value);
  const previousTarget = useRef(target);
  const [display, setDisplay] = useState(target);
  const [direction, setDirection] = useState<"up" | "down" | "flat">("flat");

  useEffect(() => {
    const from = display;
    const to = target;
    const delta = to - previousTarget.current;
    previousTarget.current = to;
    setDirection(delta > 0 ? "up" : delta < 0 ? "down" : "flat");

    let frame = 0;
    const total = 24;
    let raf = 0;
    const tick = () => {
      frame += 1;
      const progress = 1 - Math.pow(1 - frame / total, 3);
      setDisplay(from + (to - from) * progress);
      if (frame < total) raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    const timer = window.setTimeout(() => setDirection("flat"), 900);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [target]);

  return (
    <span className={`lunexis-animated-balance ${direction !== "flat" ? `is-${direction}` : ""} ${className}`}>
      {formatAmount(display, suffix)}
    </span>
  );
}
