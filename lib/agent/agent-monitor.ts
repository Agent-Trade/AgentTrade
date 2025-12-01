/**
 * Agent Monitoring Service
 * 
 * Monitors active trading agents and executes trades when price triggers are met
 * This service should be called periodically (e.g., via cron job or scheduled task)
 */

import { Address, Hash } from "viem";
import { createPublicClient, http } from "viem";
import { baseSepolia, base } from "viem/chains";
import {
  getAgentRegistryAddress,
  TRADING_AGENT_REGISTRY_ABI,
  type Agent,
} from "./agent-registry";
import { fetchBinaryPriceUpdates } from "@/lib/privy/pyth-service";

export interface MonitoringResult {
  agentId: Hash;
  agentName: string;
  triggerMet: boolean;
  currentPrice: bigint;
  executed: boolean;
  txHash?: string;
  error?: string;
}

export interface MonitoringStats {
  totalAgents: number;
  activeAgents: number;
  triggersMet: number;
  executed: number;
  errors: number;
  results: MonitoringResult[];
}

/**
 * Check if trigger is met for an agent
 */
async function checkAgentTrigger(
  agentId: Hash,
  chainId: number,
  publicClient: any
): Promise<{ met: boolean; currentPrice: bigint }> {
  const registryAddress = getAgentRegistryAddress(chainId);

  try {
    const result = await publicClient.readContract({
      address: registryAddress,
      abi: TRADING_AGENT_REGISTRY_ABI,
      functionName: "checkTrigger",
      args: [agentId],
    });

    return {
      met: result[0] as boolean,
      currentPrice: result[1] as bigint,
    };
  } catch (error) {
    console.error(`Error checking trigger for agent ${agentId}:`, error);
    return { met: false, currentPrice: BigInt(0) };
  }
}

/**
 * Get agent details
 */
async function getAgentDetails(
  agentId: Hash,
  chainId: number,
  publicClient: any
): Promise<Agent | null> {
  const registryAddress = getAgentRegistryAddress(chainId);

  try {
    const agent = await publicClient.readContract({
      address: registryAddress,
      abi: TRADING_AGENT_REGISTRY_ABI,
      functionName: "getAgent",
      args: [agentId],
    });

    return agent as Agent;
  } catch (error) {
    console.error(`Error fetching agent ${agentId}:`, error);
    return null;
  }
}

/**
 * Execute trigger on-chain and perform swap
 */
async function executeTrigger(
  _agentId: Hash,
  agent: Agent,
  chainId: number,
  _publicClient: any,
  _walletClient?: any
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Fetch price update data for Pyth
    const priceFeedId = agent.strategy.priceFeedId;
    const updateData = await fetchBinaryPriceUpdates([priceFeedId], chainId);

    if (!updateData || updateData.length === 0) {
      return {
        success: false,
        error: "Failed to fetch price update data",
      };
    }

    // For now, we'll return that execution needs to be done manually
    // In a production system, you'd use a wallet with funds to execute
    return {
      success: false,
      error: "Automatic execution requires a funded wallet. Use checkAndExecuteTrigger manually.",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Execution failed",
    };
  }
}

/**
 * Monitor a single agent
 */
export async function monitorAgent(
  agentId: Hash,
  chainId: number,
  rpcUrl?: string
): Promise<MonitoringResult> {
  const chain = chainId === 84532 ? baseSepolia : chainId === 8453 ? base : baseSepolia;
  
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  // Get agent details
  const agent = await getAgentDetails(agentId, chainId, publicClient);
  if (!agent || !agent.exists || !agent.strategy.isActive) {
    return {
      agentId,
      agentName: agent?.ensName || "Unknown",
      triggerMet: false,
      currentPrice: BigInt(0),
      executed: false,
      error: "Agent not found or inactive",
    };
  }

  // Check trigger
  const { met, currentPrice } = await checkAgentTrigger(agentId, chainId, publicClient);

  if (!met) {
    return {
      agentId,  
      agentName: agent.ensName,
      triggerMet: false,
      currentPrice,
      executed: false,
    };
  }

  // Trigger is met - attempt execution
  const executionResult = await executeTrigger(agentId, agent, chainId, publicClient);

  return {
    agentId,
    agentName: agent.ensName,
    triggerMet: true,
    currentPrice,
    executed: executionResult.success,
    txHash: executionResult.txHash,
    error: executionResult.error,
  };
}

/**
 * Monitor multiple agents
 */
export async function monitorAgents(
  agentIds: Hash[],
  chainId: number,
  rpcUrl?: string
): Promise<MonitoringStats> {
  const results: MonitoringResult[] = [];
  let triggersMet = 0;
  let executed = 0;
  let errors = 0;

  for (const agentId of agentIds) {
    try {
      const result = await monitorAgent(agentId, chainId, rpcUrl);
      results.push(result);

      if (result.triggerMet) triggersMet++;
      if (result.executed) executed++;
      if (result.error) errors++;
    } catch (error: any) {
      errors++;
      results.push({
        agentId,
        agentName: "Unknown",
        triggerMet: false,
        currentPrice: BigInt(0),
        executed: false,
        error: error.message || "Monitoring failed",
      });
    }
  }

  return {
    totalAgents: agentIds.length,
    activeAgents: results.filter((r) => !r.error).length,
    triggersMet,
    executed,
    errors,
    results,
  };
}

/**
 * Get agent IDs for a user
 */
export async function getUserAgentIds(
  userAddress: Address,
  chainId: number,
  rpcUrl?: string
): Promise<Hash[]> {
  const chain = chainId === 84532 ? baseSepolia : chainId === 8453 ? base : baseSepolia;
  
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const registryAddress = getAgentRegistryAddress(chainId);

  try {
    const agentIds = await publicClient.readContract({
      address: registryAddress,
      abi: TRADING_AGENT_REGISTRY_ABI,
      functionName: "getUserAgents",
      args: [userAddress],
    });

    return agentIds as Hash[];
  } catch (error) {
    console.error(`Error fetching user agents for ${userAddress}:`, error);
    return [];
  }
}

