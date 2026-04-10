import { Timeframe } from '../models/chart.model';

export const DEFAULT_SYMBOL = 'btcusdt';

export const MAX_TRADE_HISTORY = 30;
export const TIMEFRAMES: Timeframe[] = [
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '1d',
  '3d',
  '1w',
];
export const DEFAULT_TIMEFRAME: Timeframe = '15m';

export const STREAM_NAME = {
  AGG_TRADE: 'aggTrade',
  KLINE: 'kline',
  MARK_PRICE_UPDATE: 'markPriceUpdate',
  TICKER_24HR: '24hrTicker',
}

export const STORAGE = {
  TIMEFRAME: 'tf',
  SYMBOL: 'symbol',
  FAV_SYMBOLS: 'fav_symbols',
};

// keepalive — Binance requires a PUT every 30–60 minutes
export const KEEP_ALIVE_USER_DATA_STREAM = 30 * 60 * 1000;
