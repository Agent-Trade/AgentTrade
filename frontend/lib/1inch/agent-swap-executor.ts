/**
 * Agent Swap Executor
 * 
 * Handles swap execution for trading agents when price triggers are met
 * Integrates Pyth price feeds, 1inch swaps, and agent strategies
 */

import { Address } from "viem";
import {
  getSwapQuote,
  getSwapTx,
  getTokenBalance,
  getTokenAllowance,
  getApprovalTx,
  validateSwapQuote,
  formatTokenAmount,
  parseTokenAmount,
  SwapQuote,
} from "./1inch-service";
import { get1inchRouterAddress, getTokenAddress } from "./1inch-contract";

export interface AgentSwapConfig {
  agentId: string;
  fromToken: string; // Token symbol or address
  toToken: string; // Token symbol or address
  amount: number; // Amount in human-readable format (e.g., 1.5)
  slippage: number; // Slippage tolerance in percentage (e.g., 1 for 1%)
  chainId: number;
  walletAddress: Address;
  minExpectedOutput?: string; // Minimum output amount in wei (optional)
}

export interface SwapExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  quote?: SwapQuote;
  outputAmount?: string;
}

/**
 * Execute a swap for an agent when trigger conditions are met
 */
export async function executeAgentSwap(
  config: AgentSwapConfig,
  writeContract: any
): Promise<SwapExecutionResult> {
  try {
    const {
      fromToken,
      toToken,
      amount,
      slippage,
      chainId,
      walletAddress,
      minExpectedOutput,
    } = config;

    // Resolve token addresses
    // Handle native ETH tokens
    const isNativeETH = (token: string) => {
      const upper = token.toUpperCase();
      return upper === "ETH" || upper === "NATIVE";
    };

    // Native ETH uses special address in 1inch API
    const NATIVE_ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeeEeE";

    let fromTokenAddress: string | null = null;
    if (fromToken.startsWith("0x") && fromToken.length === 42) {
      fromTokenAddress = fromToken;
    } else if (isNativeETH(fromToken)) {
      fromTokenAddress = NATIVE_ETH_ADDRESS;
    } else {
      fromTokenAddress = getTokenAddress(fromToken, chainId);
    }

    let toTokenAddress: string | null = null;
    if (toToken.startsWith("0x") && toToken.length === 42) {
      toTokenAddress = toToken;
    } else if (isNativeETH(toToken)) {
      toTokenAddress = NATIVE_ETH_ADDRESS;
    } else {
      toTokenAddress = getTokenAddress(toToken, chainId);
    }

    console.log("Token resolution:", {
      fromToken,
      fromTokenAddress,
      toToken,
      toTokenAddress,
      chainId,
    });

    if (!fromTokenAddress) {
      return {
        success: false,
        error: `Invalid from token: "${fromToken}". Supported tokens: ETH, WETH, USDC, DAI, or a valid 0x address. Chain ID: ${chainId}`,
      };
    }

    if (!toTokenAddress) {
      return {
        success: false,
        error: `Invalid to token: "${toToken}". Supported tokens: ETH, WETH, USDC, DAI, or a valid 0x address. Chain ID: ${chainId}`,
      };
    }

    // Check balance
    const balance = await getTokenBalance(
      fromTokenAddress,
      walletAddress,
      chainId
    );

    const amountWei = parseTokenAmount(amount, 18); // Assuming 18 decimals for now
    if (BigInt(balance) < BigInt(amountWei)) {
      return {
        success: false,
        error: `Insufficient balance. Have: ${formatTokenAmount(balance, 18)}, Need: ${amount}`,
      };
    }

    // Get swap quote
    const quote = await getSwapQuote({
      fromTokenAddress,
      toTokenAddress,
      amount: amountWei,
      fromAddress: walletAddress,
      slippage,
      chainId,
    });

    // Validate quote if minimum expected output is specified
    if (minExpectedOutput && !validateSwapQuote(quote, minExpectedOutput)) {
      return {
        success: false,
        error: "Quote does not meet minimum output requirements",
        quote,
      };
    }

    // Check allowance for non-native tokens
    if (fromTokenAddress !== NATIVE_ETH_ADDRESS) {
      const routerAddress = get1inchRouterAddress(chainId);
      if (!routerAddress) {
        return {
          success: false,
          error: "1inch router not found for this chain",
        };
      }

      const allowance = await getTokenAllowance(
        fromTokenAddress,
        walletAddress,
        chainId
      );

      if (BigInt(allowance) < BigInt(amountWei)) {
        // Need approval
        await getApprovalTx(
          fromTokenAddress,
          "unlimited",
          chainId
        );

        // Execute approval (this would need to be handled by the caller)
        return {
          success: false,
          error: "Token approval required",
          quote,
        };
      }
    }

    // Get swap transaction
    const swapTx = await getSwapTx({
      fromTokenAddress,
      toTokenAddress,
      amount: amountWei,
      fromAddress: walletAddress,
      slippage,
      chainId,
    });

    // Execute swap
    try {
      const txHash = await writeContract({
        to: swapTx.to as Address,
        data: swapTx.data as `0x${string}`,
        value: BigInt(swapTx.value),
        gas: BigInt(swapTx.gas),
      });

      return {
        success: true,
        txHash,
        quote,
        outputAmount: quote.toTokenAmount,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Swap execution failed",
        quote,
      };
    }
  } catch (error: any) {
    console.error("Error executing agent swap:", error);
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Check if swap is profitable based on price difference
 */
export function isSwapProfitable(
  quote: SwapQuote,
  expectedPrice: number, // Expected price ratio
  tolerance: number = 0.01 // 1% tolerance
): boolean {
  const fromAmount = formatTokenAmount(
    quote.fromTokenAmount,
    quote.fromToken.decimals
  );
  const toAmount = formatTokenAmount(
    quote.toTokenAmount,
    quote.toToken.decimals
  );

  const actualPrice = toAmount / fromAmount;
  const minPrice = expectedPrice * (1 - tolerance);

  return actualPrice >= minPrice;
}

/**
 * Format swap result for display
 */
export function formatSwapResult(result: SwapExecutionResult): string {
  if (result.success) {
    return `Swap successful! TX: ${result.txHash?.slice(0, 10)}...`;
  } else {
    return `Swap failed: ${result.error}`;
  }
}

