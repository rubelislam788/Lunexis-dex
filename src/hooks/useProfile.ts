"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { ActivityItem, UserProfile } from "@/types";
import { addActivity, addWalletToProfile, claimReward, completeMission, convertXpReward, loadProfile, loadRemoteProfile, saveProfile, updateProfile } from "@/lib/profile";

export function useProfile() {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const refresh = useCallback(() => {
    setProfile(loadProfile(address));
  }, [address]);

  useEffect(() => {
    refresh();
    window.addEventListener("arc-profile-updated", refresh);
    return () => window.removeEventListener("arc-profile-updated", refresh);
  }, [refresh]);

  useEffect(() => {
    if (isConnected && address) {
      setProfile(addWalletToProfile(address, address));
      void loadRemoteProfile(address).then((remote) => {
        if (remote) setProfile(addWalletToProfile(address, address));
      });
    }
    if (!isConnected) setProfile(null);
  }, [address, isConnected]);

  const update = useCallback((patch: Partial<UserProfile>) => {
    if (!address) return null;
    const next = updateProfile(address, patch);
    setProfile(next);
    return next;
  }, [address]);

  const save = useCallback((next: UserProfile) => {
    const saved = saveProfile(next);
    setProfile(saved);
    return saved;
  }, []);

  const pushActivity = useCallback((activity: ActivityItem) => {
    if (!address) return null;
    const next = addActivity(address, activity);
    setProfile(next);
    return next;
  }, [address]);

  const markMissionComplete = useCallback((missionId: string, xp: number) => {
    if (!address) return null;
    const next = completeMission(address, missionId, xp);
    setProfile(next);
    return next;
  }, [address]);

  const claim = useCallback((rewardId: string, amount: number, token?: Parameters<typeof claimReward>[3], txHash?: string) => {
    if (!address) return null;
    const next = claimReward(address, rewardId, amount, token, txHash);
    setProfile(next);
    return next;
  }, [address]);

  const convertXp = useCallback((rewardId: string, xpCost: number, amount: number, token?: Parameters<typeof convertXpReward>[4], txHash?: string) => {
    if (!address) return null;
    const next = convertXpReward(address, rewardId, xpCost, amount, token, txHash);
    setProfile(next);
    return next;
  }, [address]);

  return { profile, address, isConnected, update, save, pushActivity, markMissionComplete, claim, convertXp, refresh };
}
