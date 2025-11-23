"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "@/components/auth-button";
import { ChainSwitcher } from "@/components/chain-switcher";

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="border-b border-gray-800/50 bg-[#0a0a0f]/95 backdrop-blur-xl sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="group flex items-center gap-3 text-xl font-bold text-white transition-all duration-300 hover:text-indigo-400"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-lg shadow-indigo-500/50 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-indigo-500/75">
              <span className="relative z-10 text-sm font-bold text-white">A</span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 opacity-0 transition-opacity group-hover:opacity-100"></div>
            </div>
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-indigo-400 group-hover:to-purple-400 transition-all duration-300">AgentTrade</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/dashboard"
              className={`
                relative px-4 py-2 text-sm font-semibold transition-all duration-300
                ${isActive("/dashboard")
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
                }
              `}
            >
              <span className="relative z-10">Dashboard</span>
              {isActive("/dashboard") && (
                <>
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                  <span className="absolute inset-0 rounded-lg bg-indigo-500/10 -z-0" />
                </>
              )}
              {!isActive("/dashboard") && (
                <span className="absolute inset-0 rounded-lg bg-gray-800/30 opacity-0 hover:opacity-100 transition-opacity -z-0" />
              )}
            </Link>
            <Link
              href="/create"
              className={`
                relative px-4 py-2 text-sm font-semibold transition-all duration-300
                ${isActive("/create")
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
                }
              `}
            >
              <span className="relative z-10">Create Agent</span>
              {isActive("/create") && (
                <>
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                  <span className="absolute inset-0 rounded-lg bg-indigo-500/10 -z-0" />
                </>
              )}
              {!isActive("/create") && (
                <span className="absolute inset-0 rounded-lg bg-gray-800/30 opacity-0 hover:opacity-100 transition-opacity -z-0" />
              )}
            </Link>
            <Link
              href="/demos"
              className={`
                relative px-4 py-2 text-sm font-semibold transition-all duration-300
                ${isActive("/demos")
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
                }
              `}
            >
              <span className="relative z-10">Demos</span>
              {isActive("/demos") && (
                <>
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                  <span className="absolute inset-0 rounded-lg bg-indigo-500/10 -z-0" />
                </>
              )}
              {!isActive("/demos") && (
                <span className="absolute inset-0 rounded-lg bg-gray-800/30 opacity-0 hover:opacity-100 transition-opacity -z-0" />
              )}
            </Link>
          </div>

          {/* Right Side - Chain Switcher, Auth & Mobile Menu */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <ChainSwitcher />
              <AuthButton />
            </div>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-lg p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800/50 py-4 space-y-2">
            <MobileNavLink 
              href="/dashboard" 
              isActive={isActive("/dashboard")}
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </MobileNavLink>
            <MobileNavLink 
              href="/create" 
              isActive={isActive("/create")}
              onClick={() => setMobileMenuOpen(false)}
            >
              Create Agent
            </MobileNavLink>
            <MobileNavLink 
              href="/demos" 
              isActive={isActive("/demos")}
              onClick={() => setMobileMenuOpen(false)}
            >
              Demos
            </MobileNavLink>
            <div className="pt-2 border-t border-gray-800/50 space-y-2">
              <div className="px-4">
                <ChainSwitcher />
              </div>
              <div className="px-4">
                <AuthButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function MobileNavLink({
  href,
  isActive,
  onClick,
  children,
}: {
  href: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        block px-4 py-2 rounded-lg text-sm font-medium transition-colors
        ${isActive
          ? "bg-indigo-500/20 text-indigo-400 border-l-2 border-indigo-500"
          : "text-gray-400 hover:text-white hover:bg-gray-800/50"
        }
      `}
    >
      {children}
    </Link>
  );
}

function NavLink({ 
  href, 
  isActive, 
  children 
}: { 
  href: string; 
  isActive: boolean; 
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`
        relative px-4 py-2 text-sm font-medium transition-all duration-200
        ${isActive 
          ? "text-white" 
          : "text-gray-400 hover:text-white"
        }
      `}
    >
      <span className="relative z-10">{children}</span>
      {isActive && (
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
      )}
      {!isActive && (
        <span className="absolute inset-0 rounded-lg bg-gray-800/50 opacity-0 hover:opacity-100 transition-opacity -z-0" />
      )}
    </Link>
  );
}

