# Arc Testnet WETH Swap Contracts

These contracts are for enabling router-backed WETH swaps in the dApp on Arc Testnet.

The app already calls:

```solidity
swapExactInput(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address recipient)
```

Deploy flow:

1. Deploy `ArcMockWETH.sol` on Arc Testnet.
2. Deploy `ArcConstantProductRouter.sol` on Arc Testnet.
3. Call `ArcMockWETH.faucet(...)` from the deployer wallet to mint test WETH.
4. Approve the router to spend WETH and any paired token you want to seed.
5. Call `setPairEnabled(WETH, USDC, true)` on the router.
6. Call `addLiquidity(WETH, USDC, wethAmount, usdcAmount)` on the router.
7. Add these Vercel env vars:

```env
NEXT_PUBLIC_WETH_ARC_ADDRESS=<ArcMockWETH address>
NEXT_PUBLIC_ARC_SWAP_ROUTER_ADDRESS=<ArcConstantProductRouter address>
```

Notes:

- This is a testnet router, not audited production DEX code.
- The router must hold real test liquidity before swaps return quotes.
- WETH is not an Arc App Kit stablecoin route; the dApp will only expose WETH once this router and WETH address are configured.
