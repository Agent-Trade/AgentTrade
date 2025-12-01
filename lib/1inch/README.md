# 1inch Integration

## Overview

This service provides a clean wrapper around the 1inch Aggregation API v6 for token swaps and price quotes.

## Architecture

### Why Not Fusion SDK?

The `@1inch/fusion-sdk` is designed for **Fusion Mode** (intent-based, gasless swaps), while we're using the **Aggregation API** for:
- Direct on-chain swaps
- Best price routing across multiple DEXs
- Immediate execution

The Aggregation API doesn't have a dedicated TypeScript SDK - it's a REST API. Our service provides a clean, type-safe wrapper.

### Service Structure

- **`1inch-service.ts`**: Main service with API wrappers
  - `getSwapQuote()` - Get best swap rates
  - `getSwapTx()` - Get swap transaction data
  - `getTokenAllowance()` - Check approvals
  - `getApprovalTx()` - Get approval transactions

- **`1inch-contract.ts`**: Contract utilities
  - Token address mappings
  - Router address resolution
  - ERC20 ABI definitions

- **`agent-swap-executor.ts`**: Agent integration
  - `executeAgentSwap()` - Execute swaps for trading agents
  - Balance checks and validation
  - Profitability checks

## Usage

```typescript
import { getSwapQuote, getSwapTx } from "@/lib/1inch/1inch-service";

// Get quote
const quote = await getSwapQuote({
  fromTokenAddress: "0x...",
  toTokenAddress: "0x...",
  amount: "1000000000000000000", // 1 token in wei
  fromAddress: "0x...",
  slippage: 1, // 1%
  chainId: 84532,
});

// Get swap transaction
const swapTx = await getSwapTx({
  fromTokenAddress: "0x...",
  toTokenAddress: "0x...",
  amount: "1000000000000000000",
  fromAddress: "0x...",
  slippage: 1,
  chainId: 84532,
});

// Execute swap using wagmi
await writeContract({
  to: swapTx.to,
  data: swapTx.data,
  value: BigInt(swapTx.value),
});
```

## API Key (Required)

⚠️ **API keys are now mandatory** for 1inch API. You must set up an API key before using the service.

### Setup Steps

1. Get your API key from: https://portal.1inch.dev/
2. Create `.env.local` in the `frontend` directory
3. Add: `NEXT_PUBLIC_1INCH_API_KEY=your_api_key_here`
4. Restart your dev server

See `1INCH_API_KEY_SETUP.md` for detailed instructions.

## Future: Fusion Mode

If you want to use Fusion Mode (gasless, intent-based swaps), you can use the `@1inch/fusion-sdk` package that's already installed. Fusion mode requires:
- API key (mandatory)
- Different flow (placeOrder instead of direct swap)
- Better for gasless transactions

## Notes

- The service uses Aggregation API v6 for optimal routing
- All functions are async and return Promises
- Error handling is built-in with descriptive messages
- Type-safe with TypeScript interfaces

