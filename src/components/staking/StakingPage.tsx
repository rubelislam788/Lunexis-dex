"use client";

import { useMemo, useState } from "react";
import { parseUnits } from "viem";
import { useStaking } from "@/hooks/useStaking";
import type { StakingPoolView, StakingToken } from "@/lib/staking";
import TokenIcon from "@/components/ui/TokenIcon";
import { useToast } from "@/components/ui/Toast";

function numeric(value?: string) {
  const parsed = Number(String(value ?? "0").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDuration(seconds: number) {
  if (!seconds) return "Flexible";
  const days = Math.max(1, Math.round(seconds / 86400));
  return `${days} day${days === 1 ? "" : "s"}`;
}

function parseTokenAmount(value: string, decimals: number) {
  try {
    return parseUnits(value || "0", decimals);
  } catch {
    return null;
  }
}

function tokenAvatar(token: StakingToken, size = 42) {
  if (token.symbol === "USDC" || token.symbol === "EURC") {
    return <TokenIcon symbol={token.symbol as any} size={size} />;
  }
  return (
    <span className="lunexis-stake-token-avatar" style={{ width: size, height: size, background: `linear-gradient(135deg, ${token.accent}, rgba(255,45,178,0.72))` }}>
      {token.symbol.slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function StakingPage() {
  const staking = useStaking();
  const { show, ToastContainer } = useToast();
  const [tokenSearch, setTokenSearch] = useState("");
  const [poolAmounts, setPoolAmounts] = useState<Record<number, string>>({});
  const [unstakeAmounts, setUnstakeAmounts] = useState<Record<number, string>>({});
  const [actionModal, setActionModal] = useState<{ mode: "stake" | "unstake"; pool: StakingPoolView } | null>(null);
  const [infoPool, setInfoPool] = useState<StakingPoolView | null>(null);

  const totals = useMemo(() => {
    const staked = staking.pools.reduce((sum, pool) => sum + numeric(pool.userStaked), 0);
    const rewards = staking.pools.reduce((sum, pool) => sum + numeric(pool.pendingReward), 0);
    const active = staking.pools.filter((pool) => numeric(pool.userStaked) > 0).length;
    return { staked, rewards, active };
  }, [staking.pools]);
  const visiblePools = useMemo(() => {
    const query = tokenSearch.trim().toLowerCase();
    if (!query) return staking.pools;
    return staking.pools.filter((pool) =>
      pool.token.symbol.toLowerCase().includes(query) ||
      pool.token.name.toLowerCase().includes(query) ||
      pool.token.address.toLowerCase().includes(query)
    );
  }, [staking.pools, tokenSearch]);
  const modalPool = actionModal ? staking.pools.find((pool) => pool.id === actionModal.pool.id) ?? actionModal.pool : null;
  const currentInfoPool = infoPool ? staking.pools.find((pool) => pool.id === infoPool.id) ?? infoPool : null;

  const run = async (label: string, action: () => Promise<any>) => {
    try {
      const result = await action();
      show(result?.hash ? `${label} confirmed` : `${label} ready`, "success");
      return result;
    } catch (error: any) {
      show(error?.shortMessage || error?.message || `${label} failed`, "error");
      return undefined;
    }
  };

  const setStakePercent = (pool: StakingPoolView, percent: number) => {
    const balance = numeric(pool.token.balance);
    const next = percent === 100 ? balance : balance * percent / 100;
    setPoolAmounts((prev) => ({ ...prev, [pool.id]: next.toFixed(next >= 1 ? 4 : 6).replace(/\.?0+$/, "") }));
  };

  const setUnstakePercent = (pool: StakingPoolView, percent: number) => {
    const staked = numeric(pool.userStaked);
    const next = percent === 100 ? staked : staked * percent / 100;
    setUnstakeAmounts((prev) => ({ ...prev, [pool.id]: next.toFixed(next >= 1 ? 4 : 6).replace(/\.?0+$/, "") }));
  };

  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <ToastContainer />
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <div className="lunexis-staking-hero">
          <div>
            <div className="lunexis-kicker">ARC Testnet Staking</div>
            <h1>Stake Any ARC Token</h1>
            <p>Stake allowed ARC Testnet tokens, track live pending rewards, and manage real wallet transactions from the new Lunexis staking contract.</p>
          </div>
          <div className="lunexis-staking-network">
            <span className="material-symbols-outlined">hub</span>
            ARC Testnet Only
          </div>
        </div>

        <section className="lunexis-staking-stats">
          <div><span>Active pools</span><strong>{staking.pools.length}</strong></div>
          <div><span>My staked assets</span><strong>{totals.active}</strong></div>
          <div><span>Pending rewards</span><strong>{totals.rewards.toLocaleString(undefined, { maximumFractionDigits: 4 })}</strong></div>
          <div><span>Last sync</span><strong>{staking.lastUpdated || "Live"}</strong></div>
        </section>

        {staking.wrongNetwork && (
          <section className="lunexis-staking-alert">
            <div>
              <strong>Switch to ARC Testnet</strong>
              <span>Staking works only on ARC Testnet. Switch your wallet before approving or staking.</span>
            </div>
            <button onClick={() => run("Network switched", staking.ensureArcNetwork)} disabled={staking.isSwitching}>
              {staking.isSwitching ? "Switching..." : "Switch Network"}
            </button>
          </section>
        )}

        {!staking.managerReady ? (
          <StakingInitializing />
        ) : (
        <div className="lunexis-staking-layout grid grid-cols-1 gap-6">
          <main className="grid gap-6">
            <section className="lunexis-premium-card">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div>
                  <div className="lunexis-kicker">Active Pools</div>
                  <h2>Stake Pools</h2>
                </div>
                <div className="lunexis-staking-search">
                  <span className="material-symbols-outlined">search</span>
                  <input value={tokenSearch} onChange={(event) => setTokenSearch(event.target.value)} placeholder="Search token, symbol, address" />
                </div>
              </div>

              {staking.pools.length === 0 ? (
                <EmptyStakingGuide />
              ) : (
                <div className="lunexis-staking-pool-grid">
                  {visiblePools.map((pool) => (
                    <PoolCard
                      key={pool.id}
                      pool={pool}
                      isConnected={staking.isConnected}
                      wrongNetwork={staking.wrongNetwork}
                      status={staking.status}
                      onStake={() => setActionModal({ mode: "stake", pool })}
                      onUnstake={() => setActionModal({ mode: "unstake", pool })}
                      onClaim={() => run("Claim rewards", () => staking.claim(pool))}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="lunexis-premium-card">
              <div className="lunexis-kicker">My Staked Assets</div>
              <h2>Reward Tracking</h2>
              <div className="lunexis-staking-activity">
                {staking.pools.filter((pool) => numeric(pool.userStaked) > 0 || numeric(pool.pendingReward) > 0).length === 0 ? (
                  <p>No active staking positions yet.</p>
                ) : staking.pools.filter((pool) => numeric(pool.userStaked) > 0 || numeric(pool.pendingReward) > 0).map((pool) => (
                  <div key={pool.id} onClick={() => setInfoPool(pool)} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && setInfoPool(pool)}>
                    {tokenAvatar(pool.token, 34)}
                    <div>
                      <strong>{pool.token.symbol} position</strong>
                      <span>{pool.userStaked} staked - {pool.pendingReward} {pool.rewardToken.symbol} pending</span>
                    </div>
                    <button
                      type="button"
                      className="lunexis-staking-position-status"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!pool.unlockAt || pool.unlockAt * 1000 <= Date.now()) setActionModal({ mode: "unstake", pool });
                      }}
                    >
                      {pool.unlockAt && pool.unlockAt * 1000 > Date.now() ? `Unlocks ${new Date(pool.unlockAt * 1000).toLocaleDateString()}` : "Unlocked"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </main>

          {staking.error && <aside className="grid gap-6 content-start"><div className="lunexis-staking-error">{staking.error}</div></aside>}
        </div>
        )}
      </div>
      {actionModal && modalPool && (
        <StakingActionModal
          mode={actionModal.mode}
          pool={modalPool}
          stakeAmount={poolAmounts[modalPool.id] ?? ""}
          unstakeAmount={unstakeAmounts[modalPool.id] ?? ""}
          status={staking.status}
          isConnected={staking.isConnected}
          wrongNetwork={staking.wrongNetwork}
          onStakeAmount={(value) => setPoolAmounts((prev) => ({ ...prev, [modalPool.id]: value }))}
          onUnstakeAmount={(value) => setUnstakeAmounts((prev) => ({ ...prev, [modalPool.id]: value }))}
          onStakePercent={(percent) => setStakePercent(modalPool, percent)}
          onUnstakePercent={(percent) => setUnstakePercent(modalPool, percent)}
          onClose={() => setActionModal(null)}
          onApprove={() => run("Approve", () => staking.approve(modalPool, poolAmounts[modalPool.id] ?? "0"))}
          onStake={async () => {
            const result = await run("Stake", () => staking.stake(modalPool, poolAmounts[modalPool.id] ?? "0"));
            if (result) setActionModal(null);
          }}
          onUnstake={async () => {
            const result = await run("Unstake", () => staking.unstake(modalPool, unstakeAmounts[modalPool.id] ?? "0"));
            if (result) setActionModal(null);
          }}
        />
      )}
      {currentInfoPool && (
        <StakeInfoModal
          pool={currentInfoPool}
          onClose={() => setInfoPool(null)}
          onUnstake={() => {
            setInfoPool(null);
            setActionModal({ mode: "unstake", pool: currentInfoPool });
          }}
        />
      )}
    </div>
  );
}

function PoolCard({
  pool,
  isConnected,
  wrongNetwork,
  status,
  onStake,
  onUnstake,
  onClaim,
}: {
  pool: StakingPoolView;
  isConnected: boolean;
  wrongNetwork: boolean;
  status: string;
  onStake: () => void;
  onUnstake: () => void;
  onClaim: () => void;
}) {
  const utilization = Math.min(100, numeric(pool.totalStaked) > 0 ? (numeric(pool.userStaked) / numeric(pool.totalStaked)) * 100 : 0);
  const userStakedRaw = parseTokenAmount(pool.userStaked || "0", pool.token.decimals) ?? BigInt(0);
  const pendingRaw = parseTokenAmount(pool.pendingReward || "0", pool.rewardToken.decimals) ?? BigInt(0);
  const claimBlockReason = !isConnected
    ? "Connect wallet"
    : wrongNetwork
      ? "Switch to ARC Testnet"
      : pendingRaw <= BigInt(0)
        ? "No rewards yet"
        : "";
  return (
    <article className="lunexis-staking-pool-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="lunexis-token-glow">{tokenAvatar(pool.token)}</span>
          <div>
            <h3>{pool.token.symbol} Staking</h3>
            <p>{pool.token.name}</p>
          </div>
        </div>
        <span>{pool.poolType}</span>
      </div>
      <div className="lunexis-pool-metrics">
        <div className="lunexis-apr-metric"><span>Balance</span><strong>{pool.token.balance ?? "0"}</strong></div>
        <div><span>Lock</span><strong>{formatDuration(pool.lockDuration)}</strong></div>
        <div><span>Totall stake balance</span><strong>{pool.rewardVaultBalance ?? "0"}</strong></div>
        <div><span>My stake</span><strong>{pool.userStaked}</strong></div>
        <div><span>Pending staking Reward</span><strong>{pool.pendingReward} {pool.rewardToken.symbol}</strong></div>
        <div><span>Network</span><strong>ARC Testnet</strong></div>
      </div>
      <div className="lunexis-utilization">
        <span>My stake vs contract balance</span>
        <i><b style={{ width: `${utilization}%` }} /></i>
      </div>
      {numeric(pool.token.balance) <= 0 && <div className="lunexis-staking-warning">Low balance detected for this token.</div>}
      <div className="lunexis-staking-actions">
        <button onClick={onStake} disabled={status !== "idle" || !isConnected || wrongNetwork}>Stake</button>
        <button onClick={onUnstake} disabled={status !== "idle" || !isConnected || wrongNetwork || userStakedRaw <= BigInt(0)}>Unstake</button>
        <button onClick={onClaim} disabled={status !== "idle" || Boolean(claimBlockReason)}>Claim</button>
      </div>
    </article>
  );
}

function StakingActionModal({
  mode,
  pool,
  stakeAmount,
  unstakeAmount,
  status,
  isConnected,
  wrongNetwork,
  onStakeAmount,
  onUnstakeAmount,
  onStakePercent,
  onUnstakePercent,
  onClose,
  onApprove,
  onStake,
  onUnstake,
}: {
  mode: "stake" | "unstake";
  pool: StakingPoolView;
  stakeAmount: string;
  unstakeAmount: string;
  status: string;
  isConnected: boolean;
  wrongNetwork: boolean;
  onStakeAmount: (value: string) => void;
  onUnstakeAmount: (value: string) => void;
  onStakePercent: (percent: number) => void;
  onUnstakePercent: (percent: number) => void;
  onClose: () => void;
  onApprove: () => void;
  onStake: () => void | Promise<void>;
  onUnstake: () => void | Promise<void>;
}) {
  const amount = mode === "stake" ? stakeAmount : unstakeAmount;
  const amountRaw = parseTokenAmount(amount, pool.token.decimals);
  const balanceRaw = parseTokenAmount(pool.token.balance || "0", pool.token.decimals) ?? BigInt(0);
  const userStakedRaw = parseTokenAmount(pool.userStaked || "0", pool.token.decimals) ?? BigInt(0);
  const hasAmount = Boolean(amountRaw && amountRaw > BigInt(0));
  const needsApproval = mode === "stake" && Boolean(hasAmount && pool.allowance !== undefined && pool.allowance < amountRaw!);
  const blockReason = !isConnected
    ? "Connect wallet"
    : wrongNetwork
      ? "Switch to ARC Testnet"
      : !hasAmount
        ? `Enter ${mode} amount`
        : mode === "stake" && amountRaw! > balanceRaw
          ? `Not enough ${pool.token.symbol}`
          : mode === "unstake" && amountRaw! > userStakedRaw
            ? "Amount exceeds stake"
            : "";

  return (
    <div className="lunexis-modal-overlay fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.48)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <section className="lunexis-premium-card w-[min(520px,94vw)] modal-enter" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${mode} ${pool.token.symbol}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {tokenAvatar(pool.token, 42)}
            <div>
              <div className="lunexis-kicker">{mode === "stake" ? "Stake" : "Unstake"}</div>
              <h2>{pool.token.symbol}</h2>
            </div>
          </div>
          <button onClick={onClose} className="arc-icon-action w-10 h-10 rounded-2xl" aria-label="Close staking modal">x</button>
        </div>

        <div className="lunexis-pool-metrics">
          <div><span>Balance</span><strong>{pool.token.balance ?? "0"}</strong></div>
          <div><span>Staked</span><strong>{pool.userStaked}</strong></div>
        </div>

        {mode === "stake" ? (
          <>
            <input value={stakeAmount} onChange={(event) => onStakeAmount(event.target.value)} placeholder={`Stake amount in ${pool.token.symbol}`} className="lunexis-staking-input" inputMode="decimal" autoFocus />
            <div className="lunexis-stake-percent-row">
              {[25, 50, 75, 100].map((percent) => (
                <button key={percent} onClick={() => onStakePercent(percent)}>{percent === 100 ? "MAX" : `${percent}%`}</button>
              ))}
            </div>
          </>
        ) : (
          <>
            <input value={unstakeAmount} onChange={(event) => onUnstakeAmount(event.target.value)} placeholder={`Unstake amount in ${pool.token.symbol}`} className="lunexis-staking-input" inputMode="decimal" autoFocus />
            <div className="lunexis-stake-percent-row">
              {[25, 50, 75, 100].map((percent) => (
                <button key={percent} onClick={() => onUnstakePercent(percent)}>{percent === 100 ? "MAX" : `${percent}%`}</button>
              ))}
            </div>
          </>
        )}

        {blockReason && <div className="lunexis-staking-warning">{blockReason}</div>}

        <div className="lunexis-staking-actions lunexis-staking-modal-actions mt-4">
          {needsApproval ? (
            <button onClick={onApprove} disabled={status !== "idle" || Boolean(blockReason)}>Approve</button>
          ) : (
            <button onClick={mode === "stake" ? onStake : onUnstake} disabled={status !== "idle" || Boolean(blockReason)}>
              {status !== "idle" ? "Pending..." : mode === "stake" ? "Stake" : "Unstake"}
            </button>
          )}
          <button onClick={onClose} disabled={status !== "idle"}>Cancel</button>
        </div>
      </section>
    </div>
  );
}

function StakeInfoModal({
  pool,
  onClose,
  onUnstake,
}: {
  pool: StakingPoolView;
  onClose: () => void;
  onUnstake: () => void;
}) {
  const isUnlocked = !pool.unlockAt || pool.unlockAt * 1000 <= Date.now();

  return (
    <div className="lunexis-modal-overlay fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.42)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <section className="lunexis-premium-card w-[min(560px,94vw)] modal-enter" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${pool.token.symbol} staking info`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {tokenAvatar(pool.token, 42)}
            <div>
              <div className="lunexis-kicker">Staking Position</div>
              <h2>{pool.token.symbol} info</h2>
            </div>
          </div>
          <button onClick={onClose} className="arc-icon-action w-10 h-10 rounded-2xl" aria-label="Close staking info">x</button>
        </div>

        <div className="lunexis-pool-metrics">
          <div><span>Balance</span><strong>{pool.token.balance ?? "0"}</strong></div>
          <div><span>My stake</span><strong>{pool.userStaked}</strong></div>
          <div><span>Pending staking Reward</span><strong>{pool.pendingReward} {pool.rewardToken.symbol}</strong></div>
          <div><span>Status</span><strong>{isUnlocked ? "Unlocked" : `Unlocks ${new Date((pool.unlockAt ?? 0) * 1000).toLocaleDateString()}`}</strong></div>
          <div><span>Totall stake balance</span><strong>{pool.rewardVaultBalance ?? "0"}</strong></div>
          <div><span>Network</span><strong>ARC Testnet</strong></div>
        </div>

        <div className="lunexis-staking-actions lunexis-staking-modal-actions mt-4">
          <button onClick={onUnstake} disabled={!isUnlocked || numeric(pool.userStaked) <= 0}>Unstake</button>
          <button onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

function EmptyStakingGuide() {
  return (
    <div className="lunexis-staking-empty">
      <span className="material-symbols-outlined">lock_open</span>
      <strong>No allowed staking tokens found</strong>
      <p>No stakeable ARC Testnet assets are available yet.</p>
    </div>
  );
}

function StakingInitializing() {
  return (
    <section className="lunexis-staking-initializing">
      <div className="lunexis-staking-init-orbit">
        <span className="material-symbols-outlined">lock_clock</span>
      </div>
      <div>
        <div className="lunexis-kicker">Staking Engine</div>
        <h2>Staking pools are initializing</h2>
        <p>New ARC Testnet pools are arriving soon. Lunexis is preparing a clean staking surface with live rewards, lock options, and custom token support.</p>
      </div>
      <div className="lunexis-staking-init-steps">
        <span>Scanning ARC Testnet tokens</span>
        <span>Preparing reward streams</span>
        <span>Syncing pool telemetry</span>
      </div>
    </section>
  );
}
