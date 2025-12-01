/**
 * Agent Signer Service
 * 
 * Provides per-agent signing capabilities using Privy's embedded wallet
 * Enables delegated execution permissions for trading agents
 */

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSignTypedData, useSignMessage } from "wagmi";
import { Address, Hash, TypedDataDomain } from "viem";

// Define TypedDataField type for EIP-712
type TypedDataField = {
  name: string;
  type: string;
};

/**
 * Agent execution message structure for EIP-712 signing
 */
export interface AgentExecutionMessage {
  agentId: string;
  action: string; // e.g., "execute_trigger", "update_strategy"
  timestamp: number;
  nonce: number;
}

/**
 * Agent signer configuration
 */
export interface AgentSignerConfig {
  agentId: Hash;
  agentName: string;
  ownerAddress: Address;
  chainId: number;
}

/**
 * Signed agent execution data
 */
export interface SignedAgentExecution {
  message: AgentExecutionMessage;
  signature: `0x${string}`;
  signer: Address;
}

/**
 * Get EIP-712 domain for agent signing
 */
export function getAgentSigningDomain(chainId: number): TypedDataDomain {
  return {
    name: "TradingAgentRegistry",
    version: "1",
    chainId: chainId,
    verifyingContract: "0x0000000000000000000000000000000000000000", // Will be set by contract
  };
}

/**
 * Get EIP-712 types for agent execution message
 */
export function getAgentExecutionTypes(): Record<string, TypedDataField[]> {
  return {
    AgentExecution: [
      { name: "agentId", type: "bytes32" },
      { name: "action", type: "string" },
      { name: "timestamp", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };
}

/**
 * Hook for agent-specific signing
 * Provides signing capabilities for agent operations
 */
export function useAgentSigner() {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { signTypedDataAsync } = useSignTypedData();
  const { signMessageAsync } = useSignMessage();
  
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");

  /**
   * Sign an agent execution message
   */
  const signAgentExecution = async (
    config: AgentSignerConfig,
    message: AgentExecutionMessage
  ): Promise<SignedAgentExecution | null> => {
    if (!authenticated || !ready) {
      throw new Error("User not authenticated");
    }

    if (!embeddedWallet) {
      throw new Error("No embedded wallet found");
    }

    try {
      const domain = getAgentSigningDomain(config.chainId);
      const types = getAgentExecutionTypes();
      
      // Sign using wagmi's signTypedData
      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "AgentExecution",
        message: {
          agentId: config.agentId,
          action: message.action,
          timestamp: BigInt(message.timestamp),
          nonce: BigInt(message.nonce),
        },
      });

      return {
        message,
        signature,
        signer: embeddedWallet.address as Address,
      };
    } catch (error) {
      console.error("Error signing agent execution:", error);
      throw error;
    }
  };

  /**
   * Sign a simple message for agent verification
   */
  const signAgentMessage = async (
    message: string,
    agentId: Hash
  ): Promise<{ signature: `0x${string}`; signer: Address } | null> => {
    if (!authenticated || !ready) {
      throw new Error("User not authenticated");
    }

    if (!embeddedWallet) {
      throw new Error("No embedded wallet found");
    }

    try {
      // Create message with agent context
      const fullMessage = `Agent ${agentId}: ${message}`;

      // Sign message using wagmi's signMessage
      const signature = await signMessageAsync({
        message: fullMessage,
      });

      return {
        signature,
        signer: embeddedWallet.address as Address,
      };
    } catch (error) {
      console.error("Error signing agent message:", error);
      throw error;
    }
  };

  /**
   * Verify if the current user can sign for an agent
   */
  const canSignForAgent = (agentOwner: Address): boolean => {
    if (!embeddedWallet) return false;
    return embeddedWallet.address.toLowerCase() === agentOwner.toLowerCase();
  };

  return {
    signAgentExecution,
    signAgentMessage,
    canSignForAgent,
    isReady: ready && authenticated,
    walletAddress: embeddedWallet?.address as Address | undefined,
  };
}

