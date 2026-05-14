"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { arcPublicClient, sepoliaPublicClient } from "@/lib/onchain";
import { loadAllProfiles } from "@/lib/profile";

export interface AppStats {
  profiles: number;
  missionsCompleted: number;
  rewardsClaimed: number;
  swaps: number;
  bridges: number;
  arcBlock: string;
  sepoliaBlock: string;
  arcGasPrice: string;
  lastSynced: string;
  isLoading: boolean;
}

function getProfileTotals() {
  const profiles = loadAllProfiles();
  return {
    profiles: profiles.length,
    missionsCompleted: profiles.reduce((sum, profile) => sum + profile.completedMissionIds.length, 0),
    rewardsClaimed: profiles.reduce((sum, profile) => sum + profile.rewardsEarned, 0),
    swaps: profiles.reduce((sum, profile) => sum + profile.activities.filter((item) => item.type === "swap" && item.status === "completed").length, 0),
    bridges: profiles.reduce((sum, profile) => sum + profile.activities.filter((item) => item.type === "bridge" && item.status === "completed").length, 0),
  };
}

export function useAppStats(refreshMs = 15000): AppStats & { refresh: () => Promise<void> } {
  const [snapshot, setSnapshot] = useState<Omit<AppStats, "isLoading">>({
    ...getProfileTotals(),
    arcBlock: "0",
    sepoliaBlock: "0",
    arcGasPrice: "0",
    lastSynced: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [arcBlock, sepoliaBlock, arcGasPrice] = await Promise.all([
        arcPublicClient.getBlockNumber().catch(() => BigInt(0)),
        sepoliaPublicClient.getBlockNumber().catch(() => BigInt(0)),
        arcPublicClient.getGasPrice().catch(() => BigInt(0)),
      ]);

      setSnapshot({
        ...getProfileTotals(),
        arcBlock: arcBlock.toLocaleString(),
        sepoliaBlock: sepoliaBlock.toLocaleString(),
        arcGasPrice: `${Number(formatUnits(arcGasPrice, 18)).toLocaleString(undefined, { maximumFractionDigits: 8 })} USDC`,
        lastSynced: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      void refresh();
    };

    sync();
    const interval = window.setInterval(sync, refreshMs);
    window.addEventListener("arc-profile-updated", sync);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("arc-profile-updated", sync);
    };
  }, [refresh, refreshMs]);

  return useMemo(() => ({ ...snapshot, isLoading, refresh }), [isLoading, refresh, snapshot]);
}
