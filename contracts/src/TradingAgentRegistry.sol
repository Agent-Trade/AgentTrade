// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title TradingAgentRegistry
 * @notice Registry for ENS-named autonomous trading agents with price-triggered automation
 * @dev Integrates Pyth price feeds, ENS subnames, and automated trade execution
 * Uses the official Pyth SDK for type safety and maintainability
 */
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

// interface IENS {
//     function setSubnodeRecord(
//         bytes32 node,
//         bytes32 label,
//         address owner,
//         address resolver,
//         uint64 ttl
//     ) external returns (bytes32);
    
//     function setPrimaryName(bytes32 node) external;
// }

// /**
//  * @notice Trading strategy configuration
//  */
// struct TradingStrategy {
//     bytes32 priceFeedId;      // Pyth price feed ID to monitor
//     uint256 triggerPrice;     // Price threshold (scaled by 1e8)
//     bool triggerAbove;        // true = execute when price > triggerPrice, false = when < triggerPrice
//     address tokenIn;          // Token to sell
//     address tokenOut;         // Token to buy
//     uint256 amountIn;         // Amount to trade (0 = use balance)
//     bool isActive;            // Whether strategy is active
//     uint256 lastExecuted;     // Timestamp of last execution
//     uint256 cooldownPeriod;   // Minimum seconds between executions
// }

// /**
//  * @notice Agent information
//  */
// struct Agent {
//     address owner;            // Agent wallet address
//     bytes32 ensNode;          // ENS subname node
//     string ensName;           // Human-readable ENS name
//     TradingStrategy strategy;  // Trading strategy configuration
//     uint256 createdAt;        // Creation timestamp
//     bool exists;              // Whether agent exists
// }

// contract TradingAgentRegistry {
//     IPyth public immutable pyth;
//     IENS public immutable ens;
//     bytes32 public immutable baseNode; // Parent ENS domain node
    
//     // Agent storage: agentId => Agent
//     mapping(bytes32 => Agent) public agents;
//     mapping(address => bytes32[]) public userAgents; // user => agentIds[]
//     mapping(bytes32 => bytes32) public ensNodeToAgentId; // ensNode => agentId
    
//     uint256 public agentCount;
    
//     // Events
//     event AgentCreated(
//         bytes32 indexed agentId,
//         address indexed owner,
//         bytes32 indexed ensNode,
//         string ensName
//     );
    
//     event StrategyUpdated(
//         bytes32 indexed agentId,
//         bytes32 priceFeedId,
//         uint256 triggerPrice,
//         bool triggerAbove
//     );
    
//     event TriggerExecuted(
//         bytes32 indexed agentId,
//         bytes32 indexed priceFeedId,
//         uint256 currentPrice,
//         uint256 triggerPrice,
//         uint256 timestamp
//     );
    
//     event AgentDeactivated(bytes32 indexed agentId);
    
//     error AgentNotFound();
//     error Unauthorized();
//     error InvalidStrategy();
//     error PriceNotUpdated();
//     error CooldownNotExpired();
//     error TriggerNotMet();
    
//     constructor(address _pyth, address _ens, bytes32 _baseNode) {
//         pyth = IPyth(_pyth);
//         ens = IENS(_ens);
//         baseNode = _baseNode;
//     }
    
//     /**
//      * @notice Create a new trading agent with ENS subname
//      * @param agentId Unique identifier for the agent
//      * @param ensLabel Label for ENS subname (e.g., "my-agent")
//      * @param strategy Initial trading strategy
//      */
//     function createAgent(
//         bytes32 agentId,
//         string calldata ensLabel,
//         TradingStrategy calldata strategy
//     ) external returns (bytes32 ensNode) {
//         if (agents[agentId].exists) revert("Agent already exists");
//         if (!_isValidStrategy(strategy)) revert InvalidStrategy();
        
//         // Create ENS subname
//         bytes32 label = keccak256(abi.encodePacked(ensLabel));
//         ensNode = keccak256(abi.encodePacked(baseNode, label));
        
//         // Register ENS subname
//         ens.setSubnodeRecord(
//             baseNode,
//             label,
//             msg.sender,  // Owner
//             address(0),  // Resolver (can be set later)
//             0           // TTL
//         );
        
//         // Store agent
//         agents[agentId] = Agent({
//             owner: msg.sender,
//             ensNode: ensNode,
//             ensName: string(abi.encodePacked(ensLabel, ".agenttrade.eth")),
//             strategy: strategy,
//             createdAt: block.timestamp,
//             exists: true
//         });
        
