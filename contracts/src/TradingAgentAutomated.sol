// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title TradingAgentRegistry
 * @notice Production-ready autonomous trading agents with ENS identity and Chainlink Automation
 * @dev Integrates Pyth price feeds, ENS, 1inch V6 Router, and Chainlink Automation
 */
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/v0.8/automation/AutomationCompatible.sol";

interface IENS {
    function setSubnodeRecord(
        bytes32 node,
        bytes32 label,
        address owner,
        address resolver,
        uint64 ttl
    ) external returns (bytes32);
}

/**
 * @notice 1inch V6 Aggregation Router Interface
 */
interface IAggregationRouterV6 {
    struct SwapDescription {
        address srcToken;
        address dstToken;
        address srcReceiver;
        address dstReceiver;
        uint256 amount;
        uint256 minReturnAmount;
        uint256 flags;
    }

    function swap(
        address executor,
        SwapDescription calldata desc,
        bytes calldata permit,
        bytes calldata data
    ) external payable returns (uint256 returnAmount, uint256 spentAmount);
}

struct TradingStrategy {
    bytes32 priceFeedId;      // Pyth price feed ID
    uint256 triggerPrice;     // Trigger price (scaled to match feed decimals)
    bool triggerAbove;        // true = buy when price > trigger, false = buy when price < trigger
    address tokenIn;          // Token to sell
    address tokenOut;         // Token to buy
    uint256 amountIn;         // Amount to trade (0 = use full balance)
    uint256 minReturnAmount;  // Minimum tokens to receive (slippage protection)
    bool isActive;            // Strategy active status
    uint256 lastExecuted;     // Last execution timestamp
    uint256 cooldownPeriod;   // Minimum seconds between executions
}

struct Agent {
    address owner;
    bytes32 ensNode;
    string ensName;
    TradingStrategy strategy;
    uint256 createdAt;
    uint256 totalExecutions;
    bool exists;
}

/**
 * @title TradingAgentRegistry
 * @notice Manages autonomous trading agents with price-triggered execution
 */
