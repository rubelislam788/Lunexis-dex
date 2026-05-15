// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract LunexisStakingManager {
    enum PoolType {
        Flexible,
        Locked,
        FixedReward
    }

    struct Pool {
        address stakeToken;
        address rewardToken;
        uint16 aprBps;
        uint64 lockDuration;
        uint64 createdAt;
        PoolType poolType;
        bool paused;
        uint256 totalStaked;
        string metadata;
    }

    struct Position {
        uint256 amount;
        uint256 rewardStored;
        uint64 updatedAt;
        uint64 unlockAt;
    }

    address public owner;
    bool public paused;
    Pool[] public pools;
    mapping(uint256 => mapping(address => Position)) public positions;

    event OwnershipTransferred(address indexed previousOwner, address indexed nextOwner);
    event PoolCreated(uint256 indexed poolId, address indexed stakeToken, address indexed rewardToken, uint16 aprBps, uint64 lockDuration, PoolType poolType);
    event PoolUpdated(uint256 indexed poolId, uint16 aprBps, uint64 lockDuration, bool paused);
    event Staked(uint256 indexed poolId, address indexed user, uint256 amount);
    event Unstaked(uint256 indexed poolId, address indexed user, uint256 amount);
    event RewardClaimed(uint256 indexed poolId, address indexed user, uint256 amount);
    event EmergencyWithdraw(uint256 indexed poolId, address indexed user, uint256 amount);
    event Paused(bool paused);

    error NotOwner();
    error ReentrantCall();
    error InvalidPool();
    error PoolPaused();
    error InvalidAmount();
    error Locked();
    error TransferFailed();

    uint256 private locked = 1;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (locked != 1) revert ReentrantCall();
        locked = 2;
        _;
        locked = 1;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function poolCount() external view returns (uint256) {
        return pools.length;
    }

    function createPool(
        address stakeToken,
        address rewardToken,
        uint16 aprBps,
        uint64 lockDuration,
        PoolType poolType,
        string calldata metadata
    ) external onlyOwner returns (uint256 poolId) {
        if (stakeToken == address(0) || rewardToken == address(0)) revert InvalidAmount();
        poolId = pools.length;
        pools.push(Pool({
            stakeToken: stakeToken,
            rewardToken: rewardToken,
            aprBps: aprBps,
            lockDuration: lockDuration,
            createdAt: uint64(block.timestamp),
            poolType: poolType,
            paused: false,
            totalStaked: 0,
            metadata: metadata
        }));
        emit PoolCreated(poolId, stakeToken, rewardToken, aprBps, lockDuration, poolType);
    }

    function setPool(uint256 poolId, uint16 aprBps, uint64 lockDuration, bool isPaused) external onlyOwner {
        if (poolId >= pools.length) revert InvalidPool();
        Pool storage pool = pools[poolId];
        pool.aprBps = aprBps;
        pool.lockDuration = lockDuration;
        pool.paused = isPaused;
        emit PoolUpdated(poolId, aprBps, lockDuration, isPaused);
    }

    function setGlobalPaused(bool nextPaused) external onlyOwner {
        paused = nextPaused;
        emit Paused(nextPaused);
    }

    function transferOwnership(address nextOwner) external onlyOwner {
        if (nextOwner == address(0)) revert InvalidAmount();
        emit OwnershipTransferred(owner, nextOwner);
        owner = nextOwner;
    }

    function pendingReward(uint256 poolId, address user) public view returns (uint256) {
        if (poolId >= pools.length) revert InvalidPool();
        Pool memory pool = pools[poolId];
        Position memory position = positions[poolId][user];
        if (position.amount == 0) return position.rewardStored;
        uint256 elapsed = block.timestamp - uint256(position.updatedAt == 0 ? pool.createdAt : position.updatedAt);
        uint256 reward = (position.amount * pool.aprBps * elapsed) / (365 days * 10000);
        return position.rewardStored + reward;
    }

    function stake(uint256 poolId, uint256 amount) external nonReentrant {
        if (paused) revert PoolPaused();
        if (poolId >= pools.length) revert InvalidPool();
        if (amount == 0) revert InvalidAmount();

        Pool storage pool = pools[poolId];
        if (pool.paused) revert PoolPaused();
        Position storage position = positions[poolId][msg.sender];
        _syncReward(poolId, msg.sender);

        position.amount += amount;
        position.updatedAt = uint64(block.timestamp);
        uint64 nextUnlock = uint64(block.timestamp) + pool.lockDuration;
        if (nextUnlock > position.unlockAt) position.unlockAt = nextUnlock;
        pool.totalStaked += amount;

        _safeTransferFrom(pool.stakeToken, msg.sender, address(this), amount);
        emit Staked(poolId, msg.sender, amount);
    }

    function unstake(uint256 poolId, uint256 amount) external nonReentrant {
        if (poolId >= pools.length) revert InvalidPool();
        if (amount == 0) revert InvalidAmount();

        Pool storage pool = pools[poolId];
        Position storage position = positions[poolId][msg.sender];
        if (position.amount < amount) revert InvalidAmount();
        if (block.timestamp < position.unlockAt) revert Locked();
        _syncReward(poolId, msg.sender);

        position.amount -= amount;
        position.updatedAt = uint64(block.timestamp);
        pool.totalStaked -= amount;

        _safeTransfer(pool.stakeToken, msg.sender, amount);
        emit Unstaked(poolId, msg.sender, amount);
    }

    function claim(uint256 poolId) external nonReentrant returns (uint256 reward) {
        if (poolId >= pools.length) revert InvalidPool();
        _syncReward(poolId, msg.sender);
        Position storage position = positions[poolId][msg.sender];
        reward = position.rewardStored;
        if (reward == 0) revert InvalidAmount();
        position.rewardStored = 0;
        _safeTransfer(pools[poolId].rewardToken, msg.sender, reward);
        emit RewardClaimed(poolId, msg.sender, reward);
    }

    function emergencyWithdraw(uint256 poolId) external nonReentrant {
        if (poolId >= pools.length) revert InvalidPool();
        Pool storage pool = pools[poolId];
        Position storage position = positions[poolId][msg.sender];
        uint256 amount = position.amount;
        if (amount == 0) revert InvalidAmount();
        position.amount = 0;
        position.rewardStored = 0;
        position.updatedAt = uint64(block.timestamp);
        pool.totalStaked -= amount;
        _safeTransfer(pool.stakeToken, msg.sender, amount);
        emit EmergencyWithdraw(poolId, msg.sender, amount);
    }

    function recoverToken(address token, address to, uint256 amount) external onlyOwner {
        _safeTransfer(token, to, amount);
    }

    function _syncReward(uint256 poolId, address user) internal {
        Position storage position = positions[poolId][user];
        position.rewardStored = pendingReward(poolId, user);
        position.updatedAt = uint64(block.timestamp);
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transfer.selector, to, amount));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
}
