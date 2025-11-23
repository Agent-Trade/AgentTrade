// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title PythPriceConsumer
 * @notice Contract to consume Pyth price feeds after they've been updated on-chain
 * This contract reads prices from the Pyth price feed contract
 * Uses the official Pyth SDK for type safety and maintainability
 */
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

// contract PythPriceConsumer {
//     IPyth public immutable pyth;
    
//     // Price feed IDs for common assets
//     // ETH/USD on Base Sepolia: 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
//     bytes32 public constant ETH_USD_PRICE_FEED_ID = 
//         0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    
//     // BTC/USD on Base Sepolia: 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43
//     bytes32 public constant BTC_USD_PRICE_FEED_ID = 
//         0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43;

//     event PriceUpdated(bytes32 indexed priceId, int64 price, uint64 conf, uint256 timestamp);

//     constructor(address _pyth) {
//         pyth = IPyth(_pyth);
//     }

//     /**
//      * @notice Update price feeds on-chain using Pyth update data
//      * @param updateData The price update data fetched from Hermes API
//      */
//     function updatePriceFeeds(bytes[] calldata updateData) external payable {
//         pyth.updatePriceFeeds{value: msg.value}(updateData);
//     }

//     /**
//      * @notice Get the latest price for a given price feed ID
//      * @param priceId The price feed ID
//      * @return price The current price
//      * @return conf The confidence interval
//      * @return publishTime The publish time of the price
//      */
//     function getLatestPrice(
//         bytes32 priceId
//     ) public view returns (int64 price, uint64 conf, uint256 publishTime) {
//         PythStructs.Price memory pythPrice = pyth.getPrice(priceId);
//         return (pythPrice.price, pythPrice.conf, pythPrice.publishTime);
//     }

//     /**
//      * @notice Get ETH/USD price
//      */
//     function getEthPrice() public view returns (int64 price, uint64 conf, uint256 publishTime) {
//         return getLatestPrice(ETH_USD_PRICE_FEED_ID);
//     }

//     /**
//      * @notice Get BTC/USD price
//      */
//     function getBtcPrice() public view returns (int64 price, uint64 conf, uint256 publishTime) {
//         return getLatestPrice(BTC_USD_PRICE_FEED_ID);
//     }

//     /**
//      * @notice Get price with age check (price must be no older than specified age)
//      * @param priceId The price feed ID
//      * @param age Maximum age of the price in seconds
//      */
//     function getPriceNoOlderThan(
//         bytes32 priceId,
//         uint256 age
//     ) public view returns (int64 price, uint64 conf, uint256 publishTime) {
//         PythStructs.Price memory pythPrice = pyth.getPriceNoOlderThan(priceId, age);
//         return (pythPrice.price, pythPrice.conf, pythPrice.publishTime);
//     }
    
//     /**
//      * @notice Get the full price struct for a given price feed ID
//      * @param priceId The price feed ID
//      * @return price The full Pyth price struct including exponent
//      */
//     function getPriceStruct(
//         bytes32 priceId
//     ) public view returns (PythStructs.Price memory price) {
//         return pyth.getPrice(priceId);
//     }
// }

