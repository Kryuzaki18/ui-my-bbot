import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';

// Environments
import {
  API_ROUTES,
  BINANCE_PUBLIC_API_ROUTES,
  environment,
} from '../../../environments/environment';

// Models
import {
  CandleData,
  TickerData,
  MarkPriceData,
  OpenInterestData,
  Timeframe,
} from '../models/chart.model';

@Injectable({ providedIn: 'root' })
export class BinanceRestService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.binanceFutureRestBaseUrl;

  getLeverageBracket(body: any = {}): Observable<any> {
    return this.http.post(
      `${environment.apiTradingBotUrl}${API_ROUTES.futures.leverageBracket}`,
      body,
    );
  }

  getKlines(symbol: string, interval: Timeframe, limit = 500): Observable<CandleData[]> {
    const params = new HttpParams()
      .set('symbol', symbol.toUpperCase())
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
    const params = new HttpParams().set('symbol', symbol.toUpperCase());

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
    const params = new HttpParams().set('symbol', symbol.toUpperCase());

    return this.http
      .get<any>(`${this.base}${BINANCE_PUBLIC_API_ROUTES.chart.markPrice}`, { params })
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
      .get<any>(`${this.base}${BINANCE_PUBLIC_API_ROUTES.chart.openInterest}`, { params })
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
      .get<any>(`${this.base}${BINANCE_PUBLIC_API_ROUTES.chart.depth}`, { params })
      .pipe(catchError((err) => throwError(() => err)));
  }
}
