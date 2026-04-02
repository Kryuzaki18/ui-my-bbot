export interface FuturePosition {
  symbol: string;
  leverage: number;
  entryPrice: string;
  initialMargin: string;
  positionAmt: string;
  createTime: string;
  updateTime: string;
  pnl?: string;
  pnlPercent?: string;
  stopLoss?: string;
  stopLossPnl?: string;
  stopLossPnlPercent?: number;
  takeProfit?: string;
  takeProfitPnl?: string;
  takeProfitPnlPercent?: number;
}

export enum OrderSideEnum {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderTypeEnum {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_MARKET = 'STOP_MARKET',
  TAKE_PROFIT_MARKET = 'TAKE_PROFIT_MARKET',
}

export interface OpenOrder {
  orderType: OrderTypeEnum;
  triggerPrice: string;
  side: string;
  symbol: string;
  updateTime: string;
}
