// src/components/ui/Toast.tsx
"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}

export function Toast({ message, type = "info", onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: { bg: "rgba(0,220,229,0.08)", border: "rgba(0,220,229,0.3)", color: "#00dce5" },
    error: { bg: "rgba(255,80,80,0.08)", border: "rgba(255,80,80,0.3)", color: "#ffb4ab" },
    info: { bg: "rgba(0,220,229,0.08)", border: "rgba(0,220,229,0.3)", color: "#e5e2e3" },
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
        borderRadius: 10,
        background: c.bg,
        border: `1px solid ${c.border}`,
        backdropFilter: "blur(12px)",
        animation: "slideUp 0.2s ease",
      }}
    >
      <span style={{ color: c.color, fontSize: 14, fontFamily: "'Space Grotesk'", fontWeight: 600 }}>
        {message}
      </span>
      <button onClick={onClose} style={{ color: "#555", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>
        ×
      </button>
    </div>
  );
}

// Hook
export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" | "info" }>>([]);

  const show = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
  };

  const remove = (id: number) => setToasts((p) => p.filter((t) => t.id !== id));

  const ToastContainer = () => (
    <>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
      ))}
    </>
  );

  return { show, ToastContainer };
}