//         userAgents[msg.sender].push(agentId);
//         ensNodeToAgentId[ensNode] = agentId;
//         agentCount++;
        
//         emit AgentCreated(agentId, msg.sender, ensNode, agents[agentId].ensName);
//     }
    
//     /**
//      * @notice Update agent's trading strategy
//      */
//     function updateStrategy(
//         bytes32 agentId,
//         TradingStrategy calldata newStrategy
//     ) external {
//         Agent storage agent = agents[agentId];
//         if (!agent.exists) revert AgentNotFound();
//         if (agent.owner != msg.sender) revert Unauthorized();
//         if (!_isValidStrategy(newStrategy)) revert InvalidStrategy();
        
//         agent.strategy = newStrategy;
        
//         emit StrategyUpdated(
//             agentId,
//             newStrategy.priceFeedId,
//             newStrategy.triggerPrice,
//             newStrategy.triggerAbove
//         );
//     }
    
//     /**
//      * @notice Check if price trigger is met and execute if conditions are satisfied
//      * @param agentId Agent to check
//      * @param updateData Pyth price update data (if needed)
//      */
//     function checkAndExecuteTrigger(
//         bytes32 agentId,
//         bytes[] calldata updateData
//     ) external payable {
//         Agent storage agent = agents[agentId];
//         if (!agent.exists) revert AgentNotFound();
//         if (!agent.strategy.isActive) revert("Strategy not active");
        
//         TradingStrategy memory strategy = agent.strategy;
        
//         // Update price feeds if update data provided
//         if (updateData.length > 0) {
//             pyth.updatePriceFeeds{value: msg.value}(updateData);
//         }
        
//         // Get current price
//         PythStructs.Price memory price = pyth.getPriceNoOlderThan(
//             strategy.priceFeedId,
//             300 // Max 5 minutes old
//         );
        
//         if (price.publishTime == 0) revert PriceNotUpdated();
        
//         // Check cooldown
//         if (block.timestamp < strategy.lastExecuted + strategy.cooldownPeriod) {
//             revert CooldownNotExpired();
//         }
        
//         // Convert price to uint256 (scaled by 1e8)
//         uint256 currentPrice = uint256(uint64(price.price));
//         if (price.expo < 0) {
//             currentPrice = currentPrice * (10 ** uint256(-int256(price.expo)));
//         } else {
//             currentPrice = currentPrice / (10 ** uint256(int256(price.expo)));
//         }
        
//         // Check trigger condition
//         bool triggerMet = strategy.triggerAbove 
//             ? currentPrice >= strategy.triggerPrice
//             : currentPrice <= strategy.triggerPrice;
            
//         if (!triggerMet) revert TriggerNotMet();
        
//         // Update last executed time
//         agent.strategy.lastExecuted = block.timestamp;
        
//         emit TriggerExecuted(
//             agentId,
//             strategy.priceFeedId,
//             currentPrice,
//             strategy.triggerPrice,
//             block.timestamp
//         );
        
//         // Note: Actual swap execution would happen via callback or separate function
//         // This contract focuses on trigger detection and agent management
//     }
    
//     /**
//      * @notice Deactivate an agent
//      */
//     function deactivateAgent(bytes32 agentId) external {
//         Agent storage agent = agents[agentId];
//         if (!agent.exists) revert AgentNotFound();
//         if (agent.owner != msg.sender) revert Unauthorized();
        
//         agent.strategy.isActive = false;
//         emit AgentDeactivated(agentId);
//     }
    
//     /**
//      * @notice Get agent information
//      */
//     function getAgent(bytes32 agentId) external view returns (Agent memory) {
//         if (!agents[agentId].exists) revert AgentNotFound();
//         return agents[agentId];
//     }
    
//     /**
//      * @notice Get all agent IDs for a user
//      */
//     function getUserAgents(address user) external view returns (bytes32[] memory) {
//         return userAgents[user];
//     }
    
//     /**
//      * @notice Check if trigger conditions are met (view function)
//      */
//     function checkTrigger(bytes32 agentId) external view returns (bool met, uint256 currentPrice) {
//         Agent memory agent = agents[agentId];
//         if (!agent.exists) revert AgentNotFound();
        
//         PythStructs.Price memory price = pyth.getPrice(agent.strategy.priceFeedId);
        
//         // Convert price
//         uint256 priceValue = uint256(uint64(price.price));
//         if (price.expo < 0) {
//             priceValue = priceValue * (10 ** uint256(-int256(price.expo)));
//         } else {
//             priceValue = priceValue / (10 ** uint256(int256(price.expo)));
//         }
        
