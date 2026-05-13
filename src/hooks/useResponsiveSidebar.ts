"use client";

import { useEffect, useState } from "react";

export function useResponsiveSidebar() {
  const [isOverlay, setIsOverlay] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const sync = () => {
      const width = window.innerWidth;
      const nextOverlay = width < 1024;
      setIsOverlay(nextOverlay);
      setIsOpen(!nextOverlay);
      setIsCollapsed(width >= 1024 && width < 1320);
    };

    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const toggle = () => {
    if (isOverlay) {
      setIsOpen((value) => !value);
      return;
    }
    setIsCollapsed((value) => !value);
  };

  const closeMobile = () => {
    if (isOverlay) setIsOpen(false);
  };

  return {
    isOverlay,
    isOpen,
    isCollapsed,
    toggle,
    closeMobile,
    contentOffset: isOverlay ? "0rem" : isCollapsed ? "5.75rem" : "17.5rem",
  };
}
