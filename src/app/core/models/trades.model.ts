export interface FuturePosition {
  symbol: string;
  leverage: number;
  entryPrice: string;
  initialMargin: string;
  positionAmt: string;
  pnl?: string;
  pnlPercent?: string;
  stopLoss?: string;
  stopLossPnl?: string;
  stopLossPnlPercent?: string;
  takeProfit?: string;
  takeProfitPnl?: string;
  takeProfitPnlPercent?: string;
  updateTime: string;
}

export type OrderType = 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';

export interface OpenOrder {
  orderType: OrderType;
  triggerPrice: string;
  side: string;
  symbol: string;
  updateTime: string;
}