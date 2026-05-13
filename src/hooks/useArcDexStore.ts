"use client";

import { useEffect, useState } from "react";
import { isAddress } from "ethers";
import type { ArcSwapToken, DexTransaction } from "@/lib/arc-dex";

const STORAGE_KEY = "arc-swap.store.v1";

interface DexStoreState {
  customTokens: ArcSwapToken[];
  transactions: DexTransaction[];
  swapPaused: boolean;
}

const DEFAULT_STATE: DexStoreState = {
  customTokens: [],
  transactions: [],
  swapPaused: false,
};

function readStore(): DexStoreState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function writeStore(store: DexStoreState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function useArcDexStore() {
  const [store, setStore] = useState<DexStoreState>(DEFAULT_STATE);

  useEffect(() => {
    setStore(readStore());
  }, []);

  const update = (next: DexStoreState) => {
    setStore(next);
    writeStore(next);
  };

  const addToken = (token: ArcSwapToken) => {
    if (token.address && !isAddress(token.address)) {
      throw new Error("Token address is not valid.");
    }
    const next = {
      ...store,
      customTokens: [...store.customTokens.filter((item) => item.symbol !== token.symbol), token],
    };
    update(next);
  };

  const toggleSwapPaused = () => {
    update({ ...store, swapPaused: !store.swapPaused });
  };

  const addTransaction = (transaction: DexTransaction) => {
    update({
      ...store,
      transactions: [transaction, ...store.transactions].slice(0, 20),
    });
  };

  return {
    store,
    addToken,
    toggleSwapPaused,
    addTransaction,
  };
}
