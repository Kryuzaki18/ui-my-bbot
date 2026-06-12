# Angular Trading Bot

A real-time **Binance Futures trading dashboard** built with Angular 21. Connects directly to Binance WebSocket streams for live market data and communicates with the [api-trading-bot](../api-trading-bot) backend for authenticated trade execution.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 21 (standalone components) |
| Language | TypeScript 5.9 |
| UI | PrimeNG 21 + TailwindCSS 4 |
| Charts | Lightweight Charts 5 |
| Testing | Vitest |
| Build | Angular CLI + Vite (via `@angular/build`) |

---

## Features

### Trading Chart
- Candlestick chart with volume panel (Lightweight Charts)
- Real-time updates via Binance WebSocket (kline, mark price, ticker 24h, order book depth, agg trades)
- Timeframes: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 1d, 3d, 1w
- Symbol selector with all Binance Futures pairs
- Technical indicators: MA (20), EMA (20), Bollinger Bands (20,2), MACD (12,26,9), RSI (14)
- Drawing tools: cursor, horizontal line, trendline, eraser
- Entry / TP / SL price lines overlaid on chart for active position
- Open order price lines (buy = green, sell = red)
- Chart screenshot export
- Auto-reconnect with exponential backoff (1s → 30s)

### Trade Form
- Place market and limit futures orders
- Set leverage, take profit, and stop loss in one form
- Testnet / live mode toggle per session

### Account & Positions
- Live account balance display
- Open positions panel with unrealized PnL
- Open orders panel
- Conditional (TP/SL algo) orders panel
- Close position and cancel order actions

### AI Assistant
- AI chat powered by Claude (server-side history, works for anonymous and authenticated users)
- AI market analysis — sends symbol + interval to the backend and displays a structured analysis

### Authentication
- Sign in with Binance API key + secret
- Sign in with email + password (account registered on the backend)
- Auth guard protects the `/future` dashboard route
- Anonymous users can use the AI chat; history merges on sign-in

---

## Project Structure

```
src/
├── app/
│   ├── commons/          # Header, footer
│   ├── components/       # Feature components
│   │   ├── account-balance/
│   │   ├── chat/         # AI chat panel
│   │   ├── positions-and-orders/
│   │   │   ├── conditional-orders/
│   │   │   ├── open-orders/
│   │   │   └── positions/
│   │   ├── trade-form/
│   │   ├── trading-chart/
│   │   └── tp-sl/
│   ├── core/
│   │   ├── constants/    # Binance streams, regex
│   │   ├── guards/       # Auth guard
│   │   ├── interceptors/ # HTTP auth interceptor
│   │   ├── models/       # TypeScript interfaces
│   │   ├── pipes/        # Abbreviate numbers
│   │   └── services/     # All business logic
│   │       ├── chart/    # Indicator calculations (MA, EMA, BB, MACD, RSI)
│   │       ├── ai.service.ts
│   │       ├── auth.service.ts
│   │       ├── binance-rest.service.ts
│   │       ├── binance-ws.service.ts
│   │       ├── binance-combined-ws.service.ts
│   │       └── user-ws.service.ts
│   └── pages/
│       ├── dashboard/    # Protected trading dashboard
│       ├── home/         # Landing / sign-in page
│       └── legal/        # Terms, Privacy
└── environments/         # API URLs, route constants
```

---

## Prerequisites

- Node.js 20+
- [api-trading-bot](../api-trading-bot) running on port 5555

---

## Installation

```bash
git clone https://github.com/Kryuzaki18/angular-trading-bot.git
cd angular-trading-bot
npm install
```

---

## Running

```bash
# Development (proxied to backend at localhost:5555)
npm start
# → http://localhost:4444

# Build for production
npm run build

# Run tests
npm test
```

The dev server uses `proxy.conf.json` to forward `/api/*` requests to `http://localhost:5555`, so CORS credentials work correctly during development.

---

## Routes

| Path | Guard | Description |
|---|---|---|
| `/home` | — | Landing page with sign-in form |
| `/future` | `authGuard` | Trading dashboard |
| `/terms` | — | Terms of service |
| `/privacy` | — | Privacy policy |

---

## Environment / API Configuration

All API route constants and environment URLs live in [src/environments/environment.ts](src/environments/environment.ts). The app supports two Binance environments:

- **Testnet** — `demo-fapi.binance.com` / `fstream.binancefuture.com`
- **Production** — `fapi.binance.com` / `fstream.binance.com`

The active environment is stored in the session and toggled via the backend's `/api/auth/switch-mode` endpoint.

---

## Disclaimer

This project is for **educational purposes only**. Cryptocurrency trading involves significant financial risk. Use Binance Testnet for safe development and testing.

---

## Author

**Kryuzaki18**
