# Session handoff: Super Tracker

Last updated: 15 November 2026. Branch `feat/nextjs-migration`, commit `59340b3`.

## 1. What the project is

Super Tracker is a Solana memecoin analysis tool. In the owner's words: save memecoin traders time. Whatever they would check across several sites, they get by pasting one token address here.

For a pasted mint address, the page shows:

- **Token summary and price chart:** name, logo, price, market cap, liquidity, and candlesticks from 1 minute to 1 week (Birdeye).
- **Organic market score (0–100):** four signals.
  - Fees compared with market cap: up to 30 points.
  - Unique wallets per $1k of volume: up to 30 points.
  - Buy and sell balance: up to 20 points.
  - 1m compared with 5m volume (spike detection): up to 20 points.

  It also catches Birdeye's "backfilled" windows on very new tokens and warns the user. The thresholds are heuristics and haven't been tested against real data.
- **Top 10 holders:**
  - Each holder can be a liquidity pool, a bundled wallet (with a bundle-risk score) or a possible insider (no market buy found).
  - Expanding a holder shows their entry, current position, PnL, every sell with a Solscan link, and the rest of their wallet: value, largest holdings, and PnL over 1, 3, 6 and 12 months (Helius and Jupiter).

The repo is `github.com/dav3exe/super-tracker` and is **public**.

## 2. Stack and structure

- Next.js 16.4 (App Router, Turbopack, `cacheComponents` and `partialPrefetching` on, as the starter sets them), React 19.3, TypeScript strict.
- Tailwind CSS 4, shadcn/ui (style `radix-nova`, the `cn` package), lucide icons, sonner for toasts.
- TanStack React Query 5 (key factory in `src/lib/query-keys.ts`), axios, lightweight-charts 5.
- Dark-only theme. Near-black base, lime accent `oklch(0.91 0.21 125)` (the original `hsl(75 94% 57%)`), frosted glass panels (the `glass` and `glass-inset` utilities in `src/app/globals.css`) over a fixed ambient glow. The owner asked for the glass look explicitly.

```
src/
  app/          layout, page, providers (React Query, tooltip, toaster), error, not-found, globals.css
  components/   token-dashboard, token-search, token-summary, price-chart, organic-market-check,
                top-holders, holder-row, wallet-overview-panel, panel, stat, notice, copy-address, token-logo
  components/ui shadcn components
  context/      token-context (only the submitted address)
  hooks/        use-token-overview (useActiveToken), use-price-chart, use-top-holders,
                use-trade-history, use-wallet-overview
  services/     token-overview, price-chart, top-holders, wallet-overview (the API logic)
  lib/          birdeye and helius clients, format, format-time, token-validation, query-keys,
                organic/safe-metrics, organic/detect-organic-market
  types/        birdeye, helius, holders
```

Token state comes from one query. `useActiveToken()` returns `{ token, status: idle | loading | error | invalid | ready }` from a single Birdeye overview request. The chart and holders mount only when the status is `ready`.

## 3. What has been done

1. **Reviewed the original Vite app** and confirmed the vision with the owner.
2. **Migrated Vite to Next.js 16 App Router.**
   - Removed React Router, react-helmet, the theme context, and the copied `vercel.json` (it pointed at an unrelated "eventra" backend).
   - Removed dead code: `lol.tsx`, `BitqueryChart.tsx` (which held a hardcoded token) and `useEntryPrice`.
   - Typed every API response, so there's no `any`. Renamed files to kebab-case.
3. **Redesigned the UI** using the `impeccable` and `frontend-design` skills.
   - Glass panels, a structured holder list, signal meters, and loading, empty and error states throughout.
   - Readable tiny prices (`0.0₅2405`), copy-address with a toast, and a mobile-first layout.
4. **Fixed bugs found during the migration.**
   - Birdeye rejected the lowercase interval codes `1h/4h/1d/1w` with a 400. They're now `1H/4H/1D/1W`.
   - "Load full history" dropped the sells the quick scan had found. The full scan is now a mutation that keeps them (`rawSells`) and writes into the quick scan's cache entry.
   - The trade-history query key now includes its inputs (`currentBalance`, `mintCreatedAt`, `totalSupply`).
   - Negative unrealised PnL showed a `+` sign.
   - Mouse-wheel zoom on the chart trapped page scroll. It's now off; drag and pinch still work.
