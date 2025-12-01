/**
 * Agent Registry Service
 * 
 * Handles interactions with the TradingAgentRegistry contract
 */

import { Address, Hash, keccak256, toBytes } from "viem";
import { getPriceFeedId } from "@/lib/privy/pyth-contract";
import { getTokenAddress } from "@/lib/1inch/1inch-contract";

// TradingAgentRegistry ABI
// Using JSON format to handle complex nested tuples properly
export const TRADING_AGENT_REGISTRY_ABI = [
  {
    type: "function",
    name: "createAgent",
    inputs: [
      { name: "agentId", type: "bytes32", internalType: "bytes32" },
      { name: "ensLabel", type: "string", internalType: "string" },
      {
        name: "strategy",
        type: "tuple",
        internalType: "struct TradingStrategy",
        components: [
          { name: "priceFeedId", type: "bytes32", internalType: "bytes32" },
          { name: "triggerPrice", type: "uint256", internalType: "uint256" },
          { name: "triggerAbove", type: "bool", internalType: "bool" },
          { name: "tokenIn", type: "address", internalType: "address" },
          { name: "tokenOut", type: "address", internalType: "address" },
          { name: "amountIn", type: "uint256", internalType: "uint256" },
          { name: "isActive", type: "bool", internalType: "bool" },
          { name: "lastExecuted", type: "uint256", internalType: "uint256" },
          { name: "cooldownPeriod", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateStrategy",
    inputs: [
      { name: "agentId", type: "bytes32", internalType: "bytes32" },
      {
        name: "newStrategy",
        type: "tuple",
        internalType: "struct TradingStrategy",
        components: [
          { name: "priceFeedId", type: "bytes32", internalType: "bytes32" },
          { name: "triggerPrice", type: "uint256", internalType: "uint256" },
          { name: "triggerAbove", type: "bool", internalType: "bool" },
          { name: "tokenIn", type: "address", internalType: "address" },
          { name: "tokenOut", type: "address", internalType: "address" },
          { name: "amountIn", type: "uint256", internalType: "uint256" },
          { name: "isActive", type: "bool", internalType: "bool" },
          { name: "lastExecuted", type: "uint256", internalType: "uint256" },
          { name: "cooldownPeriod", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "checkAndExecuteTrigger",
    inputs: [
      { name: "agentId", type: "bytes32", internalType: "bytes32" },
      { name: "updateData", type: "bytes[]", internalType: "bytes[]" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "deactivateAgent",
    inputs: [{ name: "agentId", type: "bytes32", internalType: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAgent",
    inputs: [{ name: "agentId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct Agent",
        components: [
          { name: "owner", type: "address", internalType: "address" },
          { name: "ensNode", type: "bytes32", internalType: "bytes32" },
          { name: "ensName", type: "string", internalType: "string" },
          {
            name: "strategy",
            type: "tuple",
            internalType: "struct TradingStrategy",
            components: [
              { name: "priceFeedId", type: "bytes32", internalType: "bytes32" },
              { name: "triggerPrice", type: "uint256", internalType: "uint256" },
              { name: "triggerAbove", type: "bool", internalType: "bool" },
              { name: "tokenIn", type: "address", internalType: "address" },
              { name: "tokenOut", type: "address", internalType: "address" },
              { name: "amountIn", type: "uint256", internalType: "uint256" },
              { name: "isActive", type: "bool", internalType: "bool" },
              { name: "lastExecuted", type: "uint256", internalType: "uint256" },
              { name: "cooldownPeriod", type: "uint256", internalType: "uint256" },
            ],
          },
          { name: "createdAt", type: "uint256", internalType: "uint256" },
          { name: "exists", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserAgents",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bytes32[]", internalType: "bytes32[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "checkTrigger",
    inputs: [{ name: "agentId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      { name: "met", type: "bool", internalType: "bool" },
      { name: "currentPrice", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "agentCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

// Contract addresses (update with deployed addresses)
export const AGENT_REGISTRY_ADDRESSES: Record<number, Address> = {
  84532: "0x06c0cc944dbECe2cBe4d2Ac8e326a16AfFbFD345" as Address, // Base Sepolia - UPDATE THIS
  8453: "0x0000000000000000000000000000000000000000" as Address, // Base Mainnet - UPDATE THIS
};

export interface TradingStrategy {
  priceFeedId: Hash;
  triggerPrice: bigint;
  triggerAbove: boolean;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  isActive: boolean;
  lastExecuted: bigint;
  cooldownPeriod: bigint;
}

export interface Agent {
  owner: Address;
  ensNode: Hash;
  ensName: string;
  strategy: TradingStrategy;
  createdAt: bigint;
  exists: boolean;
}

export interface CreateAgentParams {
  agentName: string; // e.g., "my-agent"
  ensLabel: string; // e.g., "my-agent"
  priceFeedSymbol: string; // e.g., "ETH", "BTC"
  triggerPrice: number; // Price threshold (e.g., 3000 for $3000)
  triggerAbove: boolean; // true = execute when price > triggerPrice
  tokenIn: string; // Token symbol to sell (e.g., "WETH")
  tokenOut: string; // Token symbol to buy (e.g., "USDC")
  amountIn: number; // Amount to trade (0 = use balance)
  cooldownPeriod: number; // Cooldown in seconds
}

/**
 * Get agent registry contract address for a chain
 */
export function getAgentRegistryAddress(chainId: number): Address {
  const address = AGENT_REGISTRY_ADDRESSES[chainId];
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Agent registry not deployed on chain ${chainId}. Please update AGENT_REGISTRY_ADDRESSES.`);
  }
  return address;
}

/**
 * Generate agent ID from name
 */
export function generateAgentId(agentName: string): Hash {
  return keccak256(toBytes(agentName));
}

/**
 * Prepare strategy for contract call
 */
export async function prepareStrategy(
  params: CreateAgentParams,
  chainId: number
): Promise<TradingStrategy> {
  const priceFeedId = getPriceFeedId(params.priceFeedSymbol);
  const tokenInAddress = getTokenAddress(params.tokenIn, chainId);
  const tokenOutAddress = getTokenAddress(params.tokenOut, chainId);

  if (!tokenInAddress || !tokenOutAddress) {
    throw new Error(`Token address not found for chain ${chainId}`);
  }

  // Convert trigger price to wei (scaled by 1e8 for Pyth)
  const triggerPrice = BigInt(Math.floor(params.triggerPrice * 1e8));
  
  // Convert amount to wei (18 decimals)
  const amountIn = BigInt(Math.floor(params.amountIn * 1e18));

  return {
    priceFeedId,
    triggerPrice,
    triggerAbove: params.triggerAbove,
    tokenIn: tokenInAddress as Address,
    tokenOut: tokenOutAddress as Address,
    amountIn,
    isActive: true,
    lastExecuted: BigInt(0),
    cooldownPeriod: BigInt(params.cooldownPeriod),
  };
}

