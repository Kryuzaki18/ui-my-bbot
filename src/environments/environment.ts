export const environment = {
  // binanceFutureRestBaseUrl: 'https://testnet.binancefuture.com',
  binanceFutureWebSocketBaseUrl: 'wss://stream.binancefuture.com/ws',
  apiTradingBotUrl: 'http://127.0.0.1:3000'
};

export const API_ROUTES = {
  auth: {
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
}