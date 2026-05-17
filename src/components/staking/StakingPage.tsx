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

  const filteredTokens = useMemo(() => {
    const query = tokenSearch.trim().toLowerCase();
    if (!query) return staking.tokens;
    return staking.tokens.filter((token) =>
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query) ||
      token.address.toLowerCase().includes(query)
    );
  }, [staking.tokens, tokenSearch]);

  const totals = useMemo(() => {
    const staked = staking.pools.reduce((sum, pool) => sum + numeric(pool.userStaked), 0);
    const rewards = staking.pools.reduce((sum, pool) => sum + numeric(pool.pendingReward), 0);
    const active = staking.pools.filter((pool) => numeric(pool.userStaked) > 0).length;
    return { staked, rewards, active };
  }, [staking.pools]);

  const run = async (label: string, action: () => Promise<any>) => {
    try {
      const result = await action();
      show(result?.hash ? `${label} confirmed` : `${label} ready`, "success");
    } catch (error: any) {
      show(error?.shortMessage || error?.message || `${label} failed`, "error");
    }
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
        <div className="lunexis-staking-layout grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
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
                  {staking.pools.map((pool) => (
                    <PoolCard
                      key={pool.id}
                      pool={pool}
                      amount={poolAmounts[pool.id] ?? ""}
                      isConnected={staking.isConnected}
                      wrongNetwork={staking.wrongNetwork}
                      status={staking.status}
                      onAmount={(value) => setPoolAmounts((prev) => ({ ...prev, [pool.id]: value }))}
                      onPercent={(percent) => {
                        const balance = numeric(pool.token.balance);
                        const next = percent === 100 ? balance : balance * percent / 100;
                        setPoolAmounts((prev) => ({ ...prev, [pool.id]: next.toFixed(next >= 1 ? 4 : 6).replace(/\.?0+$/, "") }));
                      }}
                      onApprove={() => run("Approve", async () => {
                        const amount = poolAmounts[pool.id] ?? "0";
                        return staking.approve(pool, amount);
                      })}
                      onStake={() => run("Stake", () => staking.stake(pool, poolAmounts[pool.id] ?? "0"))}
                      onUnstake={() => run("Unstake", () => staking.unstake(pool, poolAmounts[pool.id] ?? "0"))}
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
                  <div key={pool.id}>
                    {tokenAvatar(pool.token, 34)}
                    <div>
                      <strong>{pool.token.symbol} position</strong>
                      <span>{pool.userStaked} staked - {pool.pendingReward} {pool.rewardToken.symbol} pending</span>
                    </div>
                    <small>{pool.unlockAt && pool.unlockAt * 1000 > Date.now() ? `Unlocks ${new Date(pool.unlockAt * 1000).toLocaleDateString()}` : "Unlocked"}</small>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <aside className="grid gap-6 content-start">
            <section className="lunexis-premium-card">
              <div className="lunexis-kicker">Allowed Tokens</div>
              <h2>Contract Assets</h2>
              <p className="lunexis-staking-muted">These tokens are loaded from `getAllowedTokens()` on the new ARC Testnet staking contract.</p>
              {staking.error && <div className="lunexis-staking-error">{staking.error}</div>}
              <div className="lunexis-token-list">
                {filteredTokens.map((token) => (
                  <button key={token.address} className="is-active" type="button">
                    {tokenAvatar(token, 34)}
                    <span>{token.symbol}</span>
                    <small>{token.balance ?? "0"}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="lunexis-premium-card">
              <div className="lunexis-kicker">Staking Contract</div>
              <h2>ARC Testnet Live</h2>
              <p className="lunexis-staking-muted break-all">{staking.managerAddress}</p>
              <div className="lunexis-staking-warning mt-3">Approve is sent to the token contract. Stake, unstake, and claim are sent to this staking contract.</div>
            </section>
          </aside>
        </div>
        )}
      </div>
    </div>
  );
}

function PoolCard({
  pool,
  amount,
  isConnected,
  wrongNetwork,
  status,
  onAmount,
  onPercent,
  onApprove,
  onStake,
  onUnstake,
  onClaim,
}: {
  pool: StakingPoolView;
  amount: string;
  isConnected: boolean;
  wrongNetwork: boolean;
  status: string;
  onAmount: (value: string) => void;
  onPercent: (percent: number) => void;
  onApprove: () => void;
  onStake: () => void;
  onUnstake: () => void;
  onClaim: () => void;
}) {
  const utilization = Math.min(100, numeric(pool.totalStaked) > 0 ? (numeric(pool.userStaked) / numeric(pool.totalStaked)) * 100 : 0);
  const amountRaw = parseTokenAmount(amount, pool.token.decimals);
  const balanceRaw = parseTokenAmount(pool.token.balance || "0", pool.token.decimals) ?? BigInt(0);
  const userStakedRaw = parseTokenAmount(pool.userStaked || "0", pool.token.decimals) ?? BigInt(0);
  const pendingRaw = parseTokenAmount(pool.pendingReward || "0", pool.rewardToken.decimals) ?? BigInt(0);
  const hasAmount = Boolean(amountRaw && amountRaw > BigInt(0));
  const needsApproval = Boolean(hasAmount && pool.allowance !== undefined && pool.allowance < amountRaw!);
  const isLocked = Boolean(pool.unlockAt && pool.unlockAt * 1000 > Date.now());
  const stakeBlockReason = !isConnected
    ? "Connect wallet"
    : wrongNetwork
      ? "Switch to ARC Testnet"
      : !hasAmount
        ? "Enter an amount"
        : amountRaw! > balanceRaw
          ? `Not enough ${pool.token.symbol}`
          : pool.paused
            ? "Pool paused"
            : needsApproval
              ? `Approve ${pool.token.symbol} first`
              : "";
  const unstakeBlockReason = !isConnected
    ? "Connect wallet"
    : wrongNetwork
      ? "Switch to ARC Testnet"
      : !hasAmount
        ? "Enter an amount"
        : amountRaw! > userStakedRaw
          ? "Amount exceeds stake"
          : isLocked
            ? `Locked until ${new Date((pool.unlockAt ?? 0) * 1000).toLocaleDateString()}`
            : "";
  const claimBlockReason = !isConnected
    ? "Connect wallet"
    : wrongNetwork
      ? "Switch to ARC Testnet"
      : pendingRaw <= BigInt(0)
        ? "No rewards yet"
        : "";
  const actionHint = hasAmount
    ? stakeBlockReason || unstakeBlockReason
    : pendingRaw > BigInt(0)
      ? claimBlockReason
      : stakeBlockReason;

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
        <div className="lunexis-apr-metric"><span>Wallet</span><strong>{pool.token.balance ?? "0"}</strong></div>
        <div><span>Lock</span><strong>{formatDuration(pool.lockDuration)}</strong></div>
        <div><span>Contract balance</span><strong>{pool.rewardVaultBalance ?? "0"}</strong></div>
        <div><span>My stake</span><strong>{pool.userStaked}</strong></div>
        <div><span>Pending</span><strong>{pool.pendingReward} {pool.rewardToken.symbol}</strong></div>
        <div><span>Network</span><strong>ARC Testnet</strong></div>
      </div>
      <div className="lunexis-utilization">
        <span>My stake vs contract balance</span>
        <i><b style={{ width: `${utilization}%` }} /></i>
      </div>
      <input value={amount} onChange={(event) => onAmount(event.target.value)} placeholder={`Amount in ${pool.token.symbol}`} className="lunexis-staking-input" inputMode="decimal" />
      <div className="lunexis-stake-percent-row">
        {[25, 50, 75, 100].map((percent) => (
          <button key={percent} onClick={() => onPercent(percent)}>{percent === 100 ? "MAX" : `${percent}%`}</button>
        ))}
      </div>
      {numeric(pool.token.balance) <= 0 && <div className="lunexis-staking-warning">Low balance detected for this token.</div>}
      {actionHint && (
        <div className="lunexis-staking-warning">
          {actionHint}
        </div>
      )}
      <div className="lunexis-staking-actions">
        {needsApproval && <button onClick={onApprove} disabled={status !== "idle" || !hasAmount || wrongNetwork}>Approve</button>}
        <button onClick={onStake} disabled={status !== "idle" || Boolean(stakeBlockReason)}>Stake</button>
        <button onClick={onUnstake} disabled={status !== "idle" || Boolean(unstakeBlockReason)}>Unstake</button>
        <button onClick={onClaim} disabled={status !== "idle" || Boolean(claimBlockReason)}>Claim</button>
      </div>
    </article>
  );
}

function EmptyStakingGuide() {
  return (
    <div className="lunexis-staking-empty">
      <span className="material-symbols-outlined">lock_open</span>
      <strong>No allowed staking tokens found</strong>
      <p>The frontend is connected to the new ARC Testnet staking contract and is waiting for `getAllowedTokens()` to return stakeable assets.</p>
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
