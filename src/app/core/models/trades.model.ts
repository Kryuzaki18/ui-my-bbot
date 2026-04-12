import { Ticker24hrData } from "./chart.model";

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
  stopLoss?: {
    triggerPrice: string;
    pnl?: string;
    pnlPercent?: number;
  };
  takeProfit?: {
    triggerPrice: string;
    pnl?: string;
    pnlPercent?: number;
  };
}

export interface OpenOrder {
  orderType: OrderTypeEnum;
  triggerPrice: string;
  side: string;
  symbol: string;
  updateTime: string;
}

export interface TPSLOrder {
  algoId?: string;
  clientAlgoId?: string;
  orderType: OrderTypeEnum;
  triggerPrice: string;
  side: string;
  symbol: string;
  updateTime: string;
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

export interface PublicLeverageBracket {
  symbol: string;
  brackets: Array<{
    bracket: number;
    initialLeverage: number;
    notionalCap: string;
    maintMarginRate: number;
  }>;
}

export interface ExchangeSymbolsWithVolume extends ExchangeSymbol, Ticker24hrData {
  volNumber: number;
}

export interface ExchangeInfo {
  symbols: ExchangeSymbol[];
  serverTime: number;
}

export interface ExchangeSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetPrecision: number;
  quoteAssetPrecision: number;
  liquidationFee: string;
  maintMarginPercent: string;
  marginAsset: string;
  deliveryDate: number;
  onboardDate: number;
  underlyingType: string;
  underlyingSubType: string[];
  filters: any[];
  status: string;
  contractType: string;
}