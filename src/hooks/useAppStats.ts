"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { arcPublicClient, sepoliaPublicClient } from "@/lib/onchain";
import { loadAllProfiles, loadRemoteProfiles } from "@/lib/profile";
import type { UserProfile } from "@/types";

export interface AppStats {
  profiles: number;
  missionsCompleted: number;
  rewardsClaimed: number;
  rewardTokenTotals: Partial<Record<"USDC" | "EURC", number>>;
  swaps: number;
  bridges: number;
  arcBlock: string;
  sepoliaBlock: string;
  arcGasPrice: string;
  lastSynced: string;
  isLoading: boolean;
}

function getProfileTotals(profiles: UserProfile[] = loadAllProfiles()) {
  return {
    profiles: profiles.length,
    missionsCompleted: profiles.reduce((sum, profile) => sum + profile.completedMissionIds.length, 0),
    rewardsClaimed: profiles.reduce((sum, profile) => sum + profile.rewardsEarned, 0),
    rewardTokenTotals: profiles.reduce<Partial<Record<"USDC" | "EURC", number>>>((totals, profile) => {
      totals.USDC = (totals.USDC ?? 0) + (profile.rewardTokenTotals?.USDC ?? 0);
      totals.EURC = (totals.EURC ?? 0) + (profile.rewardTokenTotals?.EURC ?? 0);
      return totals;
    }, {}),
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

      const remoteProfiles = await loadRemoteProfiles();

      setSnapshot({
        ...getProfileTotals(remoteProfiles),
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
