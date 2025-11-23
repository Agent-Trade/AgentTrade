# Agentrade

**Agentrade** is a decentralized autonomous trading platform that enables users to create ENS-named trading agents that execute trades automatically based on real-time price triggers. Built on Base blockchain, it integrates Pyth Network for price feeds, 1inch for optimal swap execution, and Privy for seamless wallet management.

## 🎯 Overview

Agentrade simplifies automated trading on blockchain by providing:

- **Automated Execution**: Trading agents monitor price feeds and execute trades automatically when trigger conditions are met
- **ENS-Named Agents**: Each trading agent gets its own human-readable ENS subname (e.g., `my-agent.agentrade.eth`)
- **Real-Time Price Feeds**: Powered by Pyth Network for accurate, low-latency price data
- **Optimal Swaps**: Integrated with 1inch aggregation protocol for best execution rates
- **Non-Custodial**: Users maintain full control with Privy embedded wallets
- **Gasless Transactions**: Support for sponsored transactions via Privy

## ✨ Key Features

### 1. Automated Trading Agents
Create trading agents with custom strategies:
- Price-based triggers (above/below threshold)
- Configurable cooldown periods
- Multi-asset support
- Real-time monitoring

### 2. ENS Integration
- Each agent receives a unique ENS subname
- Human-readable agent identification
- Easy sharing and discovery

### 3. Price Feed Integration
- Real-time price data from Pyth Network
- Support for multiple assets (ETH, BTC, USDC, etc.)
- On-chain price updates
- Price validation before execution

### 4. 1inch Swap Execution
- Best price routing across multiple DEXs
- Automatic slippage protection
- Token approval management
- Gas-optimized transactions

### 5. Background Monitoring
- Automated price checking service
- Trigger detection and execution
- Cron job support (Vercel)
- Execution history tracking

### 6. User-Friendly Interface
- Modern, responsive dashboard
- Agent creation wizard
- Real-time status monitoring
- Transaction history

## 🏗️ Architecture

### Smart Contracts

**TradingAgentRegistry** (`contracts/src/TradingAgentRegistry.sol`)
- Manages trading agents and their strategies
- Integrates with Pyth for price feeds
- Handles ENS subname creation
- Validates and executes triggers

**PythPriceConsumer** (`contracts/src/PythPriceConsumer.sol`)
- Consumes Pyth price feeds on-chain
- Provides price data to agents

### Frontend

**Next.js Application** (`frontend/`)
- React-based user interface
- Wagmi for blockchain interactions
- Privy for authentication and wallet management
- Real-time agent monitoring

### Services

- **Agent Monitor**: Background service for checking triggers
- **Agent Executor**: On-chain execution handler
- **1inch Service**: Swap execution and quote fetching
- **Pyth Service**: Price feed integration
- **ENS Service**: Subname management

## 🛠️ Tech Stack

### Smart Contracts
- **Solidity** ^0.8.13
- **Foundry** - Development framework
- **Pyth SDK** - Official Pyth Network integration

### Frontend
- **Next.js** 16.0.3 - React framework
- **React** 19.2.0 - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Wagmi** 3.0.1 - Ethereum React hooks
- **Viem** 2.39.3 - Ethereum utilities
- **Privy** - Authentication and embedded wallets

### Integrations
- **Pyth Network** - Price feeds
- **1inch** - DEX aggregation
- **ENS** - Domain name service
- **Base** - Blockchain network

## 📁 Project Structure

```
agentrade/
├── contracts/              # Smart contracts
│   ├── src/
│   │   ├── TradingAgentRegistry.sol
│   │   └── PythPriceConsumer.sol
│   ├── script/
│   │   └── DeployTradingAgentRegistry.s.sol
│   └── foundry.toml
│
├── frontend/               # Next.js application
│   ├── app/                # Next.js app router
│   │   ├── api/            # API routes
│   │   │   ├── monitor/    # Monitoring service
│   │   │   ├── agent/       # Agent endpoints
│   │   │   └── 1inch/      # 1inch proxy
│   │   ├── dashboard/      # Agent dashboard
│   │   ├── create/         # Agent creation
│   │   └── demos/          # Demo pages
│   ├── components/         # React components
│   ├── lib/                # Utilities and services
│   │   ├── agent/          # Agent management
│   │   ├── 1inch/         # 1inch integration
│   │   ├── ens/            # ENS integration
│   │   └── privy/          # Privy integration
│   └── vercel.json         # Vercel cron config
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm/pnpm
- **Foundry** - [Install Foundry](https://book.getfoundry.sh/getting-started/installation)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd alatfi
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   # or
   pnpm install
   ```

3. **Install contract dependencies**
   ```bash
   cd contracts
   forge install
   ```

### Configuration

1. **Frontend Environment Variables**

   Create `frontend/.env.local`:
   ```bash
   # Privy
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
   
   # 1inch API (Required)
   NEXT_PUBLIC_1INCH_API_KEY=your_1inch_api_key
   
   # RPC URLs
   NEXT_PUBLIC_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_key
   
   # Monitoring (Optional)
   MONITOR_USER_ADDRESSES=0x...,0x...
   MONITOR_CHAIN_ID=84532
   MONITOR_RPC_URL=https://sepolia.base.org
   ```