//         bool triggerMet = agent.strategy.triggerAbove
//             ? priceValue >= agent.strategy.triggerPrice
//             : priceValue <= agent.strategy.triggerPrice;
            
//         return (triggerMet, priceValue);
//     }
    
//     /**
//      * @notice Validate strategy parameters
//      */
//     function _isValidStrategy(TradingStrategy memory strategy) internal pure returns (bool) {
//         return strategy.priceFeedId != bytes32(0) &&
//                strategy.triggerPrice > 0 &&
//                strategy.tokenIn != address(0) &&
//                strategy.tokenOut != address(0);
//     }
// }



interface IENS {
    function setSubnodeRecord(
        bytes32 node,
        bytes32 label,
        address owner,
        address resolver,
        uint64 ttl
    ) external returns (bytes32);
    
    function setPrimaryName(bytes32 node) external;
}

/**
 * @notice Trading strategy configuration
 */
struct TradingStrategy {
    bytes32 priceFeedId;      // Pyth price feed ID to monitor
    uint256 triggerPrice;     // Price threshold (scaled to match price feed decimals)
    bool triggerAbove;        // true = execute when price > triggerPrice, false = when < triggerPrice
    address tokenIn;          // Token to sell
    address tokenOut;         // Token to buy
    uint256 amountIn;         // Amount to trade (0 = use balance)
    bool isActive;            // Whether strategy is active
    uint256 lastExecuted;     // Timestamp of last execution
    uint256 cooldownPeriod;   // Minimum seconds between executions
}

/**
 * @notice Agent information
 */
struct Agent {
    address owner;            // Agent wallet address
    bytes32 ensNode;          // ENS subname node
    string ensName;           // Human-readable ENS name
    TradingStrategy strategy;  // Trading strategy configuration
    uint256 createdAt;        // Creation timestamp
    bool exists;              // Whether agent exists
}

