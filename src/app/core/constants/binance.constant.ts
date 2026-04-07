import { Timeframe } from "../models/chart.model";

export const SYMBOLS = {
  BTCUSDT: 'btcusdt',
  ETHUSDT: 'ethusdt',
};

export const MAX_TRADE_HISTORY = 30;
export const TIMEFRAMES: Timeframe[] = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d', '3d', '1w'];
export const DEFAULT_TIMEFRAME: Timeframe = '15m';

export const STORAGE = {
  lToken: 'lToken',
  sToken: 'sToken',
}
