/**
 * Trading Agent Keeper Bot
 * Monitors agents, fetches prices from Pyth, gets swap data from 1inch, and executes trades
 */

/***
 * What It Does:
Every 30 seconds, the keeper:

Calls checkUpkeep() to find ready agents
For each ready agent:

Fetches priceUpdateData from Hermes API using the price feed ID Flat
Gets optimal swap calldata from 1inch v6 API
Executes the swap on your contract
Logs the results
 */

import { ethers } from 'ethers';
import { HermesClient } from '@pythnetwork/hermes-client';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const CONFIG = {
  RPC_URL: process.env.RPC_URL || 'https://sepolia.base.org',
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
  ONE_INCH_API_KEY: process.env.ONE_INCH_API_KEY,
  CHAIN_ID: process.env.CHAIN_ID || '84532', // Base Sepolia
  HERMES_ENDPOINT: 'https://hermes.pyth.network',
  CHECK_INTERVAL: 30000, // 30 seconds
  MAX_GAS_PRICE: ethers.parseUnits('50', 'gwei'),
};

// Contract ABI (minimal - only what we need)
const CONTRACT_ABI = [
  'function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData)',
  'function performUpkeep(bytes calldata performData) external',
  'function executeSwap(bytes32 agentId) external',
  'function getAgent(bytes32 agentId) external view returns (tuple(address owner, bytes32 ensNode, string ensName, tuple(bytes32 priceFeedId, uint256 triggerPrice, bool triggerAbove, address tokenIn, address tokenOut, uint256 amountIn, uint256 minReturnAmount, bool isActive, uint256 lastExecuted, uint256 cooldownPeriod) strategy, uint256 createdAt, uint256 totalExecutions, bool exists))',
  'function allAgentIds(uint256) external view returns (bytes32)',
  'function agentCount() external view returns (uint256)',
];

