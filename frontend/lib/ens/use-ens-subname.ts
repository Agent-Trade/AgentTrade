/**
 * React Hook for ENS Subname Operations
 * 
 * Provides hooks for creating ENS subnames and setting primary names
 */

import { useWriteContract, useChainId, useSwitchChain } from "wagmi";
import { Address } from "viem";
import { useState } from "react";
import { mainnet } from "wagmi/chains";
import {
  getNamehash,
  getLabelhash,
  isValidEnsName,
  formatAgentSubname,
} from "./ens-service";
import {
  getEnsRegistryAddress,
  getPublicResolverAddress,
  getReverseRegistrarAddress,
  ENS_REGISTRY_ABI,
  ENS_REVERSE_REGISTRAR_ABI,
} from "./ens-contract";

// ENS operations must happen on mainnet
const ENS_CHAIN_ID = mainnet.id;

export interface UseEnsSubnameReturn {
  createSubname: (params: CreateSubnameParams) => Promise<string | null>;
  setPrimary: (name: string) => Promise<string | null>;
  isCreating: boolean;
  isSettingPrimary: boolean;
  error: string | null;
}

export interface CreateSubnameParams {
  label: string; // e.g., "my-agent"
  parentDomain: string; // e.g., "yourdomain.eth"
  owner: Address;
  setAsPrimary?: boolean;
}

/**
 * Hook for creating ENS subnames
 * Note: ENS operations happen on mainnet, regardless of current chain
 */
export function useEnsSubname(): UseEnsSubnameReturn {
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const [isCreating, setIsCreating] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSubname = async (params: CreateSubnameParams): Promise<string | null> => {
    try {
      setIsCreating(true);
      setError(null);

      const { label, parentDomain, owner, setAsPrimary = false } = params;

      // Format full name
      const fullName = formatAgentSubname(label, parentDomain);

      // Validate
      if (!isValidEnsName(fullName)) {
        throw new Error(`Invalid ENS name format: ${fullName}`);
      }

      // Switch to mainnet if not already on it (ENS contracts are on mainnet)
      if (currentChainId !== ENS_CHAIN_ID) {
        try {
          await switchChain({ chainId: ENS_CHAIN_ID });
        } catch (switchError: any) {
          // User might have rejected the switch, or it failed
          throw new Error(
            `Please switch to Ethereum Mainnet to create ENS subnames. ${switchError.message || ""}`
          );
        }
      }

      // Get parent node and label hash
      const parentNode = getNamehash(parentDomain);
      const labelHash = getLabelhash(label);
      const resolver = getPublicResolverAddress(ENS_CHAIN_ID);
      const registry = getEnsRegistryAddress(ENS_CHAIN_ID);

      // Create subname on mainnet
      const txHash = await writeContractAsync({
        address: registry,
        abi: ENS_REGISTRY_ABI,
        functionName: "setSubnodeRecord",
        args: [parentNode, labelHash, owner, resolver, 0n],
      });

      // Optionally set as primary
      if (setAsPrimary) {
        setIsSettingPrimary(true);
        const reverseRegistrar = getReverseRegistrarAddress(ENS_CHAIN_ID);
        await writeContractAsync({
          address: reverseRegistrar,
          abi: ENS_REVERSE_REGISTRAR_ABI,
          functionName: "setName",
          args: [fullName],
        });
        setIsSettingPrimary(false);
      }

      setIsCreating(false);
      return txHash;
    } catch (err: any) {
      setError(err.message || "Failed to create ENS subname");
      setIsCreating(false);
      setIsSettingPrimary(false);
      return null;
    }
  };

  const setPrimary = async (name: string): Promise<string | null> => {
    try {
      setIsSettingPrimary(true);
      setError(null);

      if (!isValidEnsName(name)) {
        throw new Error(`Invalid ENS name format: ${name}`);
      }

      // Switch to mainnet if not already on it
      if (currentChainId !== ENS_CHAIN_ID) {
        try {
          await switchChain({ chainId: ENS_CHAIN_ID });
        } catch (switchError: any) {
          throw new Error(
            `Please switch to Ethereum Mainnet to set primary name. ${switchError.message || ""}`
          );
        }
      }

      const reverseRegistrar = getReverseRegistrarAddress(ENS_CHAIN_ID);
      const txHash = await writeContractAsync({
        address: reverseRegistrar,
        abi: ENS_REVERSE_REGISTRAR_ABI,
        functionName: "setName",
        args: [name],
      });

      setIsSettingPrimary(false);
      return txHash;
    } catch (err: any) {
      setError(err.message || "Failed to set primary name");
      setIsSettingPrimary(false);
      return null;
    }
  };

  return {
    createSubname,
    setPrimary,
    isCreating: isCreating || isWriting,
    isSettingPrimary,
    error,
  };
}

