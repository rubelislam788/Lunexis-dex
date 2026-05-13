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

## Features

- ✨ **Modern Glassmorphism UI** with smooth animations and transitions
- 🎯 **Real Web3 Integration** via wagmi, viem, and Circle Arc App Kit
- 🔄 **Token Swaps** with live balance tracking and approval management
- 🌉 **Cross-Chain Bridging** via Circle CCTP v2
- 📊 **Mission Tracking** with activity timeline and leaderboard
- 👛 **Wallet Management** with multi-chain support
- 📱 **Responsive Design** for desktop and mobile
- ⚡ **Fast Deployments** with Vercel integration

---

## Quick Start

### 1. Install dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Configure environment variables

\`\`\`bash
cp .env.local.example .env.local
\`\`\`

Then edit \`.env.local\`:

\`\`\`env
# Required for Swap — get from https://console.circle.com
NEXT_PUBLIC_ARC_KIT_KEY=your_kit_key_here

# Optional for WalletConnect — get from https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# RPC endpoints (optional, defaults provided)
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.arc.io
NEXT_PUBLIC_ARC_EXPLORER_URL=https://scan.arc.io
\`\`\`

> **Note**: Bridge works without a kit key. Swap requires \`NEXT_PUBLIC_ARC_KIT_KEY\`.

### 3. Run the dev server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000).

### 4. Build for production

\`\`\`bash
npm run build
npm start
\`\`\`

---

## Deployment (Vercel)

### 1. Push to GitHub

\`\`\`bash
git add .
git commit -m "Deploy: ready for production"
git push origin main
\`\`\`

### 2. Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Add Environment Variables:
   - \`NEXT_PUBLIC_ARC_KIT_KEY\`
   - \`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID\`
   - \`NEXT_PUBLIC_ARC_RPC_URL\`
   - \`NEXT_PUBLIC_ARC_EXPLORER_URL\`
5. Click "Deploy"

The site will be live in ~2 minutes at \`https://your-project.vercel.app\`

---

## UI Enhancements (v1.1)

---

## UI Enhancements (v1.1)

Recent improvements for production deployment:

### Visual Enhancements
- ✨ **Enhanced Toast Notifications** with icon indicators and smooth slide animations
- 🎨 **Improved Input Focus States** with cyan glow effects and background transitions
- 🔄 **Smooth Button Transitions** with active/hover states and scale animations
- 📱 **Better Icon Button Interactions** with elevation and glow on hover
- ⌛ **Loading Spinner** styles with CSS-based animations

### UX Improvements
- ✅ **Better Toast Exit Animation** with smooth fade and slide out
- 🎯 **Enhanced Button States** with disabled state opacity and cursor changes
- 🔍 **Improved Input Styling** with focus ring glow and background color shifts
- 🔔 **Type-Specific Icons** for success (✓), error (!), and info (ℹ) notifications
- 🎪 **Modal Animation** with slide-up entrance effect

### Accessibility
- ⌨️ **Better Focus States** with visible focus rings
- 🖱️ **Disabled State Clarity** with cursor not-allowed on disabled elements
- 📊 **Improved Contrast** in notification backgrounds

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
