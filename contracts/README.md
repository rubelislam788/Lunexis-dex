# Arc Testnet Uniswap V2 Router

The dApp swap flow is wired for a Uniswap V2 compatible `Router02` on Arc Testnet.

Default token addresses:

```env
NEXT_PUBLIC_ARC_TOKEN_ADDRESS=0x6a801562296A1Dbc9244ca3764981D21A22974d6
NEXT_PUBLIC_WETH_ARC_ADDRESS=0x7E24AF6B090871ebbD60f57BA0A09F27db898640
NEXT_PUBLIC_USDC_ARC_ADDRESS=0xD8fBdB46F9230B952Ad820697ac940373208ea3e
NEXT_PUBLIC_EURC_ARC_ADDRESS=0x588c08138f0d079E2B8457ea0Bf30861890875fb
```

Deploy and seed liquidity:

```bash
npm install

$env:ARC_DEPLOYER_PRIVATE_KEY="0x..."
$env:MINT_WETH="10"
$env:LIQUIDITY_ARC_WETH_ARC="1000"
$env:LIQUIDITY_ARC_WETH_WETH="1"
$env:LIQUIDITY_WETH_USDC_WETH="1"
$env:LIQUIDITY_WETH_USDC_USDC="3000"
$env:LIQUIDITY_WETH_EURC_WETH="1"
$env:LIQUIDITY_WETH_EURC_EURC="2800"
npm run deploy:arc-uniswap
```

The script deploys:

- `UniswapV2Factory`
- `UniswapV2Router02`, using WETH `0x7E24AF6B090871ebbD60f57BA0A09F27db898640`
- `ARC/WETH`, `WETH/USDC`, and `WETH/EURC` pairs
- optional initial liquidity when the `LIQUIDITY_*` values are greater than zero

After deployment, add the printed values to Vercel:

```env
NEXT_PUBLIC_ARC_SWAP_FACTORY_ADDRESS=<deployed factory>
NEXT_PUBLIC_ARC_SWAP_ROUTER_ADDRESS=<deployed router>
NEXT_PUBLIC_WETH_ARC_ADDRESS=0x7E24AF6B090871ebbD60f57BA0A09F27db898640
```

Notes:

- The deployer wallet must hold ARC, WETH, USDC, EURC, and Arc native gas before liquidity can be added.
- `MINT_WETH` only works if the configured WETH contract exposes `faucet(uint256)`.
- Do not commit `ARC_DEPLOYER_PRIVATE_KEY`.

## Lunexis staking

`LunexisStakingManager.sol` is a standalone ARC Testnet staking manager for ERC20 tokens.

Frontend environment variables:

```env
NEXT_PUBLIC_LUNEXIS_STAKING_MANAGER_ADDRESS=0x41ccEf0fb073Cc5214E8e65ac5D0204b54e5003b
NEXT_PUBLIC_STAKING_ADMIN_WALLET=0x01176d7052A51471a43E01A467fC572a8e23260c
```

Deploy:

```bash
$env:DEPLOYER_PRIVATE_KEY="0x..."
npm run deploy:staking
```

The manager supports flexible pools, locked pools, fixed reward-style pools, APR updates, pool pause controls, reward claiming, normal unstake, and emergency withdraw. Fund the contract with the chosen reward token before users claim rewards.