2. **Contract Deployment**

   Update `contracts/script/DeployTradingAgentRegistry.s.sol` with:
   - Pyth contract address for your chain
   - ENS Registry address
   - Base node (namehash of your parent domain)

   Deploy:
   ```bash
   cd contracts
   forge script script/DeployTradingAgentRegistry.s.sol:DeployTradingAgentRegistry \
     --rpc-url https://sepolia.base.org \
     --chain base-sepolia \
     --broadcast \
     --private-key $PRIVATE_KEY
   ```

3. **Update Contract Addresses**

   After deployment, update `frontend/lib/agent/agent-registry.ts`:
   ```typescript
   export const AGENT_REGISTRY_ADDRESSES: Record<number, Address> = {
     84532: "0x<YOUR_DEPLOYED_ADDRESS>" as Address,
     // ...
   };
   ```

### Running the Application

1. **Start development server**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open browser**
   Navigate to `http://localhost:3000`

3. **Connect wallet**
   - Use Privy login (email, wallet, or Google OAuth)
   - Embedded wallet will be created automatically

## 📖 Usage Guide

### Creating a Trading Agent

1. Navigate to **Create Agent** page
2. Fill in agent details:
   - **Agent Name**: Unique identifier
   - **ENS Label**: Subname label (e.g., "my-agent" → `my-agent.agentrade.eth`)
   - **Price Feed**: Select asset to monitor (ETH, BTC, USDC)
   - **Trigger Price**: Price threshold
   - **Trigger Condition**: Above or below threshold
   - **Tokens**: Input and output tokens
   - **Amount**: Trade amount
   - **Cooldown**: Minimum time between executions

3. Submit transaction
4. Agent is created and ENS subname is registered

### Monitoring Agents

**Dashboard**
- View all your agents
- See current price vs trigger price
- Check trigger status
- Deactivate agents

**Background Monitoring**
- Automated monitoring via cron job
- Checks triggers periodically
- Executes trades when conditions are met

### API Endpoints

**Monitor Agents**
```bash
# Monitor single agent
GET /api/monitor?agentId=0x...&chainId=84532

# Monitor multiple agents
POST /api/monitor
{
  "agentIds": ["0x..."],
  "userAddress": "0x...",
  "chainId": 84532
}

# Cron endpoint (uses env vars)
POST /api/monitor/cron
```

**Agent Information**
```bash
GET /api/agent/[agentId]?chainId=84532
```

## 🔧 Development

### Smart Contracts

**Build**
```bash
cd contracts
forge build
```

**Test**
```bash
forge test
```

**Format**
```bash
forge fmt
```

### Frontend

**Development**
```bash
cd frontend
npm run dev
```

**Build**
```bash
npm run build
```

**Lint**
```bash
npm run lint
```

**Format**
```bash
npm run format
```

## 📡 Monitoring Service

The monitoring service checks agent triggers and executes trades automatically.

### Setup Vercel Cron Job

1. **Configure `vercel.json`** (already configured)
   ```json
   {
     "crons": [
       {
         "path": "/api/monitor/cron",
         "schedule": "*/5 * * * *"
       }
     ]
   }
   ```

2. **Set Environment Variables in Vercel**
   - `MONITOR_USER_ADDRESSES`: Comma-separated user addresses
   - `MONITOR_CHAIN_ID`: Chain ID (default: 84532)
   - `MONITOR_RPC_URL`: Optional custom RPC URL

3. **Deploy to Vercel**
   The cron job will run automatically every 5 minutes.

### Manual Monitoring

```bash
curl -X POST http://localhost:3000/api/monitor \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "0x...", "chainId": 84532}'
```

## 🔐 Security Considerations

- **Private Keys**: Never commit private keys to version control
- **API Keys**: Store in environment variables
- **Contract Addresses**: Verify before use
- **ENS Domain**: Ensure you own the parent domain
- **Gas Fees**: Monitor Pyth update fees
- **Slippage**: Set appropriate slippage tolerance

## 🌐 Supported Networks

- **Base Sepolia** (Testnet) - Chain ID: 84532
- **Base Mainnet** - Chain ID: 8453
- **Ethereum Mainnet** - For ENS operations

## 📚 Documentation

- [1inch Integration](./frontend/lib/1inch/README.md)
- [Contract Deployment](./contracts/script/DeployTradingAgentRegistry.s.sol)
- [Pyth Network Docs](https://docs.pyth.network/)
- [1inch API Docs](https://docs.1inch.io/)
- [ENS Documentation](https://docs.ens.domains/)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **Pyth Network** - Price feed infrastructure
- **1inch** - DEX aggregation
- **ENS** - Domain name service
- **Privy** - Wallet infrastructure
- **Base** - Blockchain network
- **Foundry** - Development framework

## 📧 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with ❤️ for the decentralized trading community**

