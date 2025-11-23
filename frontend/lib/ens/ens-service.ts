/**
 * ENS Integration Service
 * 
 * This service handles:
 * 1. Creating ENS subnames for trading agents
 * 2. Setting primary ENS names
 * 3. Resolving ENS names to addresses
 * 4. Checking name availability
 */

import { Address, Hash, namehash } from "viem";
import { normalize } from "viem/ens";
import { keccak256, toBytes } from "viem";

// ENS Registry addresses
export const ENS_REGISTRY = {
  MAINNET: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
  BASE: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e", // Same as mainnet
  BASE_SEPOLIA: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e", // Same as mainnet
} as const;

// Universal Resolver addresses
export const ENS_UNIVERSAL_RESOLVER = {
  MAINNET: "0xce01f8eee7E479C928F8919abD53E553a36CeF67",
  BASE: "0xce01f8eee7E479C928F8919abD53E553a36CeF67",
  BASE_SEPOLIA: "0xce01f8eee7E479C928F8919abD53E553a36CeF67",
} as const;

export interface ENSNameInfo {
  name: string;
  node: Hash;
  owner: Address | null;
  resolver: Address | null;
  address: Address | null;
  isAvailable: boolean;
}

// Note: ENS operations happen on mainnet
// We'll use wagmi hooks for ENS queries in components

/**
 * Normalize ENS name (handles emoji, special characters, etc.)
 * Uses viem's normalize function for proper ENS normalization
 */
export function normalizeEnsName(name: string): string {
  try {
    // Use viem's normalize function for proper ENS normalization
    return normalize(name);
  } catch (error) {
    // Fallback to basic normalization if viem normalize fails
    console.warn("Failed to normalize ENS name with viem, using fallback:", error);
    return name.toLowerCase().trim();
  }
}

/**
 * Get the namehash for an ENS name
 * Uses viem's namehash function
 */
export function getNamehash(name: string): Hash {
  // Normalize first, then hash
  const normalized = normalizeEnsName(name);
  return namehash(normalized) as Hash;
}

/**
 * Get the labelhash for an ENS label
 * Labelhash is keccak256 of the label
 */
export function getLabelhash(label: string): Hash {
  // Labelhash is keccak256 of the label (without normalization for labels)
  return keccak256(toBytes(label)) as Hash;
}

/**
 * Check if an ENS name is available
 * Note: This is a helper - use wagmi's useEnsAvailability hook in components
 * @param name Full ENS name (e.g., "myagent.yourdomain.eth")
 * @returns true if name format is valid (actual availability check via wagmi)
 */
export function isValidNameFormat(name: string): boolean {
  return isValidEnsName(name);
}

/**
 * Get ENS name information
 * Note: Use wagmi's useEnsName or useEnsResolver hooks in components for actual queries
 * This is a utility for formatting
 */
export function formatEnsNameInfo(name: string): ENSNameInfo {
  const normalizedName = normalizeEnsName(name);
  return {
    name: normalizedName,
    node: getNamehash(normalizedName),
    owner: null,
    resolver: null,
    address: null,
    isAvailable: false, // Check via wagmi hooks
  };
}

/**
 * Validate ENS name format
 * @param name ENS name to validate
 * @returns true if valid format
 */
export function isValidEnsName(name: string): boolean {
  // Basic validation - ENS names should:
  // - Be lowercase
  // - Contain only alphanumeric and hyphens
  // - Not start or end with hyphen
  // - End with .eth (for now)
  const ensRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.eth$/;
  return ensRegex.test(name.toLowerCase());
}

/**
 * Format subname for agent
 * @param agentLabel Label for the agent (e.g., "my-agent")
 * @param parentDomain Parent domain (e.g., "yourdomain.eth")
 * @returns Full ENS name
 */
export function formatAgentSubname(
  agentLabel: string,
  parentDomain: string = "agenttrade.eth"
): string {
  const normalizedLabel = normalizeEnsName(agentLabel);
  const normalizedParent = parentDomain.toLowerCase().trim();
  return `${normalizedLabel}.${normalizedParent}`;
}

