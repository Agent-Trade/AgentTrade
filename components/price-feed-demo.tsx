"use client";

import { useState } from "react";
import { useConnection, useChainId, useWriteContract, useReadContract } from "wagmi";
import { getPythContractAddress, getPriceFeedId } from "@/lib/privy/pyth-contract";
import {
  getLatestPriceFromHermes,
  formatPrice,
  fetchBinaryPriceUpdates,
} from "@/lib/privy/pyth-service";
import { parseAbi } from "viem";

const PYTH_ABI = parseAbi([
  "function getPrice(bytes32 id) external view returns ((int64 price, uint64 conf, int32 expo, uint256 publishTime))",
  "function updatePriceFeeds(bytes[] calldata updateData) external payable",
]);

export function PriceFeedDemo() {
  const { address } = useConnection();
  const chainId = useChainId();
  const [selectedAsset, setSelectedAsset] = useState<"ETH" | "BTC">("ETH");
  const [hermesPrice, setHermesPrice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const priceFeedId = getPriceFeedId(selectedAsset);
  const pythAddress = getPythContractAddress(chainId);

  // Read price from on-chain Pyth contract
  const { data: onChainPrice, refetch: refetchPrice } = useReadContract({
    address: pythAddress,
    abi: PYTH_ABI,
    functionName: "getPrice",
    args: [priceFeedId],
    query: {
      enabled: !!pythAddress && !!priceFeedId,
    },
  });

  // Write contract for updating prices
  const { writeContract, isPending } = useWriteContract();

  const fetchFromHermes = async () => {
    setLoading(true);
    try {
      const price = await getLatestPriceFromHermes(priceFeedId);
      setHermesPrice(price);
    } catch (error) {
      console.error("Error fetching from Hermes:", error);
      alert("Failed to fetch price from Hermes. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const formatOnChainPrice = () => {
    if (!onChainPrice) return "N/A";
    // onChainPrice is an object: { price, conf, expo, publishTime }
    const price = (onChainPrice as any).price as bigint;
    const expo = (onChainPrice as any).expo as number;
    return formatPrice(price, expo).toFixed(2);
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 shadow-lg">
      <h3 className="mb-6 text-2xl font-semibold text-white">
        Pyth Price Feed Demo
      </h3>

      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setSelectedAsset("ETH")}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${
            selectedAsset === "ETH"
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          ETH/USD
        </button>
        <button
          onClick={() => setSelectedAsset("BTC")}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${
            selectedAsset === "BTC"
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          BTC/USD
        </button>
      </div>

      <div className="space-y-4">
        {/* On-chain Price */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
          <div className="mb-2 text-sm font-medium text-gray-400">
            On-Chain Price (from Pyth Contract)
          </div>
          <div className="text-3xl font-bold text-white">
            ${formatOnChainPrice()}
          </div>
          <button
            onClick={() => refetchPrice()}
            className="mt-2 text-sm text-indigo-400 hover:text-indigo-300"
          >
            Refresh
          </button>
        </div>

        {/* Hermes API Price */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">
              Latest Price (from Hermes API)
            </span>
            <button
              onClick={fetchFromHermes}
              disabled={loading}
              className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Fetching..." : "Fetch from Hermes"}
            </button>
          </div>
          {hermesPrice ? (
            <div>
              <div className="text-3xl font-bold text-white">
                ${formatPrice(BigInt(hermesPrice.price), hermesPrice.expo).toFixed(2)}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Confidence: ±${formatPrice(BigInt(hermesPrice.conf), hermesPrice.expo).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">
                Updated: {new Date(hermesPrice.publishTime * 1000).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Click "Fetch from Hermes" to get latest price</div>
          )}
        </div>

        {/* Update Price Button */}
        <div className="rounded-lg border border-yellow-800/50 bg-yellow-900/10 p-4">
          <div className="mb-2 text-sm font-medium text-yellow-400">
            Update Price On-Chain
          </div>
          <p className="mb-4 text-xs text-gray-400">
            Step 1: Fetch from Hermes (above) → Step 2: Update on-chain
            <br />
            This will fetch binary update data and call updatePriceFeeds
          </p>
          <button
            onClick={async () => {
              if (!address) {
                alert("Please connect your wallet first");
                return;
              }
              setUpdating(true);
              try {
                // Fetch binary update data from Hermes
                if (!chainId) {
                  throw new Error("Chain ID not available");
                }
                const binaryUpdates = await fetchBinaryPriceUpdates(
                  [priceFeedId],
                  chainId
                );

                // Call updatePriceFeeds on the Pyth contract
                if (!pythAddress) {
                  throw new Error("Pyth contract address not available");
                }
                await writeContract({
                  address: pythAddress,
                  abi: PYTH_ABI,
                  functionName: "updatePriceFeeds",
                  args: [binaryUpdates],
                  value: BigInt(0), // May need to pay for update fees
                });

                // Refresh the on-chain price after update
                setTimeout(() => {
                  refetchPrice();
                }, 2000);
              } catch (error) {
                console.error("Error updating price:", error);
                alert(`Failed to update price: ${error instanceof Error ? error.message : String(error)}`);
              } finally {
                setUpdating(false);
              }
            }}
            disabled={!hermesPrice || isPending || updating || !address}
            className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-500 disabled:opacity-50"
          >
            {updating || isPending ? "Updating..." : "Update Price On-Chain"}
          </button>
        </div>
      </div>

      {!address && (
        <div className="mt-4 rounded-lg bg-gray-800/50 p-4 text-sm text-gray-400">
          Connect your wallet to interact with Pyth contracts
        </div>
      )}
    </div>
  );
}

