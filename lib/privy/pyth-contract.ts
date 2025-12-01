/**
 * Pyth Contract Interaction Utilities
 * 
 * Functions to interact with Pyth contracts on-chain
 */

import { Address, encodeFunctionData, parseAbi } from "viem";
import { PRICE_FEED_IDS, PYTH_CONTRACTS } from "@/lib/privy/pyth-service";

// Pyth contract ABI (minimal for updatePriceFeeds)
const PYTH_ABI = parseAbi([
  "function updatePriceFeeds(bytes[] calldata updateData) external payable",
  "function getPrice(bytes32 id) external view returns ((int64 price, uint64 conf, int32 expo, uint256 publishTime))",
  "function getPriceNoOlderThan(bytes32 id, uint256 age) external view returns ((int64 price, uint64 conf, int32 expo, uint256 publishTime))",
]);

export interface PythPrice {
  price: bigint;
  conf: bigint;
  expo: number;
  publishTime: bigint;
}

/**
 * Encode updatePriceFeeds transaction
 * @param updateData Array of price update data (binary format from Hermes)
 * @param _pythContractAddress Pyth contract address (unused, kept for API consistency)
 * @returns Encoded transaction data
 */
export function encodeUpdatePriceFeeds(
  updateData: `0x${string}`[],
  _pythContractAddress: Address
) {
  return encodeFunctionData({
    abi: PYTH_ABI,
    functionName: "updatePriceFeeds",
    args: [updateData],
  });
}

/**
 * Get Pyth contract address for a given chain
 * @param chainId Chain ID
 * @returns Pyth contract address
 */
export function getPythContractAddress(chainId: number): Address {
  if (chainId === 84532) {
    // Base Sepolia
    return PYTH_CONTRACTS.BASE_SEPOLIA.pyth as Address;
  } else if (chainId === 8453) {
    // Base Mainnet
    return PYTH_CONTRACTS.BASE.pyth as Address;
  } else if (chainId === 1) {
    // Ethereum
    return PYTH_CONTRACTS.ETHEREUM.pyth as Address;
  }
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

/**
 * Get price feed ID by symbol
 * @param symbol Asset symbol (e.g., "ETH", "BTC")
 * @returns Price feed ID
 */
export function getPriceFeedId(symbol: string): `0x${string}` {
  const upperSymbol = symbol.toUpperCase();
  switch (upperSymbol) {
    case "ETH":
      return PRICE_FEED_IDS.ETH_USD as `0x${string}`;
    case "BTC":
      return PRICE_FEED_IDS.BTC_USD as `0x${string}`;
    case "USDC":
      return PRICE_FEED_IDS.USDC_USD as `0x${string}`;
    default:
      throw new Error(`Unknown price feed symbol: ${symbol}`);
  }
}

