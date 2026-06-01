// In prod, all Binance traffic is proxied through the backend to avoid browser CORS restrictions.
// WS paths are relative — AppSettingsService resolves them to absolute wss:// URLs at runtime.
export const prodEnv = {
  binanceFutureRestBaseUrl: '',
  binanceWSBaseUrl: '/fstream-proxy/ws',
  binancePublicWSBaseUrl: '/fstream-proxy/public/ws',
  binanceMarketWSBaseUrl: '/fstream-proxy/market/ws',
  binancePrivateWSBaseUrl: '/fstream-proxy/private/ws',
  apiBaseUrl: '',
};

export const testnetEnv = {
  binanceFutureRestBaseUrl: '/demo-fapi',
  binanceWSBaseUrl: '/fstream-testnet-proxy/ws',
  binancePublicWSBaseUrl: '/fstream-testnet-proxy/public/ws',
  binanceMarketWSBaseUrl: '/fstream-testnet-proxy/market/ws',
  binancePrivateWSBaseUrl: '/fstream-testnet-proxy/private/ws',
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
