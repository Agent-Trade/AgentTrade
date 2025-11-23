"use client";

import { useState, useRef, useEffect } from "react";
import { useChainId, useSwitchChain, useChains } from "wagmi";
import { baseSepolia, base, mainnet } from "wagmi/chains";

const SUPPORTED_CHAINS = [baseSepolia, base, mainnet];

export function ChainSwitcher() {
  const chainId = useChainId();
  const chains = useChains();
  const { switchChain, isPending } = useSwitchChain();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentChain = chains.find((c) => c.id === chainId) || baseSepolia;

  const handleSwitchChain = (targetChainId: number) => {
    if (targetChainId !== chainId) {
      switchChain({ chainId: targetChainId });
      setIsOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-gray-700/50 bg-gray-800/50 px-3 py-1.5 text-xs font-semibold text-gray-300 backdrop-blur-sm transition-all duration-300 hover:bg-gray-700/50 hover:border-gray-600 hover:text-white"
        disabled={isPending}
      >
        <div className={`h-2 w-2 rounded-full ${getChainColor(currentChain.id)} shadow-lg`} />
        <span className="hidden sm:inline">
          {currentChain.name}
        </span>
        <span className="sm:hidden">
          {getChainShortName(currentChain.id)}
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden">
          <div className="py-2">
            {SUPPORTED_CHAINS.map((chain) => {
              const isActive = chain.id === chainId;
              return (
                <button
                  key={chain.id}
                  onClick={() => handleSwitchChain(chain.id)}
                  disabled={isActive || isPending}
                  className={`
                    w-full px-4 py-3 text-left transition-all duration-200
                    ${isActive
                      ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-400 cursor-default border-l-2 border-indigo-500"
                      : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                    }
                    ${isPending ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${getChainColor(chain.id)} shadow-lg`} />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{chain.name}</div>
                      <div className="text-xs text-gray-500 font-mono">Chain ID: {chain.id}</div>
                    </div>
                    {isActive && (
                      <svg
                        className="h-5 w-5 text-indigo-400"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getChainColor(chainId: number): string {
  switch (chainId) {
    case 84532: // Base Sepolia
      return "bg-yellow-400";
    case 8453: // Base
      return "bg-blue-400";
    case 1: // Mainnet
      return "bg-green-400";
    default:
      return "bg-gray-400";
  }
}

function getChainShortName(chainId: number): string {
  switch (chainId) {
    case 84532:
      return "Base Sepolia";
    case 8453:
      return "Base";
    case 1:
      return "Mainnet";
    default:
      return "Unknown";
  }
}

