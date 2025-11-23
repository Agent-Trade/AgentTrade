/**
 * Agent Executor Service
 * 
 * Handles on-chain execution of agent triggers
 * This requires a funded wallet to pay for gas and Pyth update fees
 */

import { Hash } from "viem";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";
import {
  getAgentRegistryAddress,
  TRADING_AGENT_REGISTRY_ABI,
} from "./agent-registry";
import { fetchBinaryPriceUpdates } from "@/lib/privy/pyth-service";

export interface ExecutionConfig {
  agentId: Hash;
  chainId: number;
  privateKey: string; // Private key of wallet that will execute (must have funds)
  rpcUrl?: string;
}

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Execute agent trigger on-chain
 * 
 * This function:
 * 1. Fetches Pyth price update data
 * 2. Calls checkAndExecuteTrigger on the registry contract
 * 3. Returns the transaction hash
 */
export async function executeAgentTrigger(
  config: ExecutionConfig
): Promise<ExecutionResult> {
  try {
    const { agentId, chainId, privateKey, rpcUrl } = config;

    // Create wallet client
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const chain = chainId === 84532 ? baseSepolia : chainId === 8453 ? base : baseSepolia;

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    // Get agent to find price feed ID
    const registryAddress = getAgentRegistryAddress(chainId);
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const agent = await publicClient.readContract({
      address: registryAddress,
      abi: TRADING_AGENT_REGISTRY_ABI,
      functionName: "getAgent",
      args: [agentId],
    });

    if (!agent.exists || !agent.strategy.isActive) {
      return {
        success: false,
        error: "Agent not found or inactive",
      };
    }

    // Fetch price update data
    const priceFeedId = agent.strategy.priceFeedId;
    const updateData = await fetchBinaryPriceUpdates([priceFeedId], chainId);

    if (!updateData || updateData.length === 0) {
      return {
        success: false,
        error: "Failed to fetch price update data",
      };
    }

    // Estimate gas for the transaction
    // Pyth update fees are typically small, but we need to account for them
    const gasEstimate = await publicClient.estimateGas({
      account: account.address,
      to: registryAddress,
      data: "0x" as `0x${string}`, // Placeholder
    });

    // Execute checkAndExecuteTrigger
    // Note: This requires ETH for Pyth update fees
    const hash = await walletClient.writeContract({
      address: registryAddress,
      abi: TRADING_AGENT_REGISTRY_ABI,
      functionName: "checkAndExecuteTrigger",
      args: [agentId, updateData],
      value: BigInt(100000), // Small amount for Pyth update fee (adjust as needed)
    });

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      return {
        success: true,
        txHash: hash,
      };
    } else {
      return {
        success: false,
        error: "Transaction reverted",
      };
    }
  } catch (error: any) {
    console.error("Error executing agent trigger:", error);
    return {
      success: false,
      error: error.message || "Execution failed",
    };
  }
}

