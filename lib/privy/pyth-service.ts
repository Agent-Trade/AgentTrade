/**
 * Pyth Network Integration Service
 * 
 * This service handles:
 * 1. Fetching price updates from Hermes API using Pyth SDK
 * 2. Preparing update data for on-chain updates
 * 3. Interacting with Pyth contracts
 */

import { HermesClient } from "@pythnetwork/hermes-client";

// Pyth contract addresses for Base Sepolia
export const PYTH_CONTRACTS = {
  BASE_SEPOLIA: {
    pyth: "0x2880aB155794e7179c9eE2e3820029e5eE02F5E0", // Pyth contract on Base Sepolia
    wormhole: "0x6aB5Ae6822647046626e83ee6dB8187151E1d5ab", // Wormhole contract
  },
  BASE: {
    pyth: "0x2880aB155794e7179c9eE2e3820029e5eE02F5E0",
    wormhole: "0x6aB5Ae6822647046626e83ee6dB8187151E1d5ab",
  },
  ETHEREUM: {
    pyth: "0x4305FB66699C3B2702D4d05CF36551390A4c69C6",
    wormhole: "0x6aB5Ae6822647046626e83ee6dB8187151E1d5ab",
  },
} as const;

// Price feed IDs for Base Sepolia
export const PRICE_FEED_IDS = {
  ETH_USD: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  BTC_USD: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  USDC_USD: "0x41f3625971ca2edc3a18f1b214f25bc9610068203bf1c1bf33f7a1316c9c66d",
} as const;

// Initialize Hermes client
const hermesClient = new HermesClient("https://hermes.pyth.network", {});

// Hermes API endpoint for binary updates (still needed for on-chain updates)
const HERMES_BINARY_API = "https://hermes.pyth.network/v2/updates/price/";

export interface PriceUpdate {
  priceId: string;
  price: string;
  conf: string;
  expo: number;
  publishTime: number;
}

/**
 * Fetch latest price information from Hermes API using Pyth SDK (for display purposes)
 * @param priceIds Array of price feed IDs to fetch
 * @returns Price data
 */
export async function fetchPriceUpdatesFromHermes(
  priceIds: string[]
): Promise<PriceUpdate[]> {
  try {
    // Use Pyth SDK to get latest price updates
    const response = await hermesClient.getLatestPriceUpdates(priceIds);
    console.log("Fetched price updates from Hermes:", response);
    
    // Convert SDK response to our PriceUpdate format
    const prices: PriceUpdate[] = [];
    
    // The SDK returns an object with parsed array
    if (response.parsed && Array.isArray(response.parsed)) {
      for (const item of response.parsed) {
        if (item.id && item.price) {
          const priceData = item.price;
          prices.push({
            priceId: item.id,
            price: (priceData.price as any)?.toString() || "0",
            conf: (priceData.conf as any)?.toString() || "0",
            expo: (priceData.exponent as number) ?? -8,
            publishTime: (priceData.publishTime as number) || 0,
          });
        }
      }
    }
    
    return prices;
  } catch (error) {
    console.error("Error fetching price updates from Hermes:", error);
    throw error;
  }
}

/**
 * Fetch binary price update data from Hermes for on-chain updates
 * This returns the binary format needed for updatePriceFeeds
 * @param priceIds Array of price feed IDs
 * @param chainId Chain ID (Base Sepolia = 84532)
 * @returns Array of binary update data
 */
export async function fetchBinaryPriceUpdates(
  priceIds: string[],
  chainId: number = 84532
): Promise<`0x${string}`[]> {
  try {
    // Try to get binary data from SDK response first
    const response = await hermesClient.getLatestPriceUpdates(priceIds);
    
    // Check if SDK response includes binary data
    if (response.binary && response.binary.data && Array.isArray(response.binary.data)) {
      // SDK provides binary data - convert to hex format
      const binaryData = response.binary.data;
      const hexDataArray = binaryData.map((data: string) => {
        // If data is base64, decode it; if hex, use directly
        if (response.binary.encoding === "base64") {
          // Convert base64 to hex
          const buffer = Buffer.from(data, "base64");
          return `0x${buffer.toString("hex")}` as `0x${string}`;
        } else {
          // Already hex, just add 0x prefix if needed
          return data.startsWith("0x") ? (data as `0x${string}`) : (`0x${data}` as `0x${string}`);
        }
      });
      return hexDataArray;
    }
    
    // Fallback to raw API if SDK doesn't provide binary
    const cleanIds = priceIds.map((id) => 
      id.startsWith("0x") ? id.slice(2) : id
    );
    const idsParam = cleanIds.join(",");
    const url = `${HERMES_BINARY_API}${chainId}?ids=${idsParam}`;
    console.log("Fetching binary from Hermes (fallback):", url);
    const apiResponse = await fetch(url);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text().catch(() => apiResponse.statusText);
      throw new Error(
        `Hermes binary API error (${apiResponse.status}): ${errorText || apiResponse.statusText}`
      );
    }

    // The response is binary data that can be used directly with updatePriceFeeds
    const arrayBuffer = await apiResponse.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to hex string format expected by viem
    const hexString = Array.from(uint8Array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const hexData = `0x${hexString}` as `0x${string}`;
    
    console.log("Fetched binary price updates from Hermes");
    
    // Return as array (Hermes may return multiple updates in one response)
    return [hexData];
  } catch (error) {
    console.error("Error fetching binary price updates from Hermes:", error);
    throw error;
  }
}

/**
 * Get latest price for a specific feed ID
 * @param priceId The price feed ID
 * @returns Price information
 */
export async function getLatestPriceFromHermes(
  priceId: string
): Promise<PriceUpdate | null> {
  try {
    const prices = await fetchPriceUpdatesFromHermes([priceId]);
    return prices[0] || null;
  } catch (error) {
    console.error("Error fetching price from Hermes:", error);
    return null;
  }
}

/**
 * Format price from Pyth's format (with exponent) to human-readable format
 * @param price Raw price value
 * @param expo Exponent
 * @returns Formatted price as number
 */
export function formatPrice(price: bigint | string, expo: number): number {
  const priceNum = typeof price === "string" ? BigInt(price) : price;
  const divisor = BigInt(10) ** BigInt(-expo);
  return Number(priceNum) / Number(divisor);
}

