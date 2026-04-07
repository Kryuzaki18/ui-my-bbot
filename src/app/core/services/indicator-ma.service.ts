import { Injectable } from '@angular/core';
import { CandleData, MaPoint } from '../models/chart.model';

@Injectable({ providedIn: 'root' })
export class IndicatorMaService {
  /**
   * Calculates Simple Moving Average (SMA).
   * @param candles OHLCV candle data
   * @param period  Lookback period (default 20)
   */
  calculateSMA(candles: CandleData[], period = 20): MaPoint[] {
    const result: MaPoint[] = [];
    if (candles.length < period) return result;

    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, c) => sum + c.close, 0) / period;
      result.push({ time: candles[i].time, value: avg });
    }
    return result;
  }

  /**
   * Calculates Exponential Moving Average (EMA).
   * @param candles OHLCV candle data
   * @param period  Lookback period (default 20)
   */
  calculateEMA(candles: CandleData[], period = 20): MaPoint[] {
    const result: MaPoint[] = [];
    if (candles.length < period) return result;

    const k = 2 / (period + 1);

    // Seed with SMA of first `period` bars
    const seedSlice = candles.slice(0, period);
    let ema = seedSlice.reduce((sum, c) => sum + c.close, 0) / period;
    result.push({ time: candles[period - 1].time, value: ema });

    for (let i = period; i < candles.length; i++) {
      ema = candles[i].close * k + ema * (1 - k);
      result.push({ time: candles[i].time, value: ema });
    }
    return result;
  }
}
