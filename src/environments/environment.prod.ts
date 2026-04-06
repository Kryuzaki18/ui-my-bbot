//https://developers.binance.com/docs/derivatives/usds-margined-futures/websocket-market-streams/Important-WebSocket-Change-Notice
const binanceWSBaseUrl = 'wss://fstream.binance.com';

export const environment = {
  binanceFutureRestBaseUrl: 'https://testnet.binancefuture.com',
  binanceWSBaseUrl: binanceWSBaseUrl,
  binancePublicWSBaseUrl: `${binanceWSBaseUrl}/public`, // Public (high-frequency public market data)
  binanceMarketWSBaseUrl: `${binanceWSBaseUrl}/market`, // Market (regular market data)
  binancePrivateWSBaseUrl: `${binanceWSBaseUrl}/private`, // Private (user data)
  apiTradingBotUrl: 'http://127.0.0.1:3000',
};

export const BINANCE_PUBLIC_API_ROUTES = {
  publicLeverageBracket: '/fapi/v1/leverageBracket',
  chart: {
    klines: '/fapi/v1/klines',
    ticker: '/fapi/v1/ticker/24hr',
    markPrice: '/fapi/v1/premiumIndex',
    openInterest: '/fapi/v1/openInterest',
    depth: '/fapi/v1/depth',
  },
};

export const API_ROUTES = {
  auth: {
    me: '/api/auth/me',
    signIn: '/api/auth/signin',
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
  },
};
