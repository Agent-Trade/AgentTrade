/**
 * 1inch Contract Integration Utilities
 * 
 * Helper functions for interacting with 1inch contracts on-chain
 */

import { Address, parseAbi } from "viem";

// Common token addresses
export const TOKEN_ADDRESSES = {
  // Base Sepolia
  BASE_SEPOLIA: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  },
  // Base Mainnet
  BASE: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  },
} as const;

// 1inch Router addresses (v6)
export const ONEINCH_ROUTER = {
  BASE_SEPOLIA: "0x111111125421ca6dc452d289314280a0f8842a65", // Placeholder - check 1inch docs
  BASE: "0x111111125421ca6dc452d289314280a0f8842a65", // Placeholder - check 1inch docs
} as const;

/**
 * Get 1inch router address for a chain
 */
export function get1inchRouterAddress(chainId: number): Address | null {
  switch (chainId) {
    case 84532: // Base Sepolia
      return ONEINCH_ROUTER.BASE_SEPOLIA as Address;
    case 845845: // Base
      return ONEINCH_ROUTER.BASE as Address;
    default:
      return null;
  }
}

/**
 * Get token address by symbol
 */
export function getTokenAddress(
  symbol: string,
  chainId: number
): Address | null {
  const chainTokens =
    chainId === 84532
      ? TOKEN_ADDRESSES.BASE_SEPOLIA
      : chainId === 845845
      ? TOKEN_ADDRESSES.BASE
      : null;

  if (!chainTokens) return null;

  const upperSymbol = symbol.toUpperCase();
  return (chainTokens[upperSymbol as keyof typeof chainTokens] as Address) || null;
}

/**
 * Encode swap transaction using 1inch router
 * Note: This is a helper - actual swap should use 1inch API for best routing
 */
export function encodeSwapTx(
  _routerAddress: Address,
  swapData: string
): `0x${string}` {
  // 1inch router uses a generic swap function
  // The swapData comes from 1inch API
  return swapData as `0x${string}`;
}

/**
 * ERC20 ABI for token operations
 */
export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
]);

