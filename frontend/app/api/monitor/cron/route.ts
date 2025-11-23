import { NextResponse } from "next/server";
import { monitorAgents, getUserAgentIds } from "@/lib/agent/agent-monitor";
import { Address, Hash } from "viem";

/**
 * POST /api/monitor/cron
 * 
 * Dedicated endpoint for Vercel cron jobs
 * Monitors all active agents (or agents for configured addresses)
 * 
 * Environment variables:
 * - MONITOR_USER_ADDRESSES: Comma-separated list of user addresses to monitor
 * - MONITOR_CHAIN_ID: Chain ID to monitor (default: 84532)
 * - MONITOR_RPC_URL: Optional custom RPC URL
 */
export async function POST() {
  try {
    const chainId = parseInt(process.env.MONITOR_CHAIN_ID || "84532");
    const rpcUrl = process.env.MONITOR_RPC_URL;

    // Get user addresses from environment variable
    const userAddressesEnv = process.env.MONITOR_USER_ADDRESSES;
    let agentIds: Hash[] = [];

    if (userAddressesEnv) {
      // Get agents for all specified users
      const userAddresses = userAddressesEnv.split(",").map((addr) => addr.trim() as Address);
      
      for (const userAddress of userAddresses) {
        const userAgentIds = await getUserAgentIds(userAddress, chainId, rpcUrl);
        agentIds.push(...userAgentIds);
      }
    }

    if (agentIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No agents to monitor. Set MONITOR_USER_ADDRESSES environment variable.",
        stats: {
          totalAgents: 0,
          activeAgents: 0,
          triggersMet: 0,
          executed: 0,
          errors: 0,
          results: [],
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Monitor all agents
    const stats = await monitorAgents(agentIds, chainId, rpcUrl);

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in cron monitoring service:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

