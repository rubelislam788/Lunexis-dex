// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Like {
    function balanceOf(address owner) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract ArcConstantProductRouter {
    address public owner;
    uint256 public constant FEE_BPS = 30;
    uint256 public constant BPS = 10_000;

    mapping(address => mapping(address => bool)) public pairEnabled;

    event PairEnabled(address indexed tokenA, address indexed tokenB, bool enabled);
    event LiquidityAdded(address indexed provider, address indexed tokenA, address indexed tokenB, uint256 amountA, uint256 amountB);
    event Swap(address indexed trader, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, address recipient);

    modifier onlyOwner() {
        require(msg.sender == owner, "ROUTER: owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setPairEnabled(address tokenA, address tokenB, bool enabled) external onlyOwner {
        require(tokenA != tokenB, "ROUTER: same token");
        pairEnabled[tokenA][tokenB] = enabled;
        pairEnabled[tokenB][tokenA] = enabled;
        emit PairEnabled(tokenA, tokenB, enabled);
    }

    function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external {
        require(pairEnabled[tokenA][tokenB], "ROUTER: pair disabled");
        require(amountA > 0 && amountB > 0, "ROUTER: zero liquidity");
        _pull(tokenA, msg.sender, amountA);
        _pull(tokenB, msg.sender, amountB);
        emit LiquidityAdded(msg.sender, tokenA, tokenB, amountA, amountB);
    }

    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) public view returns (uint256) {
        require(pairEnabled[tokenIn][tokenOut], "ROUTER: pair disabled");
        require(amountIn > 0, "ROUTER: zero input");

        uint256 reserveIn = IERC20Like(tokenIn).balanceOf(address(this));
        uint256 reserveOut = IERC20Like(tokenOut).balanceOf(address(this));
        require(reserveIn > 0 && reserveOut > 0, "ROUTER: no liquidity");

        uint256 amountInWithFee = amountIn * (BPS - FEE_BPS);
        return (amountInWithFee * reserveOut) / ((reserveIn * BPS) + amountInWithFee);
    }

    function swapExactInput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut) {
        require(recipient != address(0), "ROUTER: zero recipient");
        amountOut = getAmountOut(tokenIn, tokenOut, amountIn);
        require(amountOut >= minAmountOut, "ROUTER: slippage");

        _pull(tokenIn, msg.sender, amountIn);
        require(IERC20Like(tokenOut).transfer(recipient, amountOut), "ROUTER: transfer out");
        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, recipient);
    }

    function _pull(address token, address from, uint256 amount) internal {
        require(IERC20Like(token).transferFrom(from, address(this), amount), "ROUTER: transfer in");
    }
}
