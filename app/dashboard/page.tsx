"use client";

import { useState, useEffect } from "react";
import { useConnection, useChainId, useReadContract, useWriteContract } from "wagmi";
import { Hash } from "viem";
import { Navigation } from "@/components/navigation";
import { 
  getAgentRegistryAddress, 
  TRADING_AGENT_REGISTRY_ABI,
  type Agent 
} from "@/lib/agent/agent-registry";
import Link from "next/link";

export default function DashboardPage() {
  const { address } = useConnection();
  const chainId = useChainId();
  const { writeContractAsync } = useWriteContract();

  const [agentIds, setAgentIds] = useState<Hash[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Get user's agents
  const { data: userAgentIds, refetch: refetchAgents } = useReadContract({
    address: address ? getAgentRegistryAddress(chainId) : undefined,
    abi: TRADING_AGENT_REGISTRY_ABI,
    functionName: "getUserAgents",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Fetch agent details
  useEffect(() => {
    if (userAgentIds && Array.isArray(userAgentIds)) {
      setAgentIds(userAgentIds as Hash[]);
      setLoading(false);
    } else if (address && !userAgentIds) {
      setLoading(false);
    }
  }, [userAgentIds, address]);

  // Fetch each agent's details
  useEffect(() => {
    if (agentIds.length === 0) {
      setAgents([]);
      return;
    }

    const fetchAgents = async () => {
      try {
        setLoading(true);
        const agentPromises = agentIds.map(async (agentId) => {
          try {
            const res = await fetch(`/api/agent/${agentId}?chainId=${chainId}`);
            if (!res.ok) return null;
            return await res.json();
          } catch {
            return null;
          }
        });
        const agentData = await Promise.all(agentPromises);
        setAgents(agentData.filter(Boolean));
      } catch (err) {
        console.error("Error fetching agents:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [agentIds, chainId]);

  const handleDeactivate = async (agentId: Hash) => {
    if (!address) return;

    try {
      await writeContractAsync({
        address: getAgentRegistryAddress(chainId),
        abi: TRADING_AGENT_REGISTRY_ABI,
        functionName: "deactivateAgent",
        args: [agentId],
      });
      refetchAgents();
    } catch (err: any) {
      console.error("Error deactivating agent:", err);
      alert(`Failed to deactivate agent: ${err.message}`);
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]">
        <Navigation />
        <div className="mx-auto max-w-7xl px-6 py-32">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
              <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Connect Your Wallet</h1>
            <p className="text-xl text-gray-400">Please connect your wallet to view your trading agents.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]">
      <Navigation />
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Header */}
        <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Agent Dashboard</h1>
            <p className="mt-3 text-lg text-gray-400">Manage your automated trading agents</p>
          </div>
          <Link
            href="/create"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/75"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create New Agent
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-700 opacity-0 transition-opacity group-hover:opacity-100"></div>
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-indigo-500"></div>
              <p className="text-gray-400">Loading agents...</p>
            </div>
          </div>
        ) : agents.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-gray-800/50 bg-gradient-to-br from-gray-900/80 to-gray-950/80 p-16 text-center backdrop-blur-sm">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)]"></div>
            <div className="relative">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                <svg className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">No Agents Yet</h2>
              <p className="text-lg text-gray-400 mb-8 max-w-md mx-auto">
                Create your first automated trading agent to get started with automated execution.
              </p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-indigo-500/50 transition-all duration-300 hover:scale-105"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create Your First Agent
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent, index) => (
              <AgentCard
                key={agentIds[index]}
                agentId={agentIds[index]}
                agent={agent}
                chainId={chainId}
                onDeactivate={handleDeactivate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AgentCard({
  agentId,
  agent,
  chainId,
  onDeactivate,
}: {
  agentId: Hash;
  agent: Agent;
  chainId: number;
  onDeactivate: (agentId: Hash) => void;
}) {
  const { data: triggerData } = useReadContract({
    address: getAgentRegistryAddress(chainId),
    abi: TRADING_AGENT_REGISTRY_ABI,
    functionName: "checkTrigger",
    args: [agentId],
    query: {
      enabled: agent.exists,
      refetchInterval: 10000,
    },
  });

  const [triggerMet, currentPrice] = triggerData || [false, 0n];
  const priceValue = currentPrice ? Number(currentPrice) / 1e8 : 0;
  const triggerPrice = Number(agent.strategy.triggerPrice) / 1e8;
  const priceDiff = priceValue - triggerPrice;
  const priceDiffPercent = triggerPrice > 0 ? (priceDiff / triggerPrice) * 100 : 0;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/80 to-gray-950/80 p-6 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-purple-500/0 to-pink-500/0 opacity-0 transition-opacity group-hover:opacity-10"></div>
      
      <div className="relative">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">{agent.ensName || "Unnamed Agent"}</h3>
            <p className="text-xs text-gray-500 font-mono">{agentId.slice(0, 8)}...{agentId.slice(-6)}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              agent.strategy.isActive
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${agent.strategy.isActive ? "bg-green-400 animate-pulse" : "bg-gray-400"}`}></span>
            {agent.strategy.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Price Info */}
        <div className="mb-6 space-y-4">
          <div className="rounded-xl bg-gray-800/50 p-4 border border-gray-700/50">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Current Price</p>
            <p className="text-2xl font-bold text-white">
              ${priceValue.toFixed(2)}
            </p>
            {priceDiff !== 0 && (
              <p className={`text-xs font-medium mt-1 ${priceDiff > 0 ? "text-green-400" : "text-red-400"}`}>
                {priceDiff > 0 ? "+" : ""}{priceDiffPercent.toFixed(2)}% from trigger
              </p>
            )}
          </div>

          <div className="rounded-xl bg-gray-800/50 p-4 border border-gray-700/50">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Trigger Price</p>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-white">
                ${triggerPrice.toFixed(2)}
              </p>
              <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                agent.strategy.triggerAbove 
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                  : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
              }`}>
                {agent.strategy.triggerAbove ? "Above" : "Below"}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-4 border border-indigo-500/20">
            <p className="text-xs font-medium text-gray-400 mb-1.5">Status</p>
            <div className="flex items-center gap-2">
              {triggerMet ? (
                <>
                  <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-semibold text-green-400">Trigger Met</p>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse"></div>
                  <p className="text-sm font-medium text-gray-400">Waiting for trigger...</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-gray-800/50">
          <button
            onClick={() => onDeactivate(agentId)}
            disabled={!agent.strategy.isActive}
            className="w-full rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-400 transition-all duration-300 hover:bg-red-500/20 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500/10"
          >
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}
