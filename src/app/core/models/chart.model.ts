import { Subject } from "rxjs";

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '3d' | '1w';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickerData {
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
}

export interface MarkPriceData {
  markPrice: number;
  indexPrice: number;
  lastFundingRate: number;
  nextFundingTime: number;
}

export interface OpenInterestData {
  openInterest: number;
}

export interface KlineWsMessage {
  e: string;
  E: number;
  s: string;
  k: {
    t: number;  // Kline start time
    T: number;  // Kline close time
    s: string;  // Symbol
    i: string;  // Interval
    o: string;  // Open
    c: string;  // Close
    h: string;  // High
    l: string;  // Low
    v: string;  // Volume
    n: number;  // Number of trades
    x: boolean; // Is this kline closed
    q: string;  // Quote asset volume
  };
}

//https://developers.binance.com/docs/derivatives/usds-margined-futures/websocket-market-streams/Aggregate-Trade-Streams
export interface AggTradeWsMessage {
  e: string; // event type
  E: number; // event time
  s: string; // symbol
  p: string; // price
  q: string; // quantity
  m: boolean; // maker
  T: number;  // trade time
}

export interface DepthLevel {
  price: number;
  qty: number;
  total: number;
}

export interface OrderBook {
  bids: DepthLevel[];
  asks: DepthLevel[];
  lastUpdateId: number;
}

export interface RecentTrade {
  price: number;
  qty: number;
  isBuyerMaker: boolean;
  time: Date;
}

export interface AllRecentTrade {
  symbol: string;
  trades: RecentTrade[]
}

export interface ChartTheme {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  grid: string;
  up: string;
  dn: string;
  crosshair: string;
}

export interface OhlcDisplay {
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
  isUp: boolean;
}

export type IndicatorType = 'MA' | 'EMA' | 'MACD' | 'BB';

export interface MaPoint {
  time: number;
  value: number;
}

export interface MacdPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerPoint {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export interface IndicatorConfig {
  type: IndicatorType;
  label: string;
  color: string;
  enabled: boolean;
}
