# ARC Quest — Web3 Mission Control

A Next.js 15 web3 questing platform integrated with [Circle Arc App Kit](https://docs.arc.network/app-kit) for real cross-chain swap and bridge functionality.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom CSS |
| Wallet | wagmi v2 + viem |
| Swap | Circle Arc App Kit (`@circle-fin/app-kit`) |
| Bridge | Circle CCTP v2 via Arc App Kit |
| Adapter | `@circle-fin/adapter-viem-v2` |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Then edit `.env.local`:

```env
# Required for Swap — get from https://console.circle.com
NEXT_PUBLIC_ARC_KIT_KEY=your_kit_key_here

# Required for WalletConnect — get from https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

> **Note**: Bridge works without a kit key. Swap requires `NEXT_PUBLIC_ARC_KIT_KEY`.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Circle Arc App Kit Integration

This project uses the [Arc App Kit SDK](https://docs.arc.network/app-kit) to power:

### Swap (`src/hooks/useArcSwap.ts`)

Calls `kit.swap()` from `@circle-fin/app-kit` to exchange USDC ↔ EURC on Arc Testnet:

```typescript
const result = await kit.swap({
  from: { adapter: viemAdapter, chain: "Arc_Testnet" },
  tokenIn: "USDC",
  tokenOut: "EURC",
  amountIn: "1.00",
  config: { kitKey: process.env.NEXT_PUBLIC_ARC_KIT_KEY },
});
```

### Bridge (`src/hooks/useArcBridge.ts`)

Calls `kit.bridge()` to move native USDC cross-chain via Circle CCTP v2:

```typescript
const result = await kit.bridge({
  from: { adapter: viemAdapter, chain: "Ethereum_Sepolia" },
  to:   { adapter: viemAdapter, chain: "Arc_Testnet" },
  amount: "1.00",
});
```

---

## Supported Chains (Testnet)

| Chain | App Kit Identifier |
|---|---|
| Arc Testnet | `Arc_Testnet` |
| Ethereum Sepolia | `Ethereum_Sepolia` |
| Base Sepolia | `Base_Sepolia` |
| Arbitrum Sepolia | `Arbitrum_Sepolia` |
| OP Sepolia | `OP_Sepolia` |

For a full list of 21+ supported testnet chains, see the [Arc App Kit docs](https://docs.arc.network/app-kit/tutorials/installation).

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout + fonts
│   ├── page.tsx            # Client-side SPA router
│   └── globals.css         # Design system CSS
├── components/
│   ├── layout/
│   │   ├── Header.tsx      # Top nav with wallet button
│   │   ├── Sidebar.tsx     # Left sidebar navigation
│   │   └── Providers.tsx   # wagmi + react-query providers
│   ├── ui/
│   │   ├── WalletButton.tsx
│   │   └── Toast.tsx
│   ├── swap/
│   │   └── SwapPage.tsx    # Swap UI + Arc App Kit integration
│   ├── bridge/
│   │   └── BridgePage.tsx  # Bridge UI + CCTP v2 integration
│   ├── LandingPage.tsx
│   └── MissionsPage.tsx
├── hooks/
│   ├── useArcSwap.ts       # Arc App Kit swap hook
│   └── useArcBridge.ts     # Arc App Kit bridge hook
├── lib/
│   ├── arc-kit.ts          # App Kit config + chain metadata
│   ├── wagmi.ts            # wagmi chain + connector config
│   └── utils.ts            # Helpers
└── types/
    └── index.ts            # Shared TypeScript types
```

---

## Getting Testnet USDC

1. Go to [Circle's USDC faucet](https://faucet.circle.com)
2. Select Ethereum Sepolia
3. Request test USDC
4. Bridge it to Arc Testnet using the Bridge page

---

## Getting a Kit Key (for Swap)

1. Sign up at [console.circle.com](https://console.circle.com)
2. Create a new project
3. Navigate to **App Kit** → **Kit Keys**
4. Copy the key into `NEXT_PUBLIC_ARC_KIT_KEY` in `.env.local`

---

## Docs & References

- [Arc App Kit Overview](https://docs.arc.network/app-kit)
- [Bridge Quickstart](https://docs.arc.network/app-kit/quickstarts/bridge-tokens-across-blockchains)
- [Swap Quickstart](https://docs.arc.network/app-kit/quickstarts/swap-tokens-same-chain)
- [SDK Reference](https://docs.arc.network/app-kit/references/sdk-reference)
- [Arc Testnet Explorer](https://scan.arc.io)
