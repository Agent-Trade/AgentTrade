"use client";

import { useCallback, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth";
import { useLoginWithOAuth } from "@privy-io/react-auth";
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard";
import { Toast } from "@/components/toast";

export function AuthButton() {
  // All hooks must be called at the top level, before any conditional returns
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { initOAuth, loading: isOAuthLoading, state } = useLoginWithOAuth();
  const { copy, copied } = useCopyToClipboard();
  const [showToast, setShowToast] = useState(false);

  // Memoize wallet lookup
  const embeddedWallet = useMemo(
    () => wallets.find((w) => w.walletClientType === "privy"),
    [wallets]
  );

  const walletAddress = embeddedWallet?.address;

  // Memoize display address
  const displayAddress = useMemo(() => {
    if (!walletAddress) return "No wallet";
    return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  }, [walletAddress]);

  // Memoize copy handler
  const handleCopyAddress = useCallback(async () => {
    if (!walletAddress) return;
    try {
      await copy(walletAddress);
      setShowToast(true);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  }, [walletAddress, copy]);

  // Early returns after all hooks
  if (!ready) {
    return (
      <div className="rounded-lg bg-gray-800 px-4 py-2 text-gray-400">
        Loading...
      </div>
    );
  }

  if (!authenticated) {
    const handleGoogleLogin = async () => {
      try {
        if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
          alert("Privy App ID is not configured. Please set NEXT_PUBLIC_PRIVY_APP_ID in your .env file.");
          return;
        }
        
        console.log("Initiating Google OAuth...", { 
          appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID?.substring(0, 10) + "...",
          state: state 
        });
        
        await initOAuth({ provider: "google" });
        console.log("OAuth initiated successfully");
      } catch (error) {
        console.error("Google login failed:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Google login failed: ${errorMessage}\n\nMake sure:\n1. Google OAuth is enabled in Privy Dashboard\n2. Redirect URIs are configured\n3. Your app ID is correct`);
      }
    };

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={login}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/50"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopyAddress}
          className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 px-3 py-1.5 backdrop-blur-sm shadow-lg shadow-green-500/10 transition-all duration-300 hover:border-green-500/40 hover:shadow-xl hover:shadow-green-500/20 active:scale-95"
          title="Click to copy full address"
        >
          <div className="relative h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400"></span>
          </div>
          <span className="font-mono text-xs font-semibold text-green-400">
            {displayAddress}
          </span>
          <svg
            className="h-3.5 w-3.5 text-green-400/60 transition-all duration-300 group-hover:text-green-400 group-hover:scale-110"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
            />
          </svg>
        </button>
        <button
          onClick={logout}
          className="rounded-xl border border-gray-700/50 bg-gray-800/50 px-3 py-1.5 text-xs font-semibold text-gray-300 backdrop-blur-sm transition-all duration-300 hover:bg-gray-700/50 hover:border-gray-600 hover:text-white"
        >
          Logout
        </button>
      </div>
      {showToast && (
        <Toast
          message="Address copied to clipboard!"
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  );
}

