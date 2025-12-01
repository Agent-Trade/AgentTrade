/**
 * Agent Permissions Manager
 * 
 * Manages delegated execution permissions for trading agents
 * Allows agents to have multiple authorized signers
 */

import { Address, Hash } from "viem";

/**
 * Agent permission structure
 */
export interface AgentPermission {
  agentId: Hash;
  signer: Address;
  permissions: string[]; // e.g., ["execute", "update_strategy"]
  grantedAt: number;
  expiresAt?: number; // Optional expiration
}

/**
 * Permission types
 */
export enum AgentPermissionType {
  EXECUTE_TRIGGER = "execute_trigger",
  UPDATE_STRATEGY = "update_strategy",
  DEACTIVATE = "deactivate",
  ALL = "all",
}

/**
 * Hook for managing agent permissions
 */
export function useAgentPermissions(agentId?: Hash) {

  /**
   * Check if a signer has permission for an agent
   * This is a frontend check - actual verification should happen on-chain
   */
  const hasPermission = (
    signer: Address,
    permission: AgentPermissionType,
    agentOwner: Address
  ): boolean => {
    // Owner always has all permissions
    if (signer.toLowerCase() === agentOwner.toLowerCase()) {
      return true;
    }

    // For now, we'll use localStorage to track permissions
    // In production, this should be on-chain
    if (typeof window === "undefined") return false;

    const key = `agent_permission_${agentId}_${signer}_${permission}`;
    const stored = localStorage.getItem(key);
    if (!stored) return false;

    try {
      const perm: AgentPermission = JSON.parse(stored);
      if (perm.expiresAt && perm.expiresAt < Date.now()) {
        localStorage.removeItem(key);
        return false;
      }
      return perm.permissions.includes(permission) || perm.permissions.includes(AgentPermissionType.ALL);
    } catch {
      return false;
    }
  };

  /**
   * Grant permission to a signer (frontend-only for now)
   */
  const grantPermission = async (
    signer: Address,
    permission: AgentPermissionType,
    expiresAt?: number
  ): Promise<boolean> => {
    if (!agentId) return false;

    try {
      const permissionData: AgentPermission = {
        agentId,
        signer,
        permissions: [permission],
        grantedAt: Date.now(),
        expiresAt,
      };

      const key = `agent_permission_${agentId}_${signer}_${permission}`;
      localStorage.setItem(key, JSON.stringify(permissionData));

      return true;
    } catch (error) {
      console.error("Error granting permission:", error);
      return false;
    }
  };

  /**
   * Revoke permission from a signer
   */
  const revokePermission = async (
    signer: Address,
    permission: AgentPermissionType
  ): Promise<boolean> => {
    if (!agentId) return false;

    try {
      const key = `agent_permission_${agentId}_${signer}_${permission}`;
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("Error revoking permission:", error);
      return false;
    }
  };

  /**
   * Get all permissions for an agent
   */
  const getAgentPermissions = (): AgentPermission[] => {
    if (!agentId || typeof window === "undefined") return [];

    const permissions: AgentPermission[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`agent_permission_${agentId}_`)) {
        try {
          const perm = JSON.parse(localStorage.getItem(key) || "{}");
          permissions.push(perm);
        } catch {
          // Skip invalid entries
        }
      }
    }

    return permissions;
  };

  return {
    hasPermission,
    grantPermission,
    revokePermission,
    getAgentPermissions,
  };
}

