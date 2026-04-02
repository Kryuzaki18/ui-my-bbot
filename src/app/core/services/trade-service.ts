import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TradeService {
  calculateEstimatedPnL(
    entryPrice: number,
    targetPrice: number,
    amount: number,
    leverage: number,
  ): { pnl: number; pnlStr: string; pnlPercent: number } {
    const pnl = (targetPrice - entryPrice) * amount;

    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const pnlStr = formatter.format(Math.abs(pnl));

    const margin = (Math.abs(amount) * entryPrice) / leverage;

    let pnlPercent = 0;
    if (margin > 0) {
      const roeFraction = pnl / margin;
      const absPercent = Math.abs(roeFraction * 100);
      pnlPercent = Math.max(Math.round(absPercent), 1);
    }

    return { pnl, pnlStr, pnlPercent };
  }
}
