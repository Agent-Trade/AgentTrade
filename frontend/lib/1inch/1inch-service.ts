/**
 * 1inch Integration Service
 * 
 * This service handles:
 * 1. Getting swap quotes from 1inch Aggregation API
 * 2. Executing token swaps via Aggregation API
 * 3. Price validation for trading strategies
 * 4. Balance and allowance checks
 * 
 * Uses 1inch Aggregation API v6 for optimal routing and best prices
 */

// Supported chains mapping
export const ONEINCH_CHAINS = {
  BASE_SEPOLIA: 84532,
  BASE: 845845,
  ETHEREUM: 1,
} as const;

export interface SwapQuote {
  fromToken: {
    address: string;
    symbol: string;
    decimals: number;
    name: string;
  };
  toToken: {
    address: string;
    symbol: string;
    decimals: number;
    name: string;
  };
  toTokenAmount: string;
  fromTokenAmount: string;
  protocols: any[];
  estimatedGas: number;
}

export interface SwapTx {
  from: string;
  to: string;
  data: string;
  value: string;
  gas: number;
  gasPrice: string;
}

export interface SwapParams {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  fromAddress: string;
  slippage: number; // Percentage (e.g., 1 for 1%)
  chainId: number;
  disableEstimate?: boolean;
}

// 1inch API endpoints (for aggregation API v6)
const ONEINCH_AGGREGATION_V6 = "/swap/v6.0";
const ONEINCH_APPROVE_V5 = "/approve/v5.2";

/**
 * Get API key from environment
 * API keys are now mandatory for 1inch API
 * Get your key from: https://portal.1inch.dev/
 */
function getApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_1INCH_API_KEY;
  if (!apiKey) {
    throw new Error(
      "1inch API key is required. Please set NEXT_PUBLIC_1INCH_API_KEY in your .env.local file. " +
      "Get your API key from https://portal.1inch.dev/"
    );
  }
  return apiKey;
}

/**
 * Make request to 1inch API via Next.js API proxy (avoids CORS issues)
 * API key is now mandatory - will throw error if not set
 */
async function fetch1inchAPI(
  endpoint: string,
  params: Record<string, string | number>
): Promise<any> {
  try {
    // Check for API key (will throw if missing)
    getApiKey();

    // Use Next.js API route as proxy to avoid CORS issues
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    // Proxy through Next.js API route
    const proxyUrl = `/api/1inch?endpoint=${encodeURIComponent(endpoint)}&${queryString}`;
    
    const response = await fetch(proxyUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      
      // Provide helpful error message for 401 Unauthorized
      if (response.status === 401) {
        throw new Error(
          "1inch API key is invalid or missing. " +
          "Please check your NEXT_PUBLIC_1INCH_API_KEY in .env.local. " +
          "Get your API key from https://portal.1inch.dev/"
        );
      }
      
      throw new Error(
        `1inch API error (${response.status}): ${errorData.error || response.statusText}`
      );
    }

    return response.json();
  } catch (error: any) {
    // If it's already our error, rethrow it
    if (error.message && (error.message.includes("1inch API") || error.message.includes("API key"))) {
      throw error;
    }
    // Otherwise, wrap it
    throw new Error(`Failed to fetch from 1inch API: ${error.message || "Unknown error"}`);
  }
}


/**
 * Get swap quote from 1inch Aggregation API v6
 * Uses the official 1inch Aggregation API for optimal routing
 * @param params Swap parameters
 * @returns Quote with expected output amount and protocols
 */
export async function getSwapQuote(
  params: SwapParams
): Promise<SwapQuote> {
  try {
    const {
      fromTokenAddress,
      toTokenAddress,
      amount,
      fromAddress,
      slippage,
      chainId,
      disableEstimate = false,
    } = params;

    // Use aggregation API v6 for quotes (more reliable and up-to-date)
    const quoteParams: Record<string, string | number> = {
      src: fromTokenAddress,
      dst: toTokenAddress,
      amount: amount,
      from: fromAddress,
      slippage: slippage,
      disableEstimate: disableEstimate ? "true" : "false",
    };

    const data = await fetch1inchAPI(
      `${ONEINCH_AGGREGATION_V6}/${chainId}/quote`,
      quoteParams
    );

    return {
      fromToken: data.fromToken,
      toToken: data.toToken,
      toTokenAmount: data.toTokenAmount,
      fromTokenAmount: data.fromTokenAmount,
      protocols: data.protocols || [],
      estimatedGas: parseInt(data.estimatedGas || "0", 16),
    };
  } catch (error) {
    console.error("Error getting swap quote from 1inch:", error);
    throw error;
  }
}

/**
 * Get swap transaction data from 1inch Aggregation API
 * @param params Swap parameters
 * @returns Transaction data ready to be sent
 */
