import { Injectable } from '@angular/core';
import { CandleData, BollingerPoint } from '../models/chart.model';

@Injectable({ providedIn: 'root' })
export class IndicatorBollingerService {
  /**
   * Calculates Bollinger Bands.
   * @param candles OHLCV candle data
   * @param period  SMA lookback period (default 20)
   * @param stdDev  Standard deviation multiplier (default 2)
   */
  calculate(candles: CandleData[], period = 20, stdDev = 2): BollingerPoint[] {
    const result: BollingerPoint[] = [];
    if (candles.length < period) return result;

    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);
      const closes = slice.map((c) => c.close);

      const mean = closes.reduce((a, b) => a + b, 0) / period;
      const variance = closes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
      const sd = Math.sqrt(variance);

      result.push({
        time: candles[i].time,
        upper: mean + stdDev * sd,
        middle: mean,
        lower: mean - stdDev * sd,
      });
    }

    return result;
  }
}