5. **Renamed env vars** to `NEXT_PUBLIC_BIRDEYE_API_URL`, `NEXT_PUBLIC_BIRDEYE_API_KEY` and `NEXT_PUBLIC_HELIUS_API_KEY`. Added `.env.example` and a README. Wired `@tanstack/eslint-plugin-query` into ESLint.

### Verification at commit `59340b3`

- `npx tsc --noEmit`, `npm run lint` and `npm run build`: all pass.
- Checked in the browser at 1440px, 800px and 375px: no sideways scroll.
- Tested with real data:
  - BONK: summary, chart and the 15m and 1H intervals.
  - A small pump.fun token: holders, LP and bundle badges, an expanded insider holder, and the whole-wallet panel.
  - The EVM-address and malformed-address error messages.
- **Untested:**
  - The holder detail with real trades (entry, position, PnL, sells table, "Load full history"). Every holder opened was an insider.
  - Full keyboard-only and screen-reader passes.

## 4. Planned fixes, in priority order

Each was confirmed live or found in code review. None is fixed yet.

1. **Unbounded Helius scans on large tokens (urgent: burns credits).**
   - `getPoolAddressesForMint` pages through every token account (1000 per page), with a `getMultipleAccounts` call per page.
   - `getMintCreationTimestamp` pages through every signature of the mint.
   - On BONK this made hundreds of requests and only stopped on a page reload.
   - Fix: cap the work, identify pools another way (e.g. the program owner of the top accounts only), and make both scans cancellable.
   - Also check whether `getMultipleAccounts` accepts 1000 keys. The RPC limit is believed to be 100, in which case pool detection fails without an error.
2. **Move the API calls behind Route Handlers** (`app/api/**/route.ts`) so the keys stay on the server. Today the `NEXT_PUBLIC_*` keys ship in the browser bundle.
3. **SOL price is always the fallback.** Jupiter `price/v3?ids=SOL` returns `{}` (confirmed). Use the wSOL mint `So11111111111111111111111111111111111111112`. The cached SOL price also never refreshes during a session.
4. **USD accuracy.**
   - Entry price, USD spent, realised PnL and entry market cap all use today's SOL price, not the price at trade time.
   - SOL spent is computed two ways. `buildTradeHistory` sums every outgoing transfer, including fees, tips and rent. `getWalletPnlWindow` takes the largest single transfer. Pick one.
5. **Total supply is never loaded**, so the entry market cap never shows, and the bundling ownership ratio measures shares of the top 10 instead of total supply.
6. **Birdeye free-tier 429s** when the overview and chart requests fire together. Retry recovers; consider spacing or server-side caching.
7. **Misleading data in the UI.**
   - "Stage: Very New" shows when the token's age is unknown (age defaults to 0).
   - The wallet panel shows "Tokens held 0" and a wallet value that leaves out the searched token.
8. **Efficiency.** The four PnL windows each re-scan from the newest transaction. Use one scan back to one year, split into the four windows.
9. **Rule compliance.** Move the search form to React Hook Form + Zod.
10. **Security cleanup.**
    - Rotate the Birdeye, Helius and Bitquery keys; the owner will do this. `.env` is in public history (commits `2853898` and `0858952`), and the Bitquery token is in history too.
    - A history rewrite needs the owner's explicit yes and a force-push. It doesn't undo a leak, so it hasn't been done.

**Later, not fixes:**
- URL state (`?mint=`) so an analysis can be shared.
- Calibrate the organic-score thresholds against labelled tokens.
- Larger touch targets for the chart toggles: they're 28px; 44px is the recommendation.
- Decide whether to turn the React Compiler back on (`reactCompiler` in `next.config.ts`).

## 5. How to run

```bash
npm install
cp .env.example .env   # fill in the keys
npm run dev            # http://localhost:3000
```

Checks: `npx tsc --noEmit`, `npm run lint`, `npm run build`. The browser preview config is in `.claude/launch.json` (port 3000).

For testing, use a small token, not BONK, until fix 1 lands, or each search spends a lot of Helius credits.

## 6. Git state and owner preferences

- **Branches:** work is on `feat/nextjs-migration`, which isn't pushed. `main` still holds the old Vite app.
- **Backup:** `stash@{0}` holds the pre-migration Vite work.
- **Commits:**
  - Commits are in the owner's name only, with no Claude attribution lines.
  - Check `git log --format='%an <%ae>'` before any push.
- **Branching:** use feature branches, and never commit straight to `main`.
- **Way of working:**
  - One milestone at a time, waiting for review before the next.
  - Run tsc, lint and build before handing over, and say what was run.
  - The owner plans to agree the order of the fixes above before work starts.