contract PythPriceConsumer {
    IPyth public immutable pyth;
    
    // Price feed IDs for common assets
    // ETH/USD on Base Sepolia: 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
    bytes32 public constant ETH_USD_PRICE_FEED_ID = 
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    
    // BTC/USD on Base Sepolia: 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43
    bytes32 public constant BTC_USD_PRICE_FEED_ID = 
        0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43;

    event PriceUpdated(
        bytes32 indexed priceId, 
        int64 price, 
        uint64 conf, 
        int32 expo,
        uint256 timestamp
    );

    error InvalidPythAddress();
    error InsufficientFee();
    error InvalidPriceFeed();
    error PriceTooOld();

    constructor(address _pyth) {
        if (_pyth == address(0)) revert InvalidPythAddress();
        pyth = IPyth(_pyth);
    }

    /**
     * @notice Update price feeds on-chain using Pyth update data
     * @param updateData The price update data fetched from Hermes API
     * @dev Requires payment of update fee. Call getUpdateFee() first to determine required value.
     */
    function updatePriceFeeds(bytes[] calldata updateData) external payable {
        uint256 fee = pyth.getUpdateFee(updateData);
        if (msg.value < fee) revert InsufficientFee();
        
        pyth.updatePriceFeeds{value: fee}(updateData);
        
        // Refund excess payment
        if (msg.value > fee) {
            (bool success, ) = msg.sender.call{value: msg.value - fee}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @notice Update price feeds and emit events for each updated price
     * @param updateData The price update data
     * @param priceIds Array of price IDs to emit events for
     */
    function updateAndEmitPrices(
        bytes[] calldata updateData,
        bytes32[] calldata priceIds
    ) external payable {
        uint256 fee = pyth.getUpdateFee(updateData);
        if (msg.value < fee) revert InsufficientFee();
        
        pyth.updatePriceFeeds{value: fee}(updateData);
        
        // Emit events for each price
        for (uint256 i = 0; i < priceIds.length; i++) {
            PythStructs.Price memory price = pyth.getPriceUnsafe(priceIds[i]);
            emit PriceUpdated(
                priceIds[i],
                price.price,
                price.conf,
                price.expo,
                price.publishTime
            );
        }
        
        // Refund excess payment
        if (msg.value > fee) {
            (bool success, ) = msg.sender.call{value: msg.value - fee}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @notice Get the latest price for a given price feed ID (unsafe - no staleness check)
     * @param priceId The price feed ID
     * @return price The current price
     * @return conf The confidence interval
     * @return expo The price exponent
     * @return publishTime The publish time of the price
     */
    function getLatestPrice(
        bytes32 priceId
    ) public view returns (
        int64 price, 
        uint64 conf,
        int32 expo,
        uint256 publishTime
    ) {
        PythStructs.Price memory pythPrice = pyth.getPriceUnsafe(priceId);
        return (
            pythPrice.price, 
            pythPrice.conf, 
            pythPrice.expo,
            pythPrice.publishTime
        );
    }

    /**
     * @notice Get ETH/USD price (unsafe - no staleness check)
     */
    function getEthPrice() public view returns (
        int64 price, 
        uint64 conf,
        int32 expo,
        uint256 publishTime
    ) {
        return getLatestPrice(ETH_USD_PRICE_FEED_ID);
    }

    /**
     * @notice Get BTC/USD price (unsafe - no staleness check)
     */
    function getBtcPrice() public view returns (
        int64 price, 
        uint64 conf,
        int32 expo,
        uint256 publishTime
    ) {
        return getLatestPrice(BTC_USD_PRICE_FEED_ID);
    }

    /**
     * @notice Get price with age check (price must be no older than specified age)
     * @param priceId The price feed ID
     * @param age Maximum age of the price in seconds
     */
    function getPriceNoOlderThan(
        bytes32 priceId,
        uint256 age
    ) public view returns (
        int64 price, 
        uint64 conf,
        int32 expo,
        uint256 publishTime
    ) {
        PythStructs.Price memory pythPrice = pyth.getPriceNoOlderThan(priceId, age);
        return (
            pythPrice.price, 
            pythPrice.conf,
            pythPrice.expo,
            pythPrice.publishTime
        );
    }
    
    /**
     * @notice Get the full price struct for a given price feed ID
     * @param priceId The price feed ID
     * @return price The full Pyth price struct including exponent
     */
    function getPriceStruct(
        bytes32 priceId
    ) public view returns (PythStructs.Price memory price) {
        return pyth.getPriceUnsafe(priceId);
    }

    /**
     * @notice Get the exponentially weighted moving average (EMA) price (unsafe)
     * @param priceId The price feed ID
     */
    function getEmaPrice(
        bytes32 priceId
    ) public view returns (
        int64 price,
        uint64 conf,
        int32 expo,
        uint256 publishTime
    ) {
        PythStructs.Price memory pythPrice = pyth.getEmaPriceUnsafe(priceId);
        return (
            pythPrice.price,
            pythPrice.conf,
            pythPrice.expo,
            pythPrice.publishTime
        );
    }

    /**
     * @notice Get EMA price with age check
     * @param priceId The price feed ID
     * @param age Maximum age in seconds
     */
    function getEmaPriceNoOlderThan(
        bytes32 priceId,
        uint256 age
    ) public view returns (
        int64 price,
        uint64 conf,
        int32 expo,
        uint256 publishTime
    ) {
        PythStructs.Price memory pythPrice = pyth.getEmaPriceNoOlderThan(priceId, age);
        return (
            pythPrice.price,
            pythPrice.conf,
            pythPrice.expo,
            pythPrice.publishTime
        );
    }

    /**
     * @notice Check if a price is valid (not too old)
     * @param priceId The price feed ID
     * @param maxAge Maximum acceptable age in seconds
     * @return valid Whether the price is valid
     * @return age Current age of the price in seconds
     */
    function isPriceValid(
        bytes32 priceId,
        uint256 maxAge
    ) public view returns (bool valid, uint256 age) {
        PythStructs.Price memory pythPrice = pyth.getPriceUnsafe(priceId);
        age = block.timestamp - pythPrice.publishTime;
        valid = age <= maxAge;
    }

    /**
     * @notice Get normalized price (convert to 18 decimals for easier integration)
     * @param priceId The price feed ID
     * @return normalizedPrice Price scaled to 18 decimals
     * @return originalExpo Original exponent from Pyth
     */
    function getNormalizedPrice(
        bytes32 priceId
    ) public view returns (uint256 normalizedPrice, int32 originalExpo) {
        PythStructs.Price memory pythPrice = pyth.getPriceUnsafe(priceId);
        require(pythPrice.price > 0, "Invalid price");
        
        originalExpo = pythPrice.expo;
        uint256 price = uint256(uint64(pythPrice.price));
        
        // Convert to 18 decimals
        // Pyth prices typically have expo of -8 (8 decimals)
        // We want 18 decimals
        if (pythPrice.expo < 0) {
            int32 targetExpo = -18;
            int32 expoDiff = targetExpo - pythPrice.expo;
            
            if (expoDiff > 0) {
                // Need to scale down
                normalizedPrice = price / (10 ** uint32(expoDiff));
            } else {
                // Need to scale up
                normalizedPrice = price * (10 ** uint32(-expoDiff));
            }
        } else {
            // Positive exponent (rare)
            normalizedPrice = price * (10 ** uint32(pythPrice.expo)) * 1e18;
        }
    }

    /**
     * @notice Get the fee required to update price feeds
     * @param updateData The update data
     * @return fee The required fee in wei
     */
    function getUpdateFee(bytes[] calldata updateData) external view returns (uint256 fee) {
        return pyth.getUpdateFee(updateData);
    }

    /**
     * @notice Check if a price feed exists
     * @param priceId The price feed ID
     * @return exists Whether the price feed exists
     */
    function priceFeedExists(bytes32 priceId) public view returns (bool exists) {
        try pyth.getPriceUnsafe(priceId) returns (PythStructs.Price memory) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @notice Get multiple prices in a single call (gas efficient)
     * @param priceIds Array of price feed IDs
     * @return prices Array of price structs
     */
    function getBatchPrices(
        bytes32[] calldata priceIds
    ) external view returns (PythStructs.Price[] memory prices) {
        prices = new PythStructs.Price[](priceIds.length);
        
        for (uint256 i = 0; i < priceIds.length; i++) {
            prices[i] = pyth.getPriceUnsafe(priceIds[i]);
        }
    }

    /**
     * @notice Compare two prices from different feeds
     * @param priceId1 First price feed ID
     * @param priceId2 Second price feed ID
     * @return ratio The ratio of price1 to price2 (scaled by 1e18)
     */
    function getPriceRatio(
        bytes32 priceId1,
        bytes32 priceId2
    ) external view returns (uint256 ratio) {
        (uint256 price1, ) = getNormalizedPrice(priceId1);
        (uint256 price2, ) = getNormalizedPrice(priceId2);
        
        require(price2 > 0, "Division by zero");
        ratio = (price1 * 1e18) / price2;
    }

    /**
     * @notice Get price with confidence bounds
     * @param priceId The price feed ID
     * @return price The current price
     * @return lowerBound Lower confidence bound
     * @return upperBound Upper confidence bound
     */
    function getPriceWithConfidence(
        bytes32 priceId
    ) external view returns (
        int64 price,
        int64 lowerBound,
        int64 upperBound
    ) {
        PythStructs.Price memory pythPrice = pyth.getPriceUnsafe(priceId);
        price = pythPrice.price;
        
        // Calculate confidence bounds
        int64 conf = int64(pythPrice.conf);
        lowerBound = price - conf;
        upperBound = price + conf;
    }

    /**
     * @notice Allow contract to receive ETH for price updates
     */
    receive() external payable {}

    /**
     * @notice Withdraw accumulated ETH (if any)
     */
    function withdraw() external {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
}