class TradingAgentKeeper {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(
      CONFIG.CONTRACT_ADDRESS,
      CONTRACT_ABI,
      this.wallet
    );
    this.hermesClient = new HermesClient(CONFIG.HERMES_ENDPOINT, {});
    this.isRunning = false;
    this.priceCache = new Map();
  }

  /**
   * Start the keeper bot
   */
  async start() {
    console.log(' Trading Agent Keeper Bot Starting...');
    console.log(` Contract: ${CONFIG.CONTRACT_ADDRESS}`);
    console.log(`  Chain ID: ${CONFIG.CHAIN_ID}`);
    console.log(` Keeper Address: ${this.wallet.address}`);

    // Check keeper balance
    const balance = await this.provider.getBalance(this.wallet.address);
    console.log(` Keeper Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.01')) {
      console.warn('  Warning: Low keeper balance. Add more ETH to continue operations.');
    }

    this.isRunning = true;
    this.run();
  }

  /**
   * Main keeper loop
   */
  async run() {
    while (this.isRunning) {
      try {
        await this.checkAndExecute();
      } catch (error) {
        console.error(' Error in keeper loop:', error.message);
      }

      // Wait before next check
      await this.sleep(CONFIG.CHECK_INTERVAL);
    }
  }

  /**
   * Check for agents ready to execute and process them
   */
  async checkAndExecute() {
    console.log(` ${new Date().toISOString()} - Checking agents...`);

    try {
      // Call checkUpkeep to see if any agents are ready
      const [upkeepNeeded, performData] = await this.contract.checkUpkeep('0x');

      if (!upkeepNeeded) {
        console.log(' No agents ready for execution');
        return;
      }

      // Decode agent IDs that need execution
      const agentIds = ethers.AbiCoder.defaultAbiCoder().decode(
        ['bytes32[]'],
        performData
      )[0];

      console.log(` Found ${agentIds.length} agent(s) ready for execution`);

      // Process each agent
      for (const agentId of agentIds) {
        await this.executeAgent(agentId);
      }
    } catch (error) {
      console.error('Error checking upkeep:', error.message);
    }
  }

  /**
   * Execute swap for a specific agent
   */
  async executeAgent(agentId) {
    try {
      console.log(` Processing Agent: ${agentId}`);

      // Get agent details
      const agent = await this.contract.getAgent(agentId);
      console.log(`   ENS: ${agent.ensName}`);
      console.log(`   Strategy: ${agent.strategy.triggerAbove ? 'BUY ABOVE' : 'BUY BELOW'} $${ethers.formatUnits(agent.strategy.triggerPrice, 8)}`);

      // Fetch Pyth price update data
      const priceUpdateData = await this.fetchPriceUpdateData(
        agent.strategy.priceFeedId
      );

      // Get 1inch swap data
      const swapData = await this.get1inchSwapData(
        agent.strategy.tokenIn,
        agent.strategy.tokenOut,
        agent.strategy.amountIn.toString(),
        agent.strategy.minReturnAmount.toString()
      );

      if (!swapData) {
        console.log('     Could not get 1inch swap data, skipping...');
        return;
      }

      // Calculate total fee needed for Pyth update
      const updateFee = await this.contract.pyth.getUpdateFee(priceUpdateData);

      // Check gas price
      const feeData = await this.provider.getFeeData();
      if (feeData.gasPrice > CONFIG.MAX_GAS_PRICE) {
        console.log(`    Gas price too high (${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei), skipping...`);
        return;
      }

      // Execute the swap
      console.log('    Executing swap...');
      const tx = await this.contract.executeSwap(agentId, {
        value: updateFee,
        gasLimit: 500000,
      });

      console.log(`    Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        console.log(`    Swap executed successfully!`);
        console.log(`    Gas used: ${receipt.gasUsed.toString()}`);
        
        // Parse swap event
        const swapEvent = receipt.logs.find(
          log => log.topics[0] === ethers.id('SwapExecuted(bytes32,address,address,uint256,uint256,uint256,uint256)')
        );
        
        if (swapEvent) {
          console.log(`   💱 Swap completed for ${agent.ensName}`);
        }
      } else {
        console.log('    Transaction failed');
      }
    } catch (error) {
      console.error(`    Error executing agent ${agentId}:`, error.message);
      
      // Check for specific errors
      if (error.message.includes('TriggerNotMet')) {
        console.log('   ℹ️  Price trigger not met');
      } else if (error.message.includes('InsufficientBalance')) {
        console.log('   ℹ️  Insufficient token balance');
      } else if (error.message.includes('CooldownActive')) {
        console.log('   ℹ️  Agent still in cooldown period');
      }
    }
  }

  /**
   * Fetch Pyth price update data from Hermes
   */
  async fetchPriceUpdateData(priceFeedId) {
    try {
      // Check cache first (cache for 10 seconds)
      const cached = this.priceCache.get(priceFeedId);
      if (cached && Date.now() - cached.timestamp < 10000) {
        return cached.data;
      }

      // Fetch from Hermes
      const priceUpdates = await this.hermesClient.getLatestPriceUpdates([
        priceFeedId,
      ]);

      // Extract binary data
      const updateData = priceUpdates.binary.data.map(update => '0x' + update);

      // Cache it
      this.priceCache.set(priceFeedId, {
        data: updateData,
        timestamp: Date.now(),
      });

      return updateData;
    } catch (error) {
      console.error('Error fetching Pyth price update:', error.message);
      throw error;
    }
  }

  /**
   * Get 1inch swap data
   */
  async get1inchSwapData(tokenIn, tokenOut, amount, minReturn) {
    try {
      const url = `https://api.1inch.dev/swap/v6.0/${CONFIG.CHAIN_ID}/swap`;

      const params = {
        src: tokenIn,
        dst: tokenOut,
        amount: amount,
        from: CONFIG.CONTRACT_ADDRESS,
        slippage: 1, // 1% slippage
        disableEstimate: false,
        allowPartialFill: false,
      };

      const response = await axios.get(url, {
        params,
        headers: {
          Authorization: `Bearer ${CONFIG.ONE_INCH_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data && response.data.tx) {
        console.log(`   💱 1inch quote: ${ethers.formatUnits(response.data.dstAmount, 18)} tokens`);
        return response.data.tx.data;
      }

      return null;
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('     1inch API: No liquidity or invalid pair');
      } else {
        console.error('    1inch API error:', error.message);
      }
      return null;
    }
  }

  /**
   * Monitor and display stats
   */
  async displayStats() {
    try {
      const agentCount = await this.contract.agentCount();
      console.log(` Total Agents: ${agentCount.toString()}`);

      // Get sample agent info
      if (agentCount > 0) {
        const firstAgentId = await this.contract.allAgentIds(0);
        const agent = await this.contract.getAgent(firstAgentId);
        console.log(` Sample Agent: ${agent.ensName}`);
        console.log(`   Active: ${agent.strategy.isActive}`);
        console.log(`   Executions: ${agent.totalExecutions.toString()}`);
      }
    } catch (error) {
      console.error('Error displaying stats:', error.message);
    }
  }

  /**
   * Stop the keeper
   */
  stop() {
    console.log(' Stopping keeper bot...');
    this.isRunning = false;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  // Validate environment variables
  if (!CONFIG.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not set in environment');
  }
  if (!CONFIG.CONTRACT_ADDRESS) {
    throw new Error('CONTRACT_ADDRESS not set in environment');
  }
  if (!CONFIG.ONE_INCH_API_KEY) {
    throw new Error('ONE_INCH_API_KEY not set in environment');
  }

  const keeper = new TradingAgentKeeper();

  // Display initial stats
  await keeper.displayStats();

  // Start keeper
  await keeper.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    keeper.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    keeper.stop();
    process.exit(0);
  });
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default TradingAgentKeeper;