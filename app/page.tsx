import Link from "next/link";
import { Navigation } from "@/components/navigation";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-6 py-32 lg:py-40">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
            </span>
            Automated Trading Infrastructure
          </div>
          
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            No Complexity.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Just Secure
            </span>{" "}
            wallet infrastructure
            <br />
            for{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Automated Trading
            </span>
          </h1>
          
          <p className="mx-auto mt-8 max-w-2xl text-xl leading-8 text-gray-300">
            Create ENS-named autonomous trading agents that execute trades
            automatically based on price triggers. Gasless, seamless, and fully
            automated.
          </p>
          
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-indigo-500/50 transition-all duration-300 hover:scale-105 hover:shadow-indigo-500/75"
            >
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-700 opacity-0 transition-opacity group-hover:opacity-100"></div>
            </Link>
            <Link
              href="/create"
              className="rounded-xl border-2 border-gray-700 bg-gray-900/50 px-8 py-4 text-base font-semibold text-gray-200 backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/50 hover:bg-gray-800/50 hover:text-white"
            >
              Create Agent
            </Link>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="border-y border-gray-800/50 bg-gradient-to-b from-gray-900/40 to-transparent backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-5xl font-bold text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text">$0</div>
              <div className="mt-3 text-base font-medium text-gray-400">
                Total Transaction Volume
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text">0</div>
              <div className="mt-3 text-base font-medium text-gray-400">
                Wallets Created
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text">0</div>
              <div className="mt-3 text-base font-medium text-gray-400">
                Total Transactions
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Core Features
          </h2>
          <p className="mt-6 text-xl leading-8 text-gray-300">
            Plug-and-play APIs, non-custodial wallets, gasless transactions,
            and automated execution — simplifying blockchain complexity so you
            can focus on your trading strategies.
          </p>
        </div>

        <div className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:max-w-none lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/80 to-gray-950/80 p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-purple-500/0 to-pink-500/0 opacity-0 transition-opacity group-hover:opacity-10"></div>
              <div className="relative">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 shadow-lg">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                <p className="mt-3 text-base leading-7 text-gray-400">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-6 py-32">
        <div className="relative overflow-hidden rounded-3xl border border-gray-800/50 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-12 backdrop-blur-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)]"></div>
          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-bold text-white sm:text-5xl">
              Ready to Get Started?
            </h2>
            <p className="mt-6 text-xl text-gray-300">
              Create your first automated trading agent in minutes
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/create"
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-indigo-500/50 transition-all duration-300 hover:scale-105"
              >
                Create Your First Agent
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border-2 border-gray-700 bg-gray-900/50 px-8 py-4 text-base font-semibold text-gray-200 backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/50 hover:text-white"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section
        id="use-cases"
        className="border-y border-gray-800/50 bg-gradient-to-b from-transparent to-gray-900/40"
      >
        <div className="mx-auto max-w-7xl px-6 py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Use Cases
            </h2>
            <p className="mt-6 text-xl leading-8 text-gray-300">
              Learn how traders use automated agents to execute strategies
              that can be tailored to market conditions but also built to scale
              across assets.
            </p>
          </div>

          <div className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-2">
            {useCases.map((useCase, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/80 to-gray-950/80 p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-purple-500/0 to-pink-500/0 opacity-0 transition-opacity group-hover:opacity-10"></div>
                <div className="relative">
                  <h3 className="text-2xl font-bold text-white">{useCase.title}</h3>
                  <p className="mt-4 text-base leading-7 text-gray-400">
                    {useCase.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 bg-[#0a0a0f]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="pt-8">
            <p className="text-center text-sm text-gray-500">
              Built with Privy, Pyth Network, 1inch, ENS, and Filecoin
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    title: "Automated Execution",
    description: "Execute trades automatically when price triggers are met, even when you're offline.",
    icon: (
      <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    title: "Gasless Transactions",
    description: "Enable seamless transactions with sponsored network fees, abstracting away the friction.",
    icon: (
      <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l3.182 3.182 3.182-3.182M12 6L8.818 8.818 12 11.636m0-5.636l3.182 2.182L12 11.636" />
      </svg>
    ),
  },
  {
    title: "ENS-Named Agents",
    description: "Each trading agent gets its own ENS subname for easy identification and sharing.",
    icon: (
      <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    title: "Price Triggers",
    description: "Set automated buy/sell orders based on real-time price feeds from Pyth Network.",
    icon: (
      <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    title: "Non-Custodial Wallets",
    description: "Users maintain full control of their funds with embedded wallets powered by Privy.",
    icon: (
      <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "1inch Integration",
    description: "Execute swaps with best rates using 1inch's aggregation protocol.",
    icon: (
      <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-3.75v3.75m-3 .75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
];

const useCases = [
  {
    title: "Automated DCA (Dollar Cost Averaging)",
    description: "Set up recurring purchases at regular intervals or when prices drop by a certain percentage, automating your accumulation strategy.",
  },
  {
    title: "Price-Based Triggers",
    description: "Automatically buy or sell when assets hit target prices, using real-time price feeds from Pyth Network for accurate execution.",
  },
  {
    title: "Stop-Loss Protection",
    description: "Protect your positions with automated stop-loss orders that execute instantly when prices fall below your threshold.",
  },
  {
    title: "Multi-Asset Strategies",
    description: "Create complex trading strategies that interact with multiple assets and chains, all managed through named ENS agents.",
  },
];
