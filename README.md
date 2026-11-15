# Super Tracker

Solana memecoin analysis on one page. Paste a token mint address and get:

- **Price chart**: candles from 1 minute to 1 week, plus price, market cap and liquidity (Birdeye).
- **Organic market score**: 0–100 from fee activity, trader diversity, buy/sell balance and volume consistency.
- **Top 10 holders**: liquidity pools, bundled wallets and possible insiders flagged; each holder's entry, sells, PnL and whole-wallet overview (Helius, Jupiter).

## Stack

Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, shadcn/ui, TanStack React Query, lightweight-charts.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your keys
npm run dev            # http://localhost:3000
```

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_BIRDEYE_API_URL` | Birdeye base URL, e.g. `https://public-api.birdeye.so` |
| `NEXT_PUBLIC_BIRDEYE_API_KEY` | Token overview and OHLCV |
| `NEXT_PUBLIC_HELIUS_API_KEY` | Holders, wallet history, portfolio |

> These keys are currently read in the browser, so they are visible to anyone using the site. Moving the API calls into Route Handlers is the next planned step.

## Scripts

- `npm run dev`: development server
- `npm run build`: production build
- `npm run lint`: ESLint
- `npx tsc --noEmit`: type check
