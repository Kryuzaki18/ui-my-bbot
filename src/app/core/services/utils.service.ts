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
    tickSize: number = 0,
  ): { pnl: number; pnlStr: string; pnlPercent: number } {
    let normalizedPrice = targetPrice;

    if (tickSize > 0) {
      normalizedPrice = Math.round(targetPrice / tickSize) * tickSize;
    }

    const pnl = (normalizedPrice - entryPrice) * amount;
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const pnlStr = (pnl < 0 ? '-' : '') + formatter.format(Math.abs(pnl));
    const margin = (Math.abs(amount) * entryPrice) / leverage;

    let pnlPercent = 0;
    if (margin > 0) {
      const roeFraction = pnl / margin;
      const absPercent = Math.abs(roeFraction * 100);
      pnlPercent = Math.round(absPercent);
    }

    return { pnl, pnlStr, pnlPercent };
  }

  calculateTargetPrice(
    entryPrice: number,
    leverage: number,
    roePercentage: number,
    isLong: boolean,
    isWin: boolean,
    tickSize: number,
  ): number {
    const roeFraction = roePercentage / 100;
    const direction = isLong ? (isWin ? 1 : -1) : isWin ? -1 : 1;

    const priceChange = roeFraction * (entryPrice / leverage);
    const rawTargetPrice = entryPrice + priceChange * direction;

    const remainder = rawTargetPrice % tickSize;
    const clampedPrice = rawTargetPrice - remainder;

    const precision = Math.max(0, -Math.log10(tickSize));
    return parseFloat(clampedPrice.toFixed(precision));
  }

  calculateMargin(amt: number, price: number, lev: number): number {
    const quantity = Math.abs(amt);
    const entry = price;
    const leverage = lev;

    if (!leverage || leverage === 0) return 0;

    return (quantity * entry) / leverage;
  }

  getTickSize(filters: any): number {
    const priceFilter = filters.find((f: any) => f.filterType === 'PRICE_FILTER');

    if (!priceFilter || !priceFilter.tickSize) {
      throw new Error(`Could not find PRICE_FILTER`);
    }

    return parseFloat(priceFilter.tickSize);
  }
}
