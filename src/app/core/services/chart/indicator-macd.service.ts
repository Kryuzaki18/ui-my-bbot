import { Injectable } from '@angular/core';
import { CandleData, MacdPoint } from '../../models/chart.model';

@Injectable({ providedIn: 'root' })
export class IndicatorMacdService {
  /**
   * Calculates MACD (Moving Average Convergence Divergence).
   * @param candles    OHLCV candle data
   * @param fastPeriod Fast EMA period (default 12)
   * @param slowPeriod Slow EMA period (default 26)
   * @param signalPeriod Signal EMA period (default 9)
   */
  calculate(
    candles: CandleData[],
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9,
  ): MacdPoint[] {
    if (candles.length < slowPeriod + signalPeriod) return [];

    const closes = candles.map((c) => c.close);
    const times = candles.map((c) => c.time);

    const fastEma = this.ema(closes, fastPeriod);
    const slowEma = this.ema(closes, slowPeriod);

    // MACD line starts where slow EMA starts (index slowPeriod - 1)
    const offset = slowPeriod - fastPeriod;
    const macdLine: number[] = [];
    const macdTimes: number[] = [];

    for (let i = 0; i < slowEma.length; i++) {
      macdLine.push(fastEma[i + offset] - slowEma[i]);
      macdTimes.push(times[slowPeriod - 1 + i]);
    }

    const signalLine = this.ema(macdLine, signalPeriod);

    const result: MacdPoint[] = [];
    const signalOffset = signalPeriod - 1;

    for (let i = signalOffset; i < macdLine.length; i++) {
      const macd = macdLine[i];
      const signal = signalLine[i - signalOffset];
      result.push({
        time: macdTimes[i],
        macd,
        signal,
        histogram: macd - signal,
      });
    }

    return result;
  }

  private ema(values: number[], period: number): number[] {
    const result: number[] = [];
    if (values.length < period) return result;

    const k = 2 / (period + 1);
    let emaVal = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push(emaVal);

    for (let i = period; i < values.length; i++) {
      emaVal = values[i] * k + emaVal * (1 - k);
      result.push(emaVal);
    }
    return result;
  }
}
