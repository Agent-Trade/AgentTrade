// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {TradingAgentRegistry} from "../src/TradingAgentRegistry.sol";

/**
 * @title DeployTradingAgentRegistry
 * @notice Deployment script for TradingAgentRegistry contract
 * 
 * Usage:
 *   forge script script/DeployTradingAgentRegistry.s.sol:DeployTradingAgentRegistry --rpc-url $RPC_URL --broadcast --verify
 * 
 * Environment variables (or use defaults):
 *   PYTH_ADDRESS - Pyth contract address (defaults provided)
 *   ENS_REGISTRY_ADDRESS - ENS Registry address (default: 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e)
 *   BASE_NODE - Parent ENS domain node (namehash of parent domain)
 *   PRIVATE_KEY - Private key for deployment
 */
contract DeployTradingAgentRegistry is Script {
    // Default addresses
    address constant BASE_SEPOLIA_PYTH = 0x2880aB155794e7179c9eE2e38200202908C17B43;
    address constant BASE_MAINNET_PYTH = 0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a;
    address constant ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;
    
    // Default base node for "agenttrade.eth" (calculate with: cast namehash "agenttrade.eth")
    // If you don't have this domain, you'll need to calculate your own or use a test value
    bytes32 constant DEFAULT_BASE_NODE = 0x0000000000000000000000000000000000000000000000000000000000000000;

    function run() external {
        // No need to fetch private key from env; Forge injects it when using --private-key or default key
        
        // Get chain ID to determine Pyth address
        uint256 chainId = block.chainid;
        address pythAddress;
        
        if (chainId == 84532) {
            // Base Sepolia
            pythAddress = vm.envOr("PYTH_ADDRESS", BASE_SEPOLIA_PYTH);
        } else if (chainId == 8453) {
            // Base Mainnet
            pythAddress = vm.envOr("PYTH_ADDRESS", BASE_MAINNET_PYTH);
        } else {
            // Try to get from env, otherwise revert
            pythAddress = vm.envAddress("PYTH_ADDRESS");
        }
        
        address ensRegistryAddress = vm.envOr("ENS_REGISTRY_ADDRESS", ENS_REGISTRY);
        
        // Try to get base node from env, otherwise use default (you MUST update this!)
        bytes32 baseNode = vm.envOr("BASE_NODE", DEFAULT_BASE_NODE);
        
        // Warn if using default base node
        if (baseNode == DEFAULT_BASE_NODE) {
            console.log("WARNING: Using default base node (all zeros).");
            console.log("You MUST calculate the namehash of your parent ENS domain!");
            console.log("Use: cast namehash \"yourdomain.eth\"");
            console.log("Or visit: https://swolfeyes.github.io/ethereum-name-service-calculator/");
        }

        console.log("Deploying TradingAgentRegistry...");
        console.log("Chain ID:", chainId);
        console.log("Pyth Address:", pythAddress);
        console.log("ENS Registry Address:", ensRegistryAddress);
        console.log("Base Node:");
        console.logBytes32(baseNode);

        vm.startBroadcast();

        TradingAgentRegistry registry = new TradingAgentRegistry(
            pythAddress,
            ensRegistryAddress,
            baseNode
        );

        vm.stopBroadcast();

        console.log("\n=== Deployment Successful ===");
        console.log("Contract Address:", address(registry));
        console.log("\nUpdate frontend/lib/agent/agent-registry.ts with:");
    }
}

