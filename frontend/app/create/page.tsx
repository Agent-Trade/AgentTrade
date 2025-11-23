"use client";

import { useState } from "react";
import { useConnection, useChainId, useWriteContract } from "wagmi";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import {
  getAgentRegistryAddress,
  generateAgentId,
  prepareStrategy,
  TRADING_AGENT_REGISTRY_ABI,
  type CreateAgentParams,
} from "@/lib/agent/agent-registry";

export default function CreateAgentPage() {
  const { address } = useConnection();
  const chainId = useChainId();
  const router = useRouter();
  const { writeContractAsync, isPending } = useWriteContract();

  const [formData, setFormData] = useState<CreateAgentParams>({
    agentName: "",
    ensLabel: "",
    priceFeedSymbol: "ETH",
    triggerPrice: 3000,
    triggerAbove: true,
    tokenIn: "WETH",
    tokenOut: "USDC",
    amountIn: 0.1,
    cooldownPeriod: 3600,
  });

  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      setError("Please connect your wallet");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const agentId = generateAgentId(formData.agentName);
      const strategy = await prepareStrategy(formData, chainId);

      await writeContractAsync({
        address: getAgentRegistryAddress(chainId),
        abi: TRADING_AGENT_REGISTRY_ABI,
        functionName: "createAgent",
        args: [agentId, formData.ensLabel, strategy],
      });

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Error creating agent:", err);
      setError(err.message || "Failed to create agent");
      setCreating(false);
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
            <p className="text-xl text-gray-400">Please connect your wallet to create an agent.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]">
      <Navigation />
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Create Trading Agent</h1>
          <p className="mt-4 text-lg text-gray-400">Set up an automated trading agent with price triggers</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Agent Information */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/80 to-gray-950/80 p-8 shadow-xl backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-purple-500/0 to-pink-500/0 opacity-0 transition-opacity hover:opacity-10"></div>
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                  <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Agent Information</h2>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={formData.agentName}
                    onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
                    placeholder="my-trading-agent"
                    required
                    className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all duration-200 focus:border-indigo-500 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    ENS Label
                  </label>
                  <input
                    type="text"
                    value={formData.ensLabel}
                    onChange={(e) => setFormData({ ...formData, ensLabel: e.target.value })}
                    placeholder="my-agent"
                    required
                    className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all duration-200 focus:border-indigo-500 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="mt-2 text-xs font-medium text-gray-500">
                    This will create: <span className="text-indigo-400 font-mono">{formData.ensLabel ? `${formData.ensLabel}.agenttrade.eth` : "..."}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trading Strategy */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/80 to-gray-950/80 p-8 shadow-xl backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-purple-500/0 to-pink-500/0 opacity-0 transition-opacity hover:opacity-10"></div>
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                  <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Trading Strategy</h2>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-300">
                      Price Feed
                    </label>
                    <select
                      value={formData.priceFeedSymbol}
                      onChange={(e) => setFormData({ ...formData, priceFeedSymbol: e.target.value })}
                      className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-white backdrop-blur-sm transition-all duration-200 focus:border-indigo-500 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="ETH">ETH/USD</option>
                      <option value="BTC">BTC/USD</option>
                      <option value="USDC">USDC/USD</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-300">
                      Trigger Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.triggerPrice}
                      onChange={(e) => setFormData({ ...formData, triggerPrice: parseFloat(e.target.value) })}
                      required
                      className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all duration-200 focus:border-indigo-500 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-semibold text-gray-300">
                    Trigger Condition
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-gray-700/50 bg-gray-800/30 p-4 transition-all duration-200 hover:border-indigo-500/50 hover:bg-gray-800/50">
                      <input
                        type="radio"
                        checked={formData.triggerAbove}
                        onChange={() => setFormData({ ...formData, triggerAbove: true })}
                        className="h-4 w-4 border-gray-600 bg-gray-700 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">Execute Above</div>
                        <div className="text-xs text-gray-400">When price exceeds trigger</div>
                      </div>
                      {formData.triggerAbove && (
                        <div className="absolute right-4 h-2 w-2 rounded-full bg-indigo-500"></div>
                      )}
                    </label>
                    <label className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-gray-700/50 bg-gray-800/30 p-4 transition-all duration-200 hover:border-indigo-500/50 hover:bg-gray-800/50">
                      <input
                        type="radio"
                        checked={!formData.triggerAbove}
                        onChange={() => setFormData({ ...formData, triggerAbove: false })}
                        className="h-4 w-4 border-gray-600 bg-gray-700 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">Execute Below</div>
                        <div className="text-xs text-gray-400">When price falls below trigger</div>
                      </div>
                      {!formData.triggerAbove && (
                        <div className="absolute right-4 h-2 w-2 rounded-full bg-indigo-500"></div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-300">
                      Token In (Sell)
                    </label>
                    <select
                      value={formData.tokenIn}
                      onChange={(e) => setFormData({ ...formData, tokenIn: e.target.value })}
                      className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-white backdrop-blur-sm transition-all duration-200 focus:border-indigo-500 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="WETH">WETH</option>
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-300">
                      Token Out (Buy)
                    </label>
                    <select
                      value={formData.tokenOut}
                      onChange={(e) => setFormData({ ...formData, tokenOut: e.target.value })}
                      className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-white backdrop-blur-sm transition-all duration-200 focus:border-indigo-500 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="USDC">USDC</option>
                      <option value="WETH">WETH</option>
                      <option value="USDT">USDT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Amount to Trade
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amountIn}
                    onChange={(e) => setFormData({ ...formData, amountIn: parseFloat(e.target.value) })}
                    placeholder="0.1"
                    className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all duration-200 focus:border-indigo-500 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="mt-2 text-xs font-medium text-gray-500">Leave as 0 to use full balance</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Cooldown Period (seconds)
                  </label>
                  <input
                    type="number"
                    value={formData.cooldownPeriod}
                    onChange={(e) => setFormData({ ...formData, cooldownPeriod: parseInt(e.target.value) })}
                    className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all duration-200 focus:border-indigo-500 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="mt-2 text-xs font-medium text-gray-500">
                    Minimum time between executions: <span className="text-indigo-400">{Math.floor(formData.cooldownPeriod / 60)} minutes</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm font-medium text-red-400">{error}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border-2 border-gray-700/50 bg-gray-900/50 px-6 py-3.5 text-sm font-semibold text-gray-300 backdrop-blur-sm transition-all duration-300 hover:border-gray-600 hover:bg-gray-800/50 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || isPending}
              className="group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/75 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {creating || isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Create Agent
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-700 opacity-0 transition-opacity group-hover:opacity-100"></div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
