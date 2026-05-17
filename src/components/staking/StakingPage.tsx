"use client";

import { useEffect, useMemo, useState } from "react";
import { isAddress, parseUnits, type Address } from "viem";
import { useStaking } from "@/hooks/useStaking";
import type { StakingPoolType, StakingPoolView, StakingToken } from "@/lib/staking";
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
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenSearch, setTokenSearch] = useState("");
  const [selectedToken, setSelectedToken] = useState<StakingToken | null>(null);
  const [poolAmounts, setPoolAmounts] = useState<Record<number, string>>({});
  const [adminDraft, setAdminDraft] = useState({
    stakeToken: "",
    rewardToken: "",
    apr: "18",
    lockDays: "30",
    poolType: "Locked" as StakingPoolType,
    metadata: "Lunexis ARC staking pool",
  });

  const filteredTokens = useMemo(() => {
    const query = tokenSearch.trim().toLowerCase();
    if (!query) return staking.tokens;
    return staking.tokens.filter((token) =>
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query) ||
      token.address.toLowerCase().includes(query)
    );
  }, [staking.tokens, tokenSearch]);

  useEffect(() => {
    if (adminDraft.stakeToken || staking.tokens.length === 0) return;
    const defaultToken = staking.tokens.find((token) => token.symbol === "USDC") ?? staking.tokens[0];
    setSelectedToken(defaultToken);
    setAdminDraft((prev) => ({
      ...prev,
      stakeToken: defaultToken.address,
      rewardToken: defaultToken.address,
      metadata: `Lunexis ${defaultToken.symbol} ARC Testnet staking pool`,
    }));
  }, [adminDraft.stakeToken, staking.tokens]);

  const totals = useMemo(() => {
    const staked = staking.pools.reduce((sum, pool) => sum + numeric(pool.userStaked), 0);
    const rewards = staking.pools.reduce((sum, pool) => sum + numeric(pool.pendingReward), 0);
    const active = staking.pools.filter((pool) => numeric(pool.userStaked) > 0).length;
    return { staked, rewards, active };
  }, [staking.pools]);

  const useTokenForPool = (token: StakingToken) => {
    setSelectedToken(token);
    setAdminDraft((prev) => ({
      ...prev,
      stakeToken: token.address,
      rewardToken: token.address,
      metadata: `Lunexis ${token.symbol} ARC Testnet staking pool`,
    }));
  };

  const addToken = async () => {
    try {
      const token = await staking.addCustomToken(tokenAddress);
      useTokenForPool(token);
      setTokenAddress("");
      show(`${token.symbol} added to staking`, "success");
    } catch (error: any) {
      staking.setError(error?.message || "Invalid ARC Testnet ERC20 token.");
      show("Token validation failed", "error");
    }
  };

  const run = async (label: string, action: () => Promise<any>) => {
    try {
      const result = await action();
      show(result?.hash ? `${label} confirmed` : `${label} ready`, "success");
    } catch (error: any) {
      show(error?.shortMessage || error?.message || `${label} failed`, "error");
    }
  };

  const createPool = () => {
    if (!isAddress(adminDraft.stakeToken) || !isAddress(adminDraft.rewardToken)) {
      show("Enter valid ARC Testnet token addresses", "error");
      return;
    }
    run("Pool created", () => staking.createPool({
      ...adminDraft,
      stakeToken: adminDraft.stakeToken as Address,
      rewardToken: adminDraft.rewardToken as Address,
    }));
  };

  const createStablePool = (token: StakingToken, lockDays = "0") => {
    run(`${token.symbol} pool created`, () => staking.createPool({
      stakeToken: token.address,
      rewardToken: token.address,
      apr: token.symbol === "USDC" ? "12" : "14",
      lockDays,
      poolType: lockDays === "0" ? "Flexible" : "Locked",
      metadata: `Lunexis ${token.symbol} ARC Testnet staking pool`,
    }));
  };

  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <ToastContainer />
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <div className="lunexis-staking-hero">
          <div>
            <div className="lunexis-kicker">ARC Testnet Staking</div>
            <h1>Stake Any ARC Token</h1>
            <p>Stake ARC Testnet ERC20 tokens, add custom token contracts, track rewards, and manage pool positions from one Lunexis staking surface.</p>
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
                <EmptyStakingGuide
                  tokens={staking.tokens.filter((token) => token.symbol === "USDC" || token.symbol === "EURC")}
                  isAdmin={staking.canCreatePools}
                  status={staking.status}
                  onCreatePool={createStablePool}
                />
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
                      onApprove={() => run("Stake", async () => {
                        const amount = poolAmounts[pool.id] ?? "0";
                        await staking.approve(pool, amount);
                        return staking.stake(pool, amount);
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
              <div className="lunexis-kicker">Custom Token Staking</div>
              <h2>Add ARC Token</h2>
              <p className="lunexis-staking-muted">Paste any ARC Testnet ERC20 contract. Lunexis reads name, symbol, decimals, and balance before allowing staking.</p>
              <input value={tokenAddress} onChange={(event) => setTokenAddress(event.target.value)} placeholder="0x... token contract" className="lunexis-staking-input" />
              {staking.error && <div className="lunexis-staking-error">{staking.error}</div>}
              <button onClick={addToken} className="btn-primary w-full py-3 rounded-2xl mt-3">Validate & Add Token</button>
              <div className="lunexis-token-list">
                {filteredTokens.map((token) => (
                  <button key={token.address} onClick={() => useTokenForPool(token)} className={selectedToken?.address === token.address ? "is-active" : ""}>
                    {tokenAvatar(token, 34)}
                    <span>{token.symbol}</span>
                    <small>{token.balance ?? "0"}</small>
                  </button>
                ))}
              </div>
            </section>

            {staking.canCreatePools ? (
              <section className="lunexis-premium-card">
                <div className="lunexis-kicker">Private Admin</div>
                <h2>Pool Manager</h2>
                {selectedToken && (
                  <div className="lunexis-staking-warning mb-3">
                    {selectedToken.symbol} selected. Stake and reward addresses are filled with this token contract.
                  </div>
                )}
                <input
                  value={adminDraft.stakeToken}
                  onChange={(event) => setAdminDraft((prev) => ({ ...prev, stakeToken: event.target.value, rewardToken: event.target.value }))}
                  placeholder="Stake token address"
                  className="lunexis-staking-input"
                />
                <input
                  value={adminDraft.rewardToken}
                  onChange={(event) => setAdminDraft((prev) => ({ ...prev, rewardToken: event.target.value }))}
                  placeholder="Reward token address"
                  className="lunexis-staking-input"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input value={adminDraft.apr} onChange={(event) => setAdminDraft((prev) => ({ ...prev, apr: event.target.value }))} placeholder="APR %" className="lunexis-staking-input" />
                  <input value={adminDraft.lockDays} onChange={(event) => setAdminDraft((prev) => ({ ...prev, lockDays: event.target.value }))} placeholder="Lock days" className="lunexis-staking-input" />
                </div>
                <select value={adminDraft.poolType} onChange={(event) => setAdminDraft((prev) => ({ ...prev, poolType: event.target.value as StakingPoolType }))} className="lunexis-staking-input">
                  <option value="Flexible">Flexible staking</option>
                  <option value="Locked">Locked staking</option>
                  <option value="FixedReward">Fixed reward pool</option>
                </select>
                <input value={adminDraft.metadata} onChange={(event) => setAdminDraft((prev) => ({ ...prev, metadata: event.target.value }))} placeholder="Pool metadata" className="lunexis-staking-input" />
                <div className="lunexis-staking-warning mb-3">Pool creation uses native USDC gas. Fund the manager with reward tokens before users claim rewards.</div>
                <button onClick={createPool} disabled={staking.status === "creating" || !staking.canCreatePools} className="btn-primary w-full py-3 rounded-2xl mt-2">
                  {staking.status === "creating" ? "Creating..." : staking.canCreatePools ? "Create Pool" : "Owner Wallet Required"}
                </button>
              </section>
            ) : staking.isAdmin ? (
              <section className="lunexis-premium-card">
                <div className="lunexis-kicker">Private Admin</div>
                <h2>Owner Wallet Required</h2>
                <p className="lunexis-staking-muted">This wallet is listed as admin in the app, but the staking contract only allows the onchain owner to create pools.</p>
                <div className="lunexis-staking-error mt-3">
                  Connect the staking manager owner wallet and make sure it has native USDC gas on Arc Testnet.
                </div>
              </section>
            ) : (
              <section className="lunexis-premium-card">
                <div className="lunexis-kicker">Staking Setup</div>
                <h2>Pool setup pending</h2>
                <p className="lunexis-staking-muted">USDC and EURC staking pools appear here after the contract owner initializes them.</p>
              </section>
            )}
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
  const dailyReward = numeric(pool.userStaked) * (pool.aprBps / 10000) / 365;
  const utilization = Math.min(100, numeric(pool.totalStaked) > 0 ? (numeric(pool.userStaked) / numeric(pool.totalStaked)) * 100 : 0);
  const amountRaw = parseTokenAmount(amount, pool.token.decimals);
  const balanceRaw = parseTokenAmount(pool.token.balance || "0", pool.token.decimals) ?? BigInt(0);
  const userStakedRaw = parseTokenAmount(pool.userStaked || "0", pool.token.decimals) ?? BigInt(0);
  const pendingRaw = parseTokenAmount(pool.pendingReward || "0", pool.rewardToken.decimals) ?? BigInt(0);
  const vaultRaw = parseTokenAmount(pool.rewardVaultBalance || "0", pool.rewardToken.decimals) ?? BigInt(0);
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
        : vaultRaw < pendingRaw
          ? "Reward vault needs funding"
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
        <div className="lunexis-apr-metric"><span>APR/APY</span><strong>{(pool.aprBps / 100).toFixed(2)}%</strong></div>
        <div><span>Lock</span><strong>{formatDuration(pool.lockDuration)}</strong></div>
        <div><span>Total staked</span><strong>{pool.totalStaked}</strong></div>
        <div><span>My stake</span><strong>{pool.userStaked}</strong></div>
        <div><span>Pending</span><strong>{pool.pendingReward} {pool.rewardToken.symbol}</strong></div>
        <div><span>Daily est.</span><strong>{dailyReward.toFixed(6)}</strong></div>
      </div>
      <div className="lunexis-utilization">
        <span>Pool utilization</span>
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
        {needsApproval && <button onClick={onApprove} disabled={status !== "idle" || !hasAmount || wrongNetwork}>Approve & Stake</button>}
        <button onClick={onStake} disabled={status !== "idle" || Boolean(stakeBlockReason)}>Stake</button>
        <button onClick={onUnstake} disabled={status !== "idle" || Boolean(unstakeBlockReason)}>Unstake</button>
        <button onClick={onClaim} disabled={status !== "idle" || Boolean(claimBlockReason)}>Claim</button>
      </div>
    </article>
  );
}

function EmptyStakingGuide({
  tokens,
  isAdmin,
  status,
  onCreatePool,
}: {
  tokens: StakingToken[];
  isAdmin: boolean;
  status: string;
  onCreatePool: (token: StakingToken, lockDays?: string) => void;
}) {
  return (
    <div className="lunexis-staking-empty">
      <span className="material-symbols-outlined">lock_open</span>
      <strong>USDC and EURC pools need initialization</strong>
      <p>Create the first ARC Testnet staking pools for USDC and EURC. After pool creation, users can approve, stake, unstake, and claim from real wallet transactions.</p>
      <div className="lunexis-starter-pool-grid">
        {tokens.map((token) => (
          <article key={token.address} className="lunexis-starter-pool-card">
            <div>
              {tokenAvatar(token, 38)}
              <span>
                <strong>{token.symbol}</strong>
                <small>Balance {token.balance ?? "0"}</small>
              </span>
            </div>
            <p>{token.symbol} rewards paid in {token.symbol}. Flexible ARC Testnet pool.</p>
            {isAdmin ? (
              <button onClick={() => onCreatePool(token, "0")} disabled={status !== "idle"} className="btn-primary w-full py-3 rounded-2xl">
                {status === "creating" ? "Creating..." : `Create ${token.symbol} Pool`}
              </button>
            ) : (
              <small className="lunexis-staking-warning">Connect the staking manager owner wallet once to initialize this pool.</small>
            )}
          </article>
        ))}
      </div>
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
