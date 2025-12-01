"use client";

import { Navigation } from "@/components/navigation";
import { PriceFeedDemo } from "@/components/price-feed-demo";
import { OneInchSwapDemo } from "@/components/1inch-swap-demo";
import { EnsSubnameDemo } from "@/components/ens-subname-demo";
import { AgentSignerDemo } from "@/components/agent-signer-demo";

export default function DemosPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navigation />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">Integration Demos</h1>
          <p className="mt-2 text-gray-400">Test and explore the various integrations</p>
        </div>

        <div className="space-y-8">
          <PriceFeedDemo />
          <OneInchSwapDemo />
          <EnsSubnameDemo />
          <AgentSignerDemo />
        </div>
      </div>
    </div>
  );
}

