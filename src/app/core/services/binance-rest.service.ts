import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError, forkJoin } from 'rxjs';

// Environments
import { BINANCE_PUBLIC_API_ROUTES, environment } from '../../../environments/environment';

// Models
import {
  CandleData,
  TickerData,
  MarkPriceData,
  OpenInterestData,
  Timeframe,
  Ticker24hrData,
  AggTradeRest,
} from '../models/chart.model';
import { ExchangeInfo, ExchangeSymbolsWithVolume } from '../models/trades.model';

@Injectable({ providedIn: 'root' })
export class BinanceRestService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.binanceFutureRestBaseUrl;

  getAggTrades(symbol: string, limit: number = 50): Observable<AggTradeRest[]> {
    const params = new HttpParams()
      .set('symbol', symbol.toLowerCase())
      .set('limit', limit.toString());
    return this.http.get<AggTradeRest[]>(`${this.base}${BINANCE_PUBLIC_API_ROUTES.aggTrades}`, { params });
  }

  getExchangeInfo(): Observable<ExchangeInfo> {
    return this.http.get<ExchangeInfo>(`${this.base}${BINANCE_PUBLIC_API_ROUTES.exchangeInfo}`);
  }

  getAllSymbolsWithVolume(): Observable<ExchangeSymbolsWithVolume[]> {
    return forkJoin({
      info: this.getExchangeInfo(),
      stats: this.http.get<Ticker24hrData[]>(
        `${this.base}${BINANCE_PUBLIC_API_ROUTES.chart.ticker}`,
      ),
    }).pipe(
      map(({ info, stats }) => {
        const activeSymbols = info.symbols.filter(
          (s) => s.status === 'TRADING' && s.contractType === 'PERPETUAL',
        );

        return activeSymbols.map((s) => {
          const ticker = stats.find((t) => t.symbol === s.symbol);
          return {
            ...s,
            ...ticker,
            lastPrice: ticker?.lastPrice || 0,
            priceChange: ticker?.priceChange || 0,
            priceChangePercent: ticker?.priceChangePercent || 0,
            highPrice: ticker?.highPrice || 0,
            lowPrice: ticker?.lowPrice || 0,
            volume: ticker?.volume || 0,
            quoteVolume: ticker?.quoteVolume || 0,
            volNumber: Number(ticker?.quoteVolume)
          };
        });
      }),
    );
  }

  getKlines(symbol: string, interval: Timeframe, limit: number = 500): Observable<CandleData[]> {
    const params = new HttpParams()
      .set('symbol', symbol.toLowerCase())
      .set('interval', interval)
      .set('limit', limit.toString());

    return this.http
      .get<any[][]>(`${this.base}${BINANCE_PUBLIC_API_ROUTES.chart.klines}`, { params })
      .pipe(
        map((raw) =>
          raw.map((k) => ({
            time: Math.floor(k[0] / 1000),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
          })),
        ),
        catchError((err) => throwError(() => err)),
      );
  }

  getTicker(symbol: string): Observable<TickerData> {
    const params = new HttpParams().set('symbol', symbol.toLowerCase());

    return this.http
      .get<any>(`${this.base}${BINANCE_PUBLIC_API_ROUTES.chart.ticker}`, { params })
      .pipe(
        map((d) => ({
          lastPrice: parseFloat(d.lastPrice),
          priceChange: parseFloat(d.priceChange),
          priceChangePercent: parseFloat(d.priceChangePercent),
          highPrice: parseFloat(d.highPrice),
          lowPrice: parseFloat(d.lowPrice),
          volume: parseFloat(d.volume),
          quoteVolume: parseFloat(d.quoteVolume),
        })),
        catchError((err) => throwError(() => err)),
      );
  }

  getMarkPrice(symbol: string): Observable<MarkPriceData> {
    const params = new HttpParams().set('symbol', symbol.toLowerCase());

    return this.http
      .get<any>(`${this.base}${BINANCE_PUBLIC_API_ROUTES.markPrice}`, { params })
      .pipe(
        map((d) => ({
          markPrice: parseFloat(d.markPrice),
          indexPrice: parseFloat(d.indexPrice),
          lastFundingRate: parseFloat(d.lastFundingRate),
          nextFundingTime: d.nextFundingTime,
        })),
        catchError((err) => throwError(() => err)),
      );
  }

  getOpenInterest(symbol: string): Observable<OpenInterestData> {
    const params = new HttpParams().set('symbol', symbol.toUpperCase());

    return this.http
      .get<any>(`${this.base}${BINANCE_PUBLIC_API_ROUTES.openInterest}`, { params })
      .pipe(
        map((d) => ({ openInterest: parseFloat(d.openInterest) })),
        catchError((err) => throwError(() => err)),
      );
  }

  getDepth(symbol: string, limit = 20): Observable<any> {
    const params = new HttpParams()
      .set('symbol', symbol.toUpperCase())
      .set('limit', limit.toString());

    return this.http
      .get<any>(`${this.base}${BINANCE_PUBLIC_API_ROUTES.depth}`, { params })
      .pipe(catchError((err) => throwError(() => err)));
  }
}
