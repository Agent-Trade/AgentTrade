import { NextRequest, NextResponse } from "next/server";
import { Address, Hash } from "viem";
import { monitorAgent, monitorAgents, getUserAgentIds } from "@/lib/agent/agent-monitor";

/**
 * POST /api/monitor
 * 
 * Monitor trading agents and execute trades when triggers are met
 * 
 * Body (optional):
 * - agentIds: Array of agent IDs to monitor (if not provided, monitors all)
 * - userAddress: User address to get agents for
 * - chainId: Chain ID (default: 84532 for Base Sepolia)
 * - rpcUrl: Optional custom RPC URL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      agentIds,
      userAddress,
      chainId = 84532,
      rpcUrl,
    } = body;

    // Get agent IDs
    let agentIdsToMonitor: Hash[] = [];

    if (agentIds && Array.isArray(agentIds)) {
      // Use provided agent IDs
      agentIdsToMonitor = agentIds as Hash[];
    } else if (userAddress) {
      // Get agent IDs for user
      agentIdsToMonitor = await getUserAgentIds(userAddress as Address, chainId, rpcUrl);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Either agentIds or userAddress must be provided",
        },
        { status: 400 }
      );
    }

    if (agentIdsToMonitor.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          totalAgents: 0,
          activeAgents: 0,
          triggersMet: 0,
          executed: 0,
          errors: 0,
          results: [],
        },
        message: "No agents to monitor",
      });
    }

    // Monitor agents
    const stats = await monitorAgents(agentIdsToMonitor, chainId, rpcUrl);

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in monitoring service:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/monitor?agentId=...&chainId=...
 * 
 * Monitor a single agent
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const chainId = parseInt(searchParams.get("chainId") || "84532");
    const rpcUrl = searchParams.get("rpcUrl") || undefined;

    if (!agentId) {
      return NextResponse.json(
        {
          success: false,
          error: "agentId query parameter is required",
        },
        { status: 400 }
      );
    }

    const result = await monitorAgent(agentId as Hash, chainId, rpcUrl);

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error monitoring agent:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