export async function getSwapTx(
  params: SwapParams
): Promise<SwapTx> {
  try {
    const {
      fromTokenAddress,
      toTokenAddress,
      amount,
      fromAddress,
      slippage,
      chainId,
      disableEstimate = false,
    } = params;

    const swapParams: Record<string, string | number> = {
      src: fromTokenAddress,
      dst: toTokenAddress,
      amount: amount,
      from: fromAddress,
      slippage: slippage,
      disableEstimate: disableEstimate ? "true" : "false",
    };

    const data = await fetch1inchAPI(
      `${ONEINCH_AGGREGATION_V6}/${chainId}/swap`,
      swapParams
    );

    return {
      from: data.tx.from,
      to: data.tx.to,
      data: data.tx.data,
      value: data.tx.value,
      gas: parseInt(data.tx.gas || "0", 16),
      gasPrice: data.tx.gasPrice,
    };
  } catch (error) {
    console.error("Error getting swap transaction from 1inch:", error);
    throw error;
  }
}

/**
 * Get token balance for an address
 * Uses viem public client to fetch balances from RPC
 * @param tokenAddress Token contract address (use NATIVE_ETH_ADDRESS for native ETH)
 * @param walletAddress Wallet address to check
 * @param chainId Chain ID
 * @returns Token balance as string in wei/smallest unit
 */
export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  chainId: number
): Promise<string> {
  try {
    // Dynamic import to avoid SSR issues
    const { createPublicClient, http, parseAbi } = await import("viem");
    const { baseSepolia, base, mainnet } = await import("wagmi/chains");

    // Map chain ID to chain config
    const chainMap: Record<number, any> = {
      84532: baseSepolia,
      845845: base,
      1: mainnet,
    };

    const chain = chainMap[chainId];
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Create public client for the chain
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    // Native ETH address constant
    const NATIVE_ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeeEeE";

    // Handle native ETH
    if (
      tokenAddress.toLowerCase() === NATIVE_ETH_ADDRESS.toLowerCase() ||
      tokenAddress === "0x0000000000000000000000000000000000000000"
    ) {
      const balance = await publicClient.getBalance({
        address: walletAddress as `0x${string}`,
      });
      return balance.toString();
    }

    // Handle ERC20 tokens
    const ERC20_ABI = parseAbi([
      "function balanceOf(address account) external view returns (uint256)",
    ]);

    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress as `0x${string}`],
    });

    return balance.toString();
  } catch (error: any) {
    console.error("Error getting token balance:", error);
    throw new Error(
      `Failed to get token balance: ${error.message || "Unknown error"}`
    );
  }
}

/**
 * Check token allowance for 1inch router
 * @param tokenAddress Token contract address
 * @param walletAddress Wallet address
 * @param chainId Chain ID
 * @returns Allowance amount as string
 */
export async function getTokenAllowance(
  tokenAddress: string,
  walletAddress: string,
  chainId: number
): Promise<string> {
  try {
    const data = await fetch1inchAPI(
      `${ONEINCH_APPROVE_V5}/${chainId}/allowance`,
      {
        tokenAddress,
        walletAddress,
      }
    );

    return data.allowance || "0";
  } catch (error) {
    console.error("Error getting token allowance from 1inch:", error);
    throw error;
  }
}

/**
 * Get approval transaction data for 1inch router
 * @param tokenAddress Token to approve
 * @param amount Amount to approve (use "unlimited" for max)
 * @param chainId Chain ID
 * @returns Approval transaction data
 */
export async function getApprovalTx(
  tokenAddress: string,
  amount: string = "unlimited",
  chainId: number
): Promise<SwapTx> {
  try {
    const data = await fetch1inchAPI(
      `${ONEINCH_APPROVE_V5}/${chainId}/approve/transaction`,
      {
        tokenAddress,
        amount,
      }
    );

    return {
      from: data.from,
      to: data.to,
      data: data.data,
      value: data.value || "0",
      gas: parseInt(data.gas || "0", 16),
      gasPrice: data.gasPrice || "0",
    };
  } catch (error) {
    console.error("Error getting approval transaction from 1inch:", error);
    throw error;
  }
}

/**
 * Validate swap price against strategy requirements
 * @param quote 1inch swap quote
 * @param minExpectedOutput Minimum expected output amount (in wei)
 * @returns true if quote meets minimum requirements
 */
export function validateSwapQuote(
  quote: SwapQuote,
  minExpectedOutput: string
): boolean {
  const outputAmount = BigInt(quote.toTokenAmount);
  const minAmount = BigInt(minExpectedOutput);
  return outputAmount >= minAmount;
}

/**
 * Format token amount for display
 * @param amount Amount in wei/smallest unit
 * @param decimals Token decimals
 * @returns Formatted amount as number
 */
export function formatTokenAmount(amount: string, decimals: number): number {
  const amountBigInt = BigInt(amount);
  const divisor = BigInt(10) ** BigInt(decimals);
  return Number(amountBigInt) / Number(divisor);
}

/**
 * Parse token amount to wei/smallest unit
 * @param amount Amount as number (e.g., 1.5)
 * @param decimals Token decimals
 * @returns Amount in wei as string
 */
export function parseTokenAmount(amount: number, decimals: number): string {
  const multiplier = BigInt(10) ** BigInt(decimals);
  const amountBigInt = BigInt(Math.floor(amount * Number(multiplier)));
  return amountBigInt.toString();
}
