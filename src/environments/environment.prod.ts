//https://developers.binance.com/docs/derivatives/usds-margined-futures/websocket-market-streams/Important-WebSocket-Change-Notice
const binanceWSBaseUrl = 'wss://fstream.binance.com/ws';
const binanceTestnetWSBaseUrl = 'wss://fstream.binancefuture.com/ws';

export const prodEnv = {
  binanceFutureRestBaseUrl: 'https://fapi.binance.com',
  binanceWSBaseUrl: binanceWSBaseUrl,
  binancePublicWSBaseUrl: `${binanceWSBaseUrl}/public`, // Public (high-frequency public market data)
  binanceMarketWSBaseUrl: `${binanceWSBaseUrl}/market`, // Market (regular market data)
  binancePrivateWSBaseUrl: `${binanceWSBaseUrl}/private`, // Private (user data)
  apiBaseUrl: 'http://localhost:3000',
};

export const testnetEnv = {
  binanceFutureRestBaseUrl: 'https://demo-fapi.binance.com',
  binanceWSBaseUrl: binanceTestnetWSBaseUrl,
  binancePublicWSBaseUrl: `${binanceTestnetWSBaseUrl}/public`,
  binanceMarketWSBaseUrl: `${binanceTestnetWSBaseUrl}/market`,
  binancePrivateWSBaseUrl: `${binanceTestnetWSBaseUrl}/private`,
  apiBaseUrl: 'http://localhost:3000',
};

export const BINANCE_PUBLIC_API_ROUTES = {
  leverageBracket: '/fapi/v1/leverageBracket',
  exchangeInfo: '/fapi/v1/exchangeInfo',
  markPrice: '/fapi/v1/premiumIndex',
  openInterest: '/fapi/v1/openInterest',
  depth: '/fapi/v1/depth',
  aggTrades: '/fapi/v1/aggTrades',
  chart: {
    klines: '/fapi/v1/klines',
    ticker: '/fapi/v1/ticker/24hr',
  },
};

export const API_ROUTES = {
  ai: {
    chat: '/api/ai/chat',
    analyzeMarket: '/api/ai/analyze-market',
  },
  auth: {
    me: '/api/auth/me',
    signIn: '/api/auth/signin',
    signInWithEmail: '/api/auth/signin-email',
    signOut: '/api/auth/signout',
  },
  user: {
    userInfo: '/api/user-info',
    userDataStream: '/api/user-stream',
  },
  futures: {
    positions: '/api/futures/positions',
    order: '/api/futures/order',
    tradeBot: '/api/trade-bot',
    takeProfit: '/api/futures/take-profit',
    stopLoss: '/api/futures/stop-loss',
    cancelTpSl: '/api/futures/cancel-tpsl',
    cancel: '/api/futures/cancel',
    openOrders: '/api/futures/open-orders',
    pendingTpSl: '/api/futures/pending-tpsl',
    closePosition: '/api/futures/close-position',
    leverageBracket: '/api/futures/leverage-bracket',
    commissionRate: '/api/futures/commission-rate',
  },
};
