"use client";

import { useState } from "react";
import { useConnection, useChainId, useWriteContract } from "wagmi";
import {
  getSwapQuote,
  formatTokenAmount,
  parseTokenAmount,
  ONEINCH_CHAINS,
} from "@/lib/1inch/1inch-service";
import { getTokenAddress } from "@/lib/1inch/1inch-contract";
import { executeAgentSwap, AgentSwapConfig } from "@/lib/1inch/agent-swap-executor";

export function OneInchSwapDemo() {
  const { address } = useConnection();
  const chainId = useChainId();
  const { writeContract } = useWriteContract();

  const [fromToken, setFromToken] = useState("WETH");
  const [toToken, setToToken] = useState("USDC");
  const [amount, setAmount] = useState("0.1");
  const [slippage, setSlippage] = useState(1);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<string>("");

  const currentChainId = chainId || ONEINCH_CHAINS.BASE_SEPOLIA;

  const fetchQuote = async () => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const fromTokenAddress =
        fromToken.startsWith("0x") && fromToken.length === 42
          ? fromToken
          : getTokenAddress(fromToken, currentChainId);

      const toTokenAddress =
        toToken.startsWith("0x") && toToken.length === 42
          ? toToken
          : getTokenAddress(toToken, currentChainId);

      if (!fromTokenAddress || !toTokenAddress) {
        setResult("Error: Invalid token address");
        return;
      }

      const amountWei = parseTokenAmount(parseFloat(amount), 18);

      const quoteData = await getSwapQuote({
        fromTokenAddress,
        toTokenAddress,
        amount: amountWei,
        fromAddress: address,
        slippage,
        chainId: currentChainId,
      });

      setQuote(quoteData);
      setResult(
        `Quote: ${formatTokenAmount(
          quoteData.toTokenAmount,
          quoteData.toToken.decimals
        )} ${quoteData.toToken.symbol}`
      );
    } catch (error: any) {
      console.error("Error fetching quote:", error);
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const executeSwap = async () => {
    if (!address || !quote) {
      alert("Please fetch a quote first");
      return;
    }

    setExecuting(true);
    setResult("");

    try {
      const config: AgentSwapConfig = {
        agentId: "demo",
        fromToken,
        toToken,
        amount: parseFloat(amount),
        slippage,
        chainId: currentChainId,
        walletAddress: address,
      };

      const swapResult = await executeAgentSwap(config, writeContract);

      if (swapResult.success) {
        setResult(
          `Swap successful! TX: ${swapResult.txHash}\nOutput: ${formatTokenAmount(
            swapResult.outputAmount || "0",
            quote.toToken.decimals
          )} ${quote.toToken.symbol}`
        );
      } else {
        setResult(`Swap failed: ${swapResult.error}`);
      }
    } catch (error: any) {
      console.error("Error executing swap:", error);
      setResult(`Error: ${error.message}`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 shadow-lg">
      <h3 className="mb-6 text-2xl font-semibold text-white">
        1inch Swap Demo
      </h3>

      <div className="space-y-4">
        {/* Token Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              From Token
            </label>
            <input
              type="text"
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              placeholder="WETH"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              To Token
            </label>
            <input
              type="text"
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              placeholder="USDC"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Amount and Slippage */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.1"
              step="0.01"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Slippage (%)
            </label>
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(parseFloat(e.target.value))}
              placeholder="1"
              step="0.1"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Quote Display */}
        {quote && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
            <div className="mb-2 text-base font-medium text-gray-400">
              Swap Quote
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Input:</span>
                <span className="text-white">
                  {formatTokenAmount(
                    quote.fromTokenAmount,
                    quote.fromToken.decimals
                  )}{" "}
                  {quote.fromToken.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Output:</span>
                <span className="text-white">
                  {formatTokenAmount(
                    quote.toTokenAmount,
                    quote.toToken.decimals
                  )}{" "}
                  {quote.toToken.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated Gas:</span>
                <span className="text-white">{quote.estimatedGas}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={fetchQuote}
            disabled={loading || !address}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-base font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Fetching..." : "Get Quote"}
          </button>
          <button
            onClick={executeSwap}
            disabled={!quote || executing || !address}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-base font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            {executing ? "Executing..." : "Execute Swap"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
            <div className="text-sm text-white whitespace-pre-wrap">
              {result}
            </div>
          </div>
        )}

        {!address && (
          <div className="rounded-lg bg-gray-800/50 p-4 text-base text-gray-400">
            Connect your wallet to use 1inch swaps
          </div>
        )}
      </div>
    </div>
  );
}

