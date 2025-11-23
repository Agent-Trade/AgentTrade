"use client";

import { useState } from "react";
import { useAgentSigner } from "@/lib/privy/agent-signer";
import { useAgentPermissions, AgentPermissionType } from "@/lib/privy/agent-permissions";
import { useChainId } from "wagmi";
import { Hash, Address } from "viem";
import { keccak256, toBytes } from "viem";

export function AgentSignerDemo() {
  const chainId = useChainId();
  const { signAgentExecution, signAgentMessage, canSignForAgent, isReady, walletAddress } = useAgentSigner();
  const { hasPermission, grantPermission, getAgentPermissions } = useAgentPermissions();

  const [agentId, setAgentId] = useState("");
  const [agentOwner, setAgentOwner] = useState("");
  const [action, setAction] = useState("execute_trigger");
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState<string>("");
  const [selectedPermission, setSelectedPermission] = useState<AgentPermissionType>(AgentPermissionType.EXECUTE_TRIGGER);
  const [result, setResult] = useState<string>("");

  // Generate agent ID from input
  const getAgentIdHash = (): Hash | null => {
    if (!agentId.trim()) return null;
    return keccak256(toBytes(agentId));
  };

  const handleSignExecution = async () => {
    if (!isReady || !walletAddress) {
      setResult("Please connect your wallet first");
      return;
    }

    const agentIdHash = getAgentIdHash();
    if (!agentIdHash) {
      setResult("Please enter an agent ID");
      return;
    }

    if (!agentOwner) {
      setResult("Please enter the agent owner address");
      return;
    }

    // Check permissions
    if (!canSignForAgent(agentOwner as Address)) {
      const hasPerm = hasPermission(walletAddress, selectedPermission, agentOwner as Address);
      if (!hasPerm) {
        setResult(`You don't have permission to ${selectedPermission} for this agent`);
        return;
      }
    }

    try {
      setResult("Signing...");
      const signed = await signAgentExecution(
        {
          agentId: agentIdHash,
          agentName: agentId,
          ownerAddress: agentOwner as Address,
          chainId,
        },
        {
          agentId: agentIdHash,
          action,
          timestamp: Date.now(),
          nonce: Math.floor(Math.random() * 1000000),
        }
      );

      if (signed) {
        setSignature(signed.signature);
        setResult(`Signed successfully!\nSignature: ${signed.signature}\nSigner: ${signed.signer}`);
      }
    } catch (error: any) {
      setResult(`Error: ${error.message || "Failed to sign"}`);
    }
  };

  const handleSignMessage = async () => {
    if (!isReady || !walletAddress) {
      setResult("Please connect your wallet first");
      return;
    }

    const agentIdHash = getAgentIdHash();
    if (!agentIdHash) {
      setResult("Please enter an agent ID");
      return;
    }

    if (!message.trim()) {
      setResult("Please enter a message to sign");
      return;
    }

    try {
      setResult("Signing message...");
      const signed = await signAgentMessage(message, agentIdHash);

      if (signed) {
        setSignature(signed.signature);
        setResult(`Message signed!\nSignature: ${signed.signature}\nSigner: ${signed.signer}`);
      }
    } catch (error: any) {
      setResult(`Error: ${error.message || "Failed to sign message"}`);
    }
  };

  const handleGrantPermission = async () => {
    if (!walletAddress || !agentOwner) {
      setResult("Please connect wallet and enter agent owner");
      return;
    }

    const agentIdHash = getAgentIdHash();
    if (!agentIdHash) {
      setResult("Please enter an agent ID");
      return;
    }

    try {
      const success = await grantPermission(
        walletAddress,
        selectedPermission,
        undefined // No expiration
      );

      if (success) {
        setResult(`Permission ${selectedPermission} granted successfully`);
        // Permissions are managed by the useAgentPermissions hook
      } else {
        setResult("Failed to grant permission");
      }
    } catch (error: any) {
      setResult(`Error: ${error.message || "Failed to grant permission"}`);
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 shadow-lg">
      <h2 className="mb-6 text-2xl font-bold text-white">Agent Signer & Permissions</h2>

      {/* Agent Info */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Agent ID
          </label>
          <input
            type="text"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="my-agent-123"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Agent Owner Address
          </label>
          <input
            type="text"
            value={agentOwner}
            onChange={(e) => setAgentOwner(e.target.value)}
            placeholder="0x..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {walletAddress && (
          <div className="rounded-lg bg-gray-800 p-3">
            <p className="text-sm text-gray-400">Your Wallet</p>
            <p className="font-mono text-sm text-white">{walletAddress}</p>
            {agentOwner && (
              <p className="mt-2 text-sm text-gray-400">
                {canSignForAgent(agentOwner as Address)
                  ? "✓ You are the agent owner"
                  : "You are not the agent owner"}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sign Execution */}
      <div className="mb-6 rounded-lg border border-blue-800/50 bg-blue-900/10 p-4">
        <h3 className="mb-4 text-lg font-semibold text-blue-400">Sign Agent Execution</h3>
        <div className="mb-4 space-y-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="execute_trigger">Execute Trigger</option>
              <option value="update_strategy">Update Strategy</option>
              <option value="deactivate">Deactivate</option>
            </select>
          </div>
          <button
            onClick={handleSignExecution}
            disabled={!isReady || !agentId || !agentOwner}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Sign Execution
          </button>
        </div>
      </div>

      {/* Sign Message */}
      <div className="mb-6 rounded-lg border border-green-800/50 bg-green-900/10 p-4">
        <h3 className="mb-4 text-lg font-semibold text-green-400">Sign Agent Message</h3>
        <div className="mb-4 space-y-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Message</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter message to sign"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleSignMessage}
            disabled={!isReady || !agentId || !message}
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            Sign Message
          </button>
        </div>
      </div>

      {/* Permissions */}
      <div className="mb-6 rounded-lg border border-purple-800/50 bg-purple-900/10 p-4">
        <h3 className="mb-4 text-lg font-semibold text-purple-400">Manage Permissions</h3>
        <div className="mb-4 space-y-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Permission Type</label>
            <select
              value={selectedPermission}
              onChange={(e) => setSelectedPermission(e.target.value as AgentPermissionType)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value={AgentPermissionType.EXECUTE_TRIGGER}>Execute Trigger</option>
              <option value={AgentPermissionType.UPDATE_STRATEGY}>Update Strategy</option>
              <option value={AgentPermissionType.DEACTIVATE}>Deactivate</option>
              <option value={AgentPermissionType.ALL}>All Permissions</option>
            </select>
          </div>
          <button
            onClick={handleGrantPermission}
            disabled={!isReady || !agentId || !agentOwner}
            className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
          >
            Grant Permission
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <p className="whitespace-pre-wrap text-sm text-gray-300">{result}</p>
        </div>
      )}

      {signature && (
        <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
          <p className="mb-2 text-sm font-medium text-gray-400">Signature</p>
          <p className="break-all font-mono text-xs text-white">{signature}</p>
        </div>
      )}
    </div>
  );
}