contract TradingAgentRegistry {
    IPyth public immutable pyth;
    IENS public immutable ens;
    bytes32 public immutable baseNode; // Parent ENS domain node
    
    // Agent storage: agentId => Agent
    mapping(bytes32 => Agent) public agents;
    mapping(address => bytes32[]) public userAgents; // user => agentIds[]
    mapping(bytes32 => bytes32) public ensNodeToAgentId; // ensNode => agentId
    
    uint256 public agentCount;
    
    // Events
    event AgentCreated(
        bytes32 indexed agentId,
        address indexed owner,
        bytes32 indexed ensNode,
        string ensName
    );
    
    event StrategyUpdated(
        bytes32 indexed agentId,
        bytes32 priceFeedId,
        uint256 triggerPrice,
        bool triggerAbove
    );
    
    event TriggerExecuted(
        bytes32 indexed agentId,
        bytes32 indexed priceFeedId,
        int64 currentPrice,
        int32 priceExponent,
        uint256 triggerPrice,
        uint256 timestamp
    );
    
    event AgentDeactivated(bytes32 indexed agentId);
    event AgentActivated(bytes32 indexed agentId);
    
    error AgentNotFound();
    error AgentAlreadyExists();
    error Unauthorized();
    error InvalidStrategy();
    error PriceNotUpdated();
    error CooldownNotExpired();
    error TriggerNotMet();
    error StrategyNotActive();
    error InvalidPriceFeed();
    
    constructor(address _pyth, address _ens, bytes32 _baseNode) {
        require(_pyth != address(0), "Invalid Pyth address");
        require(_ens != address(0), "Invalid ENS address");
        pyth = IPyth(_pyth);
        ens = IENS(_ens);
        baseNode = _baseNode;
    }
    
    /**
     * @notice Create a new trading agent with ENS subname
     * @param agentId Unique identifier for the agent
     * @param ensLabel Label for ENS subname (e.g., "my-agent")
     * @param strategy Initial trading strategy
     */
    function createAgent(
        bytes32 agentId,
        string calldata ensLabel,
        TradingStrategy calldata strategy
    ) external returns (bytes32 ensNode) {
        if (agents[agentId].exists) revert AgentAlreadyExists();
        if (!_isValidStrategy(strategy)) revert InvalidStrategy();
        
        // Verify price feed exists
        _validatePriceFeed(strategy.priceFeedId);
        
        // Create ENS subname
        bytes32 label = keccak256(abi.encodePacked(ensLabel));
        ensNode = keccak256(abi.encodePacked(baseNode, label));
        
        // Register ENS subname
        ens.setSubnodeRecord(
            baseNode,
            label,
            msg.sender,  // Owner
            address(0),  // Resolver (can be set later)
            0           // TTL
        );
        
        // Store agent
        agents[agentId] = Agent({
            owner: msg.sender,
            ensNode: ensNode,
            ensName: string(abi.encodePacked(ensLabel, ".agentrade.eth")),
            strategy: strategy,
            createdAt: block.timestamp,
            exists: true
        });
        
        userAgents[msg.sender].push(agentId);
        ensNodeToAgentId[ensNode] = agentId;
        agentCount++;
        
        emit AgentCreated(agentId, msg.sender, ensNode, agents[agentId].ensName);
        emit StrategyUpdated(
            agentId,
            strategy.priceFeedId,
            strategy.triggerPrice,
            strategy.triggerAbove
        );
    }
    
    /**
     * @notice Update agent's trading strategy
     */
    function updateStrategy(
        bytes32 agentId,
        TradingStrategy calldata newStrategy
    ) external {
        Agent storage agent = agents[agentId];
        if (!agent.exists) revert AgentNotFound();
        if (agent.owner != msg.sender) revert Unauthorized();
        if (!_isValidStrategy(newStrategy)) revert InvalidStrategy();
        
        // Verify price feed exists
        _validatePriceFeed(newStrategy.priceFeedId);
        
        agent.strategy = newStrategy;
        
        emit StrategyUpdated(
            agentId,
            newStrategy.priceFeedId,
            newStrategy.triggerPrice,
            newStrategy.triggerAbove
        );
    }
    
    /**
     * @notice Check if price trigger is met and execute if conditions are satisfied
     * @param agentId Agent to check
     * @param updateData Pyth price update data (if needed)
     */
    function checkAndExecuteTrigger(
        bytes32 agentId,
        bytes[] calldata updateData
    ) external payable {
        Agent storage agent = agents[agentId];
        if (!agent.exists) revert AgentNotFound();
        if (!agent.strategy.isActive) revert StrategyNotActive();
        
        TradingStrategy memory strategy = agent.strategy;
        
        // Update price feeds if update data provided
        if (updateData.length > 0) {
            uint256 fee = pyth.getUpdateFee(updateData);
            require(msg.value >= fee, "Insufficient fee");
            pyth.updatePriceFeeds{value: fee}(updateData);
        }
        
        // Get current price (max 5 minutes old)
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(
            strategy.priceFeedId,
            300
        );
        
        if (price.publishTime == 0) revert PriceNotUpdated();
        
        // Check cooldown
        if (block.timestamp < strategy.lastExecuted + strategy.cooldownPeriod) {
            revert CooldownNotExpired();
        }
        
        // Convert both prices to comparable format (scale to same decimal places)
        uint256 currentPrice = _convertPriceToUint(price.price, price.expo);
        
        // Check trigger condition
        bool triggerMet = strategy.triggerAbove 
            ? currentPrice >= strategy.triggerPrice
            : currentPrice <= strategy.triggerPrice;
            
        if (!triggerMet) revert TriggerNotMet();
        
        // Update last executed time
        agent.strategy.lastExecuted = block.timestamp;
        
        emit TriggerExecuted(
            agentId,
            strategy.priceFeedId,
            price.price,
            price.expo,
            strategy.triggerPrice,
            block.timestamp
        );
        
        // Refund excess fee
        if (updateData.length > 0 && msg.value > pyth.getUpdateFee(updateData)) {
            uint256 refund = msg.value - pyth.getUpdateFee(updateData);
            (bool success, ) = msg.sender.call{value: refund}("");
            require(success, "Refund failed");
        }
        
        // Note: Actual swap execution would happen via callback or separate function
        // This contract focuses on trigger detection and agent management
    }
    
    /**
     * @notice Activate an agent's strategy
     */
    function activateAgent(bytes32 agentId) external {
        Agent storage agent = agents[agentId];
        if (!agent.exists) revert AgentNotFound();
        if (agent.owner != msg.sender) revert Unauthorized();
        
        agent.strategy.isActive = true;
        emit AgentActivated(agentId);
    }
    
    /**
     * @notice Deactivate an agent's strategy
     */
    function deactivateAgent(bytes32 agentId) external {
        Agent storage agent = agents[agentId];
        if (!agent.exists) revert AgentNotFound();
        if (agent.owner != msg.sender) revert Unauthorized();
        
        agent.strategy.isActive = false;
        emit AgentDeactivated(agentId);
    }
    
    /**
     * @notice Get agent information
     */
    function getAgent(bytes32 agentId) external view returns (Agent memory) {
        if (!agents[agentId].exists) revert AgentNotFound();
        return agents[agentId];
    }
    
    /**
     * @notice Get all agent IDs for a user
     */
    function getUserAgents(address user) external view returns (bytes32[] memory) {
        return userAgents[user];
    }
    
    /**
     * @notice Check if trigger conditions are met (view function)
     */
    function checkTrigger(bytes32 agentId) external view returns (
        bool met, 
        uint256 currentPrice,
        uint256 triggerPrice,
        bool triggerAbove
    ) {
        Agent memory agent = agents[agentId];
        if (!agent.exists) revert AgentNotFound();
        
        PythStructs.Price memory price = pyth.getPriceUnsafe(agent.strategy.priceFeedId);
        
        // Convert price to comparable format
        uint256 priceValue = _convertPriceToUint(price.price, price.expo);
        
        bool triggerMet = agent.strategy.triggerAbove
            ? priceValue >= agent.strategy.triggerPrice
            : priceValue <= agent.strategy.triggerPrice;
            
        return (
            triggerMet, 
            priceValue, 
            agent.strategy.triggerPrice,
            agent.strategy.triggerAbove
        );
    }
    
    /**
     * @notice Get current price for an agent's price feed
     */
    function getAgentPrice(bytes32 agentId) external view returns (
        int64 price,
        int32 expo,
        uint256 publishTime
    ) {
        Agent memory agent = agents[agentId];
        if (!agent.exists) revert AgentNotFound();
        
        PythStructs.Price memory pythPrice = pyth.getPriceUnsafe(agent.strategy.priceFeedId);
        return (pythPrice.price, pythPrice.expo, pythPrice.publishTime);
    }
    
    /**
     * @notice Validate strategy parameters
     */
    function _isValidStrategy(TradingStrategy memory strategy) internal pure returns (bool) {
        return strategy.priceFeedId != bytes32(0) &&
               strategy.triggerPrice > 0 &&
               strategy.tokenIn != address(0) &&
               strategy.tokenOut != address(0) &&
               strategy.tokenIn != strategy.tokenOut;
    }
    
    /**
     * @notice Validate that a price feed exists in Pyth
     */
    function _validatePriceFeed(bytes32 priceFeedId) internal view {
        // Try to get the price - will revert if feed doesn't exist
        try pyth.getPriceUnsafe(priceFeedId) returns (PythStructs.Price memory) {
            // Price feed exists
        } catch {
            revert InvalidPriceFeed();
        }
    }
    
    /**
     * @notice Convert Pyth price to uint256 with standardized decimals
     * @param price The price value from Pyth
     * @param expo The exponent from Pyth (negative for division)
     * @return Normalized price value
     */
    function _convertPriceToUint(int64 price, int32 expo) internal pure returns (uint256) {
        require(price > 0, "Invalid price");
        
        uint256 priceValue = uint256(uint64(price));
        
        // Handle negative exponent (most common case)
        if (expo < 0) {
            // Price = value * 10^expo where expo is negative
            // To maintain precision, we scale up by the absolute value of expo
            // Example: price=150000000, expo=-8 means 1.5 USD
            // We return: 150000000 (with implied 8 decimals)
            return priceValue;
        } else {
            // Positive exponent (rare) - scale down
            return priceValue * (10 ** uint256(int256(expo)));
        }
    }
    
    /**
     * @notice Transfer agent ownership
     */
    function transferAgentOwnership(bytes32 agentId, address newOwner) external {
        require(newOwner != address(0), "Invalid new owner");
        
        Agent storage agent = agents[agentId];
        if (!agent.exists) revert AgentNotFound();
        if (agent.owner != msg.sender) revert Unauthorized();
        
        // Remove from old owner's list
        _removeFromUserAgents(msg.sender, agentId);
        
        // Add to new owner's list
        userAgents[newOwner].push(agentId);
        
        // Update owner
        agent.owner = newOwner;
    }
    
    /**
     * @notice Remove agent ID from user's agent list
     */
    function _removeFromUserAgents(address user, bytes32 agentId) internal {
        bytes32[] storage agentIds = userAgents[user];
        for (uint256 i = 0; i < agentIds.length; i++) {
            if (agentIds[i] == agentId) {
                agentIds[i] = agentIds[agentIds.length - 1];
                agentIds.pop();
                break;
            }
        }
    }
    
    /**
     * @notice Get update fee for Pyth price update
     */
    function getUpdateFee(bytes[] calldata updateData) external view returns (uint256) {
        return pyth.getUpdateFee(updateData);
    }
    
    receive() external payable {}
}
