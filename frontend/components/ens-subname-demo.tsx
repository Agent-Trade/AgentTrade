"use client";

import { useState } from "react";
import { useConnection, useChainId } from "wagmi";
import { useEnsSubname } from "@/lib/ens/use-ens-subname";
import {
  formatAgentSubname,
  isValidEnsName,
  getNamehash,
} from "@/lib/ens/ens-service";

export function EnsSubnameDemo() {
  const { address } = useConnection();
  const chainId = useChainId();
  const { createSubname, setPrimary, isCreating, isSettingPrimary, error } =
    useEnsSubname();

  const [agentLabel, setAgentLabel] = useState("");
  const [parentDomain, setParentDomain] = useState("agenttrade.eth");
  const [setAsPrimary, setSetAsPrimary] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleCreateSubname = async () => {
    if (!address) {
      setResult("Please connect your wallet first");
      return;
    }

    if (!agentLabel.trim()) {
      setResult("Please enter an agent label");
      return;
    }

    const fullName = formatAgentSubname(agentLabel, parentDomain);
    if (!isValidEnsName(fullName)) {
      setResult(`Invalid ENS name format: ${fullName}`);
      return;
    }

    setResult("Creating subname...");

    const txHash = await createSubname({
      label: agentLabel,
      parentDomain,
      owner: address,
      setAsPrimary,
    });

    if (txHash) {
      setResult(
        `Subname created! TX: ${txHash}\nFull name: ${fullName}\nNode: ${getNamehash(fullName)}`
      );
      if (setAsPrimary) {
        setResult((prev) => prev + "\n✓ Set as primary name");
      }
    } else {
      setResult(`Failed: ${error || "Unknown error"}`);
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 shadow-lg">
      <h3 className="mb-6 text-2xl font-semibold text-white">
        ENS Subname Demo
      </h3>

      <div className="space-y-4">
        {/* Agent Label */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-400">
            Agent Label
          </label>
          <input
            type="text"
            value={agentLabel}
            onChange={(e) => setAgentLabel(e.target.value)}
            placeholder="my-agent"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            This will create: {agentLabel ? formatAgentSubname(agentLabel, parentDomain) : "..."}
          </p>
        </div>

        {/* Parent Domain */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-400">
            Parent Domain
          </label>
          <input
            type="text"
            value={parentDomain}
            onChange={(e) => setParentDomain(e.target.value)}
            placeholder="agenttrade.eth"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Set as Primary */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="setPrimary"
            checked={setAsPrimary}
            onChange={(e) => setSetAsPrimary(e.target.checked)}
            className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="setPrimary" className="text-sm text-gray-400">
            Set as primary name
          </label>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreateSubname}
          disabled={isCreating || !address}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-base font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isCreating
            ? "Creating..."
            : isSettingPrimary
            ? "Setting primary..."
            : "Create ENS Subname"}
        </button>

        {/* Result */}
        {result && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
            <div className="text-sm text-white whitespace-pre-wrap">
              {result}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
            <div className="text-sm text-red-400">{error}</div>
          </div>
        )}

        {!address && (
          <div className="rounded-lg bg-gray-800/50 p-4 text-base text-gray-400">
            Connect your wallet to create ENS subnames
          </div>
        )}

        {/* Info */}
        <div className="rounded-lg border border-blue-800/50 bg-blue-900/10 p-4">
          <p className="text-xs text-blue-400">
            <strong>Note:</strong> ENS operations happen on Ethereum mainnet.
            Make sure you're connected to mainnet or have a mainnet RPC configured.
            You need to own the parent domain to create subnames.
          </p>
        </div>
      </div>
    </div>
  );
}

