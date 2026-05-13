// src/components/ui/Toast.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}

export function Toast({ message, type = "info", onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 200);
    }, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: {
      bg: "rgba(0, 220, 229, 0.1)",
      border: "rgba(0, 220, 229, 0.35)",
      color: "#00dce5",
      glow: "0 0 16px rgba(0, 220, 229, 0.2)",
      icon: "✓",
    },
    error: {
      bg: "rgba(255, 107, 107, 0.1)",
      border: "rgba(255, 107, 107, 0.35)",
      color: "#ffb4ab",
      glow: "0 0 16px rgba(255, 107, 107, 0.15)",
      icon: "!",
    },
    info: {
      bg: "rgba(0, 220, 229, 0.1)",
      border: "rgba(0, 220, 229, 0.35)",
      color: "#e5e2e3",
      glow: "0 0 12px rgba(0, 220, 229, 0.15)",
      icon: "ℹ",
    },
  };
  const c = colors[type];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 20px",
        borderRadius: 14,
        background: c.bg,
        border: `1px solid ${c.border}`,
        backdropFilter: "blur(12px)",
        boxShadow: c.glow,
        animation: isExiting ? "toastSlideOut 0.2s ease forwards" : "toastSlideIn 0.24s ease both",
      } as any}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: 999,
          background: `${c.color}22`,
          color: c.color,
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {c.icon}
      </span>
      <span style={{ color: c.color, fontSize: 14, fontFamily: "'Space Grotesk'", fontWeight: 600, flexGrow: 1 }}>
        {message}
      </span>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(onClose, 200);
        }}
        style={{
          color: c.color,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 20,
          opacity: 0.7,
          transition: "opacity 0.2s ease",
          padding: 0,
          width: 20,
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = "1")}
        onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = "0.7")}
      >
        ×
      </button>
    </div>
  );
}

// Hook
export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" | "info" }>>([]);

  const show = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
  }, []);

  const remove = useCallback((id: number) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  const ToastContainer = () => (
    <>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
      ))}
    </>
  );

  return { show, ToastContainer };
}
