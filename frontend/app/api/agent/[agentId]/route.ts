import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, Hash } from "viem";
import { baseSepolia, base } from "viem/chains";
import { TRADING_AGENT_REGISTRY_ABI, getAgentRegistryAddress } from "@/lib/agent/agent-registry";

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get("chainId") || "84532");
    const agentId = params.agentId as Hash;

    // Get chain
    const chain = chainId === 8453 ? base : baseSepolia;
    const client = createPublicClient({
      chain,
      transport: http(),
    });

    // Get agent registry address
    const registryAddress = getAgentRegistryAddress(chainId);

    // Fetch agent data
    const agent = await client.readContract({
      address: registryAddress,
      abi: TRADING_AGENT_REGISTRY_ABI,
      functionName: "getAgent",
      args: [agentId],
    });

    return NextResponse.json(agent);
  } catch (error: any) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch agent" },
      { status: 500 }
    );
  }
}

