import { Injectable } from '@angular/core';
import { CandleData, RsiPoint } from '../../models/chart.model';

@Injectable({ providedIn: 'root' })
export class IndicatorRsiService {
  /**
   * Calculates RSI (Relative Strength Index).
   * @param candles OHLCV candle data
   * @param period Period for RSI (default 14)
   */
  calculate(candles: CandleData[], period: number = 14): RsiPoint[] {
    if (candles.length <= period) return [];

    const result: RsiPoint[] = [];
    let sumGain = 0;
    let sumLoss = 0;

    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const difference = candles[i].close - candles[i - 1].close;
      if (difference > 0) {
        sumGain += difference;
      } else {
        sumLoss -= difference;
      }
    }

    let avgGain = sumGain / period;
    let avgLoss = sumLoss / period;

    let rs = avgLoss === 0 ? 0 : avgGain / avgLoss;
    let rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

    result.push({ time: candles[period].time, value: rsi });

    // Calculate Wilder's smoothing for subsequent values
    for (let i = period + 1; i < candles.length; i++) {
      const difference = candles[i].close - candles[i - 1].close;
      let gain = 0;
      let loss = 0;

      if (difference > 0) {
        gain = difference;
      } else {
        loss = -difference;
      }

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      rs = avgLoss === 0 ? 0 : avgGain / avgLoss;
      rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

      result.push({ time: candles[i].time, value: rsi });
    }

    return result;
  }
}
