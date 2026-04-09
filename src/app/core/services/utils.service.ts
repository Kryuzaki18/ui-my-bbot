import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UtilsService {
  fmtVol(n: number): string {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toFixed(2);
  }

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

  calculatePnl(entryPrice: number, targetPrice: number, positionAmt: number, leverage: number): {
    pnl: number;
    pnlPercent: number;
  } {
    const ep = entryPrice;
    const amt = positionAmt;
    const lev = leverage;

    const pnl = (targetPrice - ep) * amt;
    const notional = Math.abs(amt * ep);
    const margin = notional / lev;
    const pnlPercent = margin > 0 ? (pnl / margin) * 100 : 0;
    return {
      pnl,
      pnlPercent,
    };
  }

  calculateTargetPrice(
    entryPrice: number,
    leverage: number,
    roePercentage: number,
    isLong: boolean,
  ): number {
    const roeFraction = roePercentage / 100;
    const sideSign = isLong ? 1 : -1;
    const targetPrice = entryPrice + roeFraction * (entryPrice / leverage) * sideSign;
    return targetPrice;
  }

  calculateMargin(amt: number, price: number, lev: number): number {
    const quantity = Math.abs(amt);
    const entry = price;
    const leverage = lev;

    if (!leverage || leverage === 0) return 0;

    return (quantity * entry) / leverage;
  }
}
