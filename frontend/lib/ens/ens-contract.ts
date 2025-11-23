/**
 * ENS Contract Integration Utilities
 * 
 * Helper functions for interacting with ENS contracts on-chain
 */

import { Address, encodeFunctionData, parseAbi, Hash } from "viem";
import { ENS_REGISTRY } from "./ens-service";

// ENS Registry ABI (minimal for subname creation)
export const ENS_REGISTRY_ABI = parseAbi([
  "function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl) external returns (bytes32)",
  "function owner(bytes32 node) external view returns (address)",
  "function resolver(bytes32 node) external view returns (address)",
]);

// ENS Public Resolver ABI (for setting primary name)
export const ENS_RESOLVER_ABI = parseAbi([
  "function setText(bytes32 node, string calldata key, string calldata value) external",
  "function setAddr(bytes32 node, address addr) external",
  "function addr(bytes32 node) external view returns (address)",
  "function text(bytes32 node, string calldata key) external view returns (string)",
]);

// ENS Reverse Registrar ABI (for setting primary name)
export const ENS_REVERSE_REGISTRAR_ABI = parseAbi([
  "function setName(string calldata name) external returns (bytes32)",
  "function name(bytes32 node) external view returns (string)",
]);

// ENS contract addresses
export const ENS_CONTRACTS = {
  MAINNET: {
    registry: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as Address,
    reverseRegistrar: "0x084b1c3C81545d370f3634392De611CaaBFf8146" as Address,
    publicResolver: "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41" as Address,
  },
} as const;

/**
 * Get ENS registry address for a chain
 * Note: ENS operates on mainnet, but contracts are the same
 */
export function getEnsRegistryAddress(chainId: number): Address {
  // ENS is on mainnet, but address is same across chains
  return ENS_CONTRACTS.MAINNET.registry;
}

/**
 * Get reverse registrar address
 */
export function getReverseRegistrarAddress(chainId: number): Address {
  return ENS_CONTRACTS.MAINNET.reverseRegistrar;
}

/**
 * Get public resolver address
 */
export function getPublicResolverAddress(chainId: number): Address {
  return ENS_CONTRACTS.MAINNET.publicResolver;
}

/**
 * Encode setSubnodeRecord transaction
 * @param parentNode Parent ENS node (namehash of parent domain)
 * @param label Label hash for subname
 * @param owner Address that will own the subname
 * @param resolver Resolver address (use public resolver or zero address)
 * @param ttl TTL (use 0 for default)
 * @returns Encoded transaction data
 */
export function encodeSetSubnodeRecord(
  parentNode: Hash,
  label: Hash,
  owner: Address,
  resolver: Address = "0x0000000000000000000000000000000000000000" as Address,
  ttl: bigint = BigInt(0)
): `0x${string}` {
  return encodeFunctionData({
    abi: ENS_REGISTRY_ABI,
    functionName: "setSubnodeRecord",
    args: [parentNode, label, owner, resolver, ttl],
  });
}

/**
 * Encode setName transaction (for setting primary name)
 * @param name Full ENS name (e.g., "myagent.yourdomain.eth")
 * @returns Encoded transaction data
 */
export function encodeSetName(name: string): `0x${string}` {
  return encodeFunctionData({
    abi: ENS_REVERSE_REGISTRAR_ABI,
    functionName: "setName",
    args: [name],
  });
}

/**
 * Encode setAddr transaction (for setting address in resolver)
 * @param node ENS node (namehash)
 * @param addr Address to set
 * @returns Encoded transaction data
 */
export function encodeSetAddr(node: Hash, addr: Address): `0x${string}` {
  return encodeFunctionData({
    abi: ENS_RESOLVER_ABI,
    functionName: "setAddr",
    args: [node, addr],
  });
}

