import { Subject } from "rxjs";

export enum OrderSideEnum {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum PositionSideEnum {
  LONG = 'LONG',
  SHORT = 'SHORT',
}
export enum OrderTypeEnum {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_MARKET = 'STOP_MARKET',
  TAKE_PROFIT_MARKET = 'TAKE_PROFIT_MARKET',
}

export enum BinanceWsEventTypeEnum {
  ACCOUNT_UPDATE = 'ACCOUNT_UPDATE',
  ORDER_TRADE_UPDATE = 'ORDER_TRADE_UPDATE',
}

export interface FuturePosition {
  symbol: string;
  leverage: number;
  entryPrice: string;
  margin: number;
  positionAmt: string;
  createTime: string;
  updateTime: string;
  position?: PositionSideEnum;
  pnl?: number;
  pnlPercent?: number;
  stopLoss?: string;
  stopLossPnl?: string;
  stopLossPnlPercent?: number;
  takeProfit?: string;
  takeProfitPnl?: string;
  takeProfitPnlPercent?: number;
}

export interface OpenOrder {
  orderType: OrderTypeEnum;
  triggerPrice: string;
  side: string;
  symbol: string;
  updateTime: string;
}

export interface TPSLOrder {
  orderType: OrderTypeEnum;
  triggerPrice: string;
  side: string;
  symbol: string;
  updateTime: string;
}

export interface BinanceWsPrice {
  symbol: string;
  time: number;
  price: number;
}

export interface SymbolState {
  socket: WebSocket;
  subject: Subject<BinanceWsPrice[]>;
  history: BinanceWsPrice[];
  lastPrice: number | null;
}

export interface LeverageBracket {
  symbol: string;
  brackets: Bracket[];
}

export interface Bracket {
  bracket: number;
  cum: number;
  initialLeverage: number;
  maintMarginRatio: number;
  notionalCap: number;
  notionalFloor: number;
}