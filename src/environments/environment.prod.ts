//https://developers.binance.com/docs/derivatives/usds-margined-futures/websocket-market-streams/Important-WebSocket-Change-Notice
const binanceWSBaseUrl = 'wss://fstream.binance.com';
const binanceTestnetWSBaseUrl = 'wss://fstream.binancefuture.com';

export const prodEnv = {
  binanceFutureRestBaseUrl: '',
  binanceWSBaseUrl: `${binanceWSBaseUrl}/ws`,
  binancePublicWSBaseUrl: `${binanceWSBaseUrl}/public/ws`, // Public (high-frequency public market data)
  binanceMarketWSBaseUrl: `${binanceWSBaseUrl}/market/ws`, // Market (regular market data)
  binancePrivateWSBaseUrl: `${binanceWSBaseUrl}/private/ws`, // Private (user data)
  apiBaseUrl: '',
};

export const testnetEnv = {
  binanceFutureRestBaseUrl: 'https://demo-fapi.binance.com',
  binanceWSBaseUrl: `${binanceTestnetWSBaseUrl}/ws`,
  binancePublicWSBaseUrl: `${binanceTestnetWSBaseUrl}/public/ws`,
  binanceMarketWSBaseUrl: `${binanceTestnetWSBaseUrl}/market/ws`,
  binancePrivateWSBaseUrl: `${binanceTestnetWSBaseUrl}/private/ws`,
  apiBaseUrl: '',
};

export const BINANCE_PUBLIC_API_ROUTES = {
  tickerPrice: '/fapi/v2/ticker/price',
  leverageBracket: '/fapi/v1/leverageBracket',
  exchangeInfo: '/fapi/v1/exchangeInfo',
  markPrice: '/fapi/v1/premiumIndex',
  openInterest: '/fapi/v1/openInterest',
  depth: '/fapi/v1/depth',
  aggTrades: '/fapi/v1/aggTrades',
  klines: '/fapi/v1/klines',
  ticker24hr: '/fapi/v1/ticker/24hr',
};

export const API_ROUTES = {
  ai: {
    chat: '/api/chat',
    analyzeMarket: '/api/analyze-market',
    tradeBot: '/api/trade-bot',
  },
  auth: {
    me: '/api/auth/me',
    signIn: '/api/auth/signin',
    signInWithEmail: '/api/auth/signin-email',
    switchMode: '/api/auth/switch-mode',
    signOut: '/api/auth/signout',
  },
  user: {
    userInfo: '/api/user-info',
    userDataStream: '/api/user-stream',
  },
  futures: {
    positions: '/api/futures/positions',
    order: '/api/futures/order',
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
