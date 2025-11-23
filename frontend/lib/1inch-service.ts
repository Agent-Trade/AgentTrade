/**
 * 1inch API Integration Service
 * 
 * This service handles:
 * 1. Getting swap quotes from 1inch Aggregation API
 * 2. Executing token swaps
 * 3. Price validation for trading strategies
 * 4. Balance and allowance checks
 */

// 1inch API endpoints
const ONEINCH_API_BASE = "https://api.1inch.dev";
const ONEINCH_AGGREGATION_V6 = "/swap/v6.0";
const ONEINCH_APPROVE_V5 = "/approve/v5.2";

// Supported chains
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

/**
 * Get API key from environment or use public endpoint
 */
function getApiKey(): string | null {
  return process.env.NEXT_PUBLIC_1INCH_API_KEY || null;
}

/**
 * Make request to 1inch API
 */
async function fetch1inch(
  endpoint: string,
  params: Record<string, string | number>
): Promise<any> {
  const apiKey = getApiKey();
  const queryString = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const url = `${ONEINCH_API_BASE}${endpoint}?${queryString}`;
  
  const headers: HeadersInit = {
    "Accept": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(
      `1inch API error (${response.status}): ${errorText || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get swap quote from 1inch Aggregation API
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

    const quoteParams: Record<string, string | number> = {
      src: fromTokenAddress,
      dst: toTokenAddress,
      amount: amount,
      from: fromAddress,
      slippage: slippage,
      disableEstimate: disableEstimate ? "true" : "false",
    };

    const data = await fetch1inch(
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
 * Get swap transaction data from 1inch
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

    const data = await fetch1inch(
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
 * Note: 1inch doesn't have a direct balance API, use RPC or Web3 API
 * This is a placeholder - implement with your RPC provider
 * @param _tokenAddress Token contract address (use native token address for ETH)
 * @param _walletAddress Wallet address to check
 * @param _chainId Chain ID
 * @returns Token balance as string
 */
export async function getTokenBalance(
  _tokenAddress: string,
  _walletAddress: string,
  _chainId: number
): Promise<string> {
  // This should be implemented using your RPC provider (wagmi, viem, etc.)
  // For now, return placeholder
  console.warn("getTokenBalance: Implement with RPC provider");
  return "0";
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
    const data = await fetch1inch(
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
    const data = await fetch1inch(
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

