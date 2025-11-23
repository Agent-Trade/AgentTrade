/**
 * Agent ENS Manager
 * 
 * Handles ENS subname creation and management for trading agents
 * Integrates with TradingAgentRegistry contract
 */

import { Address, Hash } from "viem";
import {
  formatAgentSubname,
  getNamehash,
  getLabelhash,
  isValidEnsName,
} from "./ens-service";
import {
  getEnsRegistryAddress,
  getPublicResolverAddress,
  encodeSetSubnodeRecord,
  encodeSetName,
  ENS_REGISTRY_ABI,
  ENS_REVERSE_REGISTRAR_ABI,
} from "./ens-contract";

export interface CreateAgentSubnameParams {
  agentLabel: string; // e.g., "my-agent"
  parentDomain: string; // e.g., "yourdomain.eth" or "alatfi.eth"
  ownerAddress: Address;
  chainId: number;
  setAsPrimary?: boolean; // Whether to set as primary name
}

export interface CreateSubnameResult {
  success: boolean;
  ensName?: string;
  ensNode?: Hash;
  txHash?: string;
  error?: string;
}

/**
 * Create ENS subname for an agent
 * This should be called before or as part of creating an agent
 */
export async function createAgentSubname(
  params: CreateAgentSubnameParams,
  writeContract: any
): Promise<CreateSubnameResult> {
  try {
    const {
      agentLabel,
      parentDomain,
      ownerAddress,
      chainId,
      setAsPrimary = false,
    } = params;

    // Format full ENS name
    const fullName = formatAgentSubname(agentLabel, parentDomain);

    // Validate name format
    if (!isValidEnsName(fullName)) {
      return {
        success: false,
        error: `Invalid ENS name format: ${fullName}`,
      };
    }

    // Note: Availability check should be done via wagmi hooks in components
    // For now, we'll proceed and let the transaction fail if name is taken

    // Get parent node and label hash
    const parentNode = getNamehash(parentDomain);
    const label = getLabelhash(agentLabel);

    // Get resolver address (use public resolver)
    const resolver = getPublicResolverAddress(chainId);

    // Encode transaction
    const data = encodeSetSubnodeRecord(
      parentNode,
      label,
      ownerAddress,
      resolver,
      BigInt(0)
    );

    // Execute transaction
    const registryAddress = getEnsRegistryAddress(chainId);
    const txHash = await writeContract({
      address: registryAddress,
      abi: ENS_REGISTRY_ABI,
      functionName: "setSubnodeRecord",
      args: [parentNode, label, ownerAddress, resolver, BigInt(0)],
    });

    // Optionally set as primary name
    if (setAsPrimary) {
      // Note: This would require a separate transaction
      // For now, we'll return the subname creation result
      // Primary name setting can be done separately
    }

    return {
      success: true,
      ensName: fullName,
      ensNode: getNamehash(fullName),
      txHash,
    };
  } catch (error: any) {
    console.error("Error creating agent subname:", error);
    return {
      success: false,
      error: error.message || "Failed to create ENS subname",
    };
  }
}

/**
 * Set primary ENS name for an address
 * @param name Full ENS name (e.g., "myagent.yourdomain.eth")
 * @param address Address to set primary name for
 * @param chainId Chain ID
 * @param writeContract Write contract function
 */
export async function setPrimaryName(
  name: string,
  address: Address,
  chainId: number,
  writeContract: any
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Validate name
    if (!isValidEnsName(name)) {
      return {
        success: false,
        error: `Invalid ENS name format: ${name}`,
      };
    }

    // Note: Address resolution check should be done via wagmi hooks
    // For now, we'll proceed and let the transaction fail if name doesn't resolve correctly

    // Encode and execute setName transaction
    const reverseRegistrar = "0x084b1c3C81545d370f3634392De611CaaBFf8146" as Address;
    
    const txHash = await writeContract({
      address: reverseRegistrar,
      abi: ENS_REVERSE_REGISTRAR_ABI,
      functionName: "setName",
      args: [name],
    });

    return {
      success: true,
      txHash,
    };
  } catch (error: any) {
    console.error("Error setting primary name:", error);
    return {
      success: false,
      error: error.message || "Failed to set primary name",
    };
  }
}

/**
 * Get agent ENS name from registry
 * @param agentId Agent ID
 * @param registryAddress TradingAgentRegistry contract address
 * @param chainId Chain ID
 * @param readContract Read contract function
 */
export async function getAgentEnsName(
  agentId: Hash,
  registryAddress: Address,
  chainId: number,
  readContract: any
): Promise<string | null> {
  try {
    // This would call the registry contract to get agent info
    // For now, return null - implement when registry is deployed
    return null;
  } catch (error) {
    console.error("Error getting agent ENS name:", error);
    return null;
  }
}