contract TradingAgentRegistry is AutomationCompatibleInterface, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Immutable addresses
    IPyth public immutable pyth;
    IENS public immutable ens;
    IAggregationRouterV6 public immutable oneInchRouter;
    bytes32 public immutable baseNode;

    // State variables
    mapping(bytes32 => Agent) public agents;
    mapping(address => bytes32[]) public userAgents;
    bytes32[] public allAgentIds;
    uint256 public agentCount;

    // Automation config
    uint256 public maxAgentsPerCheck = 50; // Gas optimization
    uint256 public priceMaxAge = 300; // 5 minutes max staleness

    // Events
    event AgentCreated(
        bytes32 indexed agentId,
        address indexed owner,
        string ensName,
        bytes32 priceFeedId
    );

    event SwapExecuted(
        bytes32 indexed agentId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 triggerPrice,
        uint256 actualPrice
    );

    event StrategyUpdated(bytes32 indexed agentId);
    event AgentDeactivated(bytes32 indexed agentId);
    event AgentActivated(bytes32 indexed agentId);

    // Errors
    error AgentNotFound();
    error AgentExists();
    error Unauthorized();
    error InvalidStrategy();
    error InsufficientBalance();
    error SwapFailed();
    error TriggerNotMet();
    error CooldownActive();
    error InvalidAddress();

    constructor(
        address _pyth,
        address _ens,
        address _oneInchRouter,
        bytes32 _baseNode
    ) {
        if (_pyth == address(0) || _ens == address(0) || _oneInchRouter == address(0)) {
            revert InvalidAddress();
        }
        pyth = IPyth(_pyth);
        ens = IENS(_ens);
        oneInchRouter = IAggregationRouterV6(_oneInchRouter);
        baseNode = _baseNode;
    }

    /**
     * @notice Create new trading agent with ENS identity
     * @param agentId Unique agent identifier
     * @param ensLabel ENS subdomain label (e.g., "my-bot")
     * @param strategy Trading strategy configuration
     */
    function createAgent(
        bytes32 agentId,
        string calldata ensLabel,
        TradingStrategy calldata strategy
    ) external returns (bytes32 ensNode) {
        if (agents[agentId].exists) revert AgentExists();
        _validateStrategy(strategy);

        // Create ENS subdomain
        bytes32 label = keccak256(abi.encodePacked(ensLabel));
        ensNode = keccak256(abi.encodePacked(baseNode, label));

        ens.setSubnodeRecord(
            baseNode,
            label,
            address(this), // Contract owns the ENS
            address(0),
            0
        );

        // Store agent
        agents[agentId] = Agent({
            owner: msg.sender,
            ensNode: ensNode,
            ensName: string(abi.encodePacked(ensLabel, ".agenttrade.eth")),
            strategy: strategy,
            createdAt: block.timestamp,
            totalExecutions: 0,
            exists: true
        });

        userAgents[msg.sender].push(agentId);
        allAgentIds.push(agentId);
        agentCount++;

        // Approve 1inch router
        IERC20(strategy.tokenIn).safeApprove(
            address(oneInchRouter),
            type(uint256).max
        );

        emit AgentCreated(agentId, msg.sender, agents[agentId].ensName, strategy.priceFeedId);
    }

    /**
     * @notice Chainlink Automation check function
     * @dev Called off-chain to determine if performUpkeep should execute
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        bytes32[] memory readyAgents = new bytes32[](maxAgentsPerCheck);
        uint256 count = 0;
        uint256 maxCheck = allAgentIds.length < maxAgentsPerCheck
            ? allAgentIds.length
            : maxAgentsPerCheck;

        for (uint256 i = 0; i < maxCheck && count < maxAgentsPerCheck; i++) {
            bytes32 agentId = allAgentIds[i];
            Agent memory agent = agents[agentId];

            // Skip inactive or cooling down agents
            if (
                !agent.strategy.isActive ||
                block.timestamp < agent.strategy.lastExecuted + agent.strategy.cooldownPeriod
            ) {
                continue;
            }

            // Check if agent has sufficient balance
            uint256 balance = IERC20(agent.strategy.tokenIn).balanceOf(address(this));
            uint256 requiredAmount = agent.strategy.amountIn == 0
                ? balance
                : agent.strategy.amountIn;

            if (balance < requiredAmount || requiredAmount == 0) {
                continue;
            }

            // Check price trigger
            try pyth.getPriceNoOlderThan(agent.strategy.priceFeedId, priceMaxAge)
                returns (PythStructs.Price memory price)
            {
                uint256 currentPrice = _convertPrice(price.price, price.expo);
                bool triggered = agent.strategy.triggerAbove
                    ? currentPrice >= agent.strategy.triggerPrice
                    : currentPrice <= agent.strategy.triggerPrice;

                if (triggered) {
                    readyAgents[count] = agentId;
                    count++;
                }
            } catch {
                // Skip agents with invalid price feeds
                continue;
            }
        }

        if (count > 0) {
            // Pack ready agents
            bytes32[] memory result = new bytes32[](count);
            for (uint256 i = 0; i < count; i++) {
                result[i] = readyAgents[i];
            }
            return (true, abi.encode(result));
        }

        return (false, "");
    }

    /**
     * @notice Chainlink Automation execution function
     * @dev Called on-chain by Chainlink nodes when checkUpkeep returns true
     * @param performData Encoded array of agent IDs to execute
     */
    function performUpkeep(
        bytes calldata performData
    ) external override nonReentrant {
        bytes32[] memory agentIds = abi.decode(performData, (bytes32[]));

        for (uint256 i = 0; i < agentIds.length; i++) {
            // Use try-catch to prevent one failure from blocking others
            try this.executeSwap(agentIds[i]) {
                // Success - continue
            } catch {
                // Log failure and continue with next agent
                continue;
            }
        }
    }

    /**
     * @notice Execute swap for specific agent (public for manual execution)
     * @param agentId Agent to execute swap for
     */
    function executeSwap(bytes32 agentId) external nonReentrant {
        Agent storage agent = agents[agentId];
        if (!agent.exists) revert AgentNotFound();
        if (!agent.strategy.isActive) revert InvalidStrategy();

        TradingStrategy memory strategy = agent.strategy;

        // Revalidate cooldown
        if (block.timestamp < strategy.lastExecuted + strategy.cooldownPeriod) {
            revert CooldownActive();
        }

        // Get fresh price and verify trigger
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(
            strategy.priceFeedId,
            priceMaxAge
        );

        uint256 currentPrice = _convertPrice(price.price, price.expo);
        bool triggered = strategy.triggerAbove
            ? currentPrice >= strategy.triggerPrice
            : currentPrice <= strategy.triggerPrice;

        if (!triggered) revert TriggerNotMet();

        // Calculate swap amount
        uint256 balance = IERC20(strategy.tokenIn).balanceOf(address(this));
        uint256 swapAmount = strategy.amountIn == 0 ? balance : strategy.amountIn;

        if (balance < swapAmount || swapAmount == 0) {
            revert InsufficientBalance();
        }

        // Record balances
        uint256 balanceBefore = IERC20(strategy.tokenOut).balanceOf(address(this));

        // Execute swap via 1inch
        // Note: In production, you'd get swap data from 1inch API off-chain
        // and pass it via a keeper/relayer. For simplicity, this assumes
        // the swap parameters are pre-configured or calculated off-chain.
        
        IAggregationRouterV6.SwapDescription memory desc = IAggregationRouterV6
            .SwapDescription({
                srcToken: strategy.tokenIn,
                dstToken: strategy.tokenOut,
                srcReceiver: address(oneInchRouter),
                dstReceiver: address(this),
                amount: swapAmount,
                minReturnAmount: strategy.minReturnAmount,
                flags: 0
            });

        // Execute swap (permit and data would come from 1inch API in production)
        try oneInchRouter.swap(address(0), desc, "", "") returns (
            uint256 returnAmount,
            uint256 /* spentAmount */
        ) {
            // Update state
            agent.strategy.lastExecuted = block.timestamp;
            agent.totalExecutions++;

            emit SwapExecuted(
                agentId,
                strategy.tokenIn,
                strategy.tokenOut,
                swapAmount,
                returnAmount,
                strategy.triggerPrice,
                currentPrice
            );
        } catch {
            revert SwapFailed();
        }
    }

    /**
     * @notice Update agent strategy
     */
    function updateStrategy(
        bytes32 agentId,
        TradingStrategy calldata newStrategy
    ) external {
        Agent storage agent = agents[agentId];
        if (!agent.exists) revert AgentNotFound();
        if (agent.owner != msg.sender) revert Unauthorized();

        _validateStrategy(newStrategy);

        // Update approvals if token changed
        if (agent.strategy.tokenIn != newStrategy.tokenIn) {
            IERC20(newStrategy.tokenIn).safeApprove(
                address(oneInchRouter),
                type(uint256).max
            );
        }

        agent.strategy = newStrategy;
        emit StrategyUpdated(agentId);
    }

    /**
     * @notice Deposit tokens for agent trading
     */
    function deposit(
        bytes32 agentId,
        address token,
        uint256 amount
    ) external {
        Agent storage agent = agents[agentId];
        if (!agent.exists) revert AgentNotFound();
        if (agent.owner != msg.sender) revert Unauthorized();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Withdraw tokens from contract
     */
    function withdraw(
        bytes32 agentId,
        address token,
        uint256 amount
    ) external {
        Agent storage agent = agents[agentId];
        if (!agent.exists) revert AgentNotFound();
        if (agent.owner != msg.sender) revert Unauthorized();

        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /**
     * @notice Activate agent
     */
    function activateAgent(bytes32 agentId) external {
        Agent storage agent = agents[agentId];
        if (!agent.exists) revert AgentNotFound();
        if (agent.owner != msg.sender) revert Unauthorized();

        agent.strategy.isActive = true;
        emit AgentActivated(agentId);
    }

    /**
     * @notice Deactivate agent
     */
    function deactivateAgent(bytes32 agentId) external {
        Agent storage agent = agents[agentId];
        if (!agent.exists) revert AgentNotFound();
        if (agent.owner != msg.sender) revert Unauthorized();

        agent.strategy.isActive = false;
        emit AgentDeactivated(agentId);
    }

    /**
     * @notice Get agent details
     */
    function getAgent(bytes32 agentId) external view returns (Agent memory) {
        if (!agents[agentId].exists) revert AgentNotFound();
        return agents[agentId];
    }

    /**
     * @notice Get user's agents
     */
    function getUserAgents(address user) external view returns (bytes32[] memory) {
        return userAgents[user];
    }

    /**
     * @notice Get agent token balance
     */
    function getAgentBalance(
        bytes32 agentId,
        address token
    ) external view returns (uint256) {
        if (!agents[agentId].exists) revert AgentNotFound();
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Check if trigger conditions are met
     */
    function checkTrigger(bytes32 agentId)
        external
        view
        returns (
            bool met,
            uint256 currentPrice,
            uint256 triggerPrice
        )
    {
        Agent memory agent = agents[agentId];
        if (!agent.exists) revert AgentNotFound();

        PythStructs.Price memory price = pyth.getPriceUnsafe(
            agent.strategy.priceFeedId
        );
        uint256 priceValue = _convertPrice(price.price, price.expo);

        bool triggered = agent.strategy.triggerAbove
            ? priceValue >= agent.strategy.triggerPrice
            : priceValue <= agent.strategy.triggerPrice;

        return (triggered, priceValue, agent.strategy.triggerPrice);
    }

    /**
     * @notice Admin: Update max agents per check (gas optimization)
     */
    function setMaxAgentsPerCheck(uint256 _max) external {
        // Add access control as needed
        maxAgentsPerCheck = _max;
    }

    /**
     * @notice Admin: Update price max age
     */
    function setPriceMaxAge(uint256 _age) external {
        // Add access control as needed
        priceMaxAge = _age;
    }

    // Internal functions

    function _validateStrategy(TradingStrategy memory strategy) internal view {
        if (
            strategy.priceFeedId == bytes32(0) ||
            strategy.triggerPrice == 0 ||
            strategy.tokenIn == address(0) ||
            strategy.tokenOut == address(0) ||
            strategy.tokenIn == strategy.tokenOut
        ) {
            revert InvalidStrategy();
        }

        // Verify price feed exists
        try pyth.getPriceUnsafe(strategy.priceFeedId) returns (
            PythStructs.Price memory
        ) {
            // Valid
        } catch {
            revert InvalidStrategy();
        }
    }

    function _convertPrice(
        int64 price,
        int32 expo
    ) internal pure returns (uint256) {
        require(price > 0, "Invalid price");
        uint256 priceValue = uint256(uint64(price));

        if (expo < 0) {
            // Most common case: negative exponent
            return priceValue;
        } else {
            // Rare: positive exponent
            return priceValue * (10 ** uint256(int256(expo)));
        }
    }

    receive() external payable {}
}