import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

// Models
import {
  AggTradeWs,
  AggTradeWsMessage,
  DepthWsMessage,
  KlineWsMessage,
  Ticker24hrWsMessage,
  Timeframe,
  WsStatus,
} from '../models/chart.model';

// Constants
import { MAX_TRADE_HISTORY, STREAM_NAME } from '../constants/binance.constant';

// Services
import { AppSettingsService } from './app-settings.service';

@Injectable({
  providedIn: 'root',
})
export class BinanceWsService {
  private readonly appSettingsService = inject(AppSettingsService);

  private get binanceMarketWSBaseUrl(): string {
    return this.appSettingsService.env().binanceMarketWSBaseUrl;
  }

  private get binancePublicWSBaseUrl(): string {
    return this.appSettingsService.env().binancePublicWSBaseUrl;
  }

  private aggTradeConnections: Record<string, AggTradeWs> = {};
  private marketWSconnections = new Map<string, WebSocket>();

  /** Reconnect delay: 1s, 2s, 4s, 8s … capped at 30s */
  private retryDelays = [1000, 2000, 4000, 8000, 16000, 30000];
  private retryAttempts = new Map<string, number>();

  // ── Status stream ───────────────────────────────────────────────────────
  private statusSubject = new Subject<{ key: string; status: WsStatus }>();
  readonly status$ = this.statusSubject.asObservable();

  // ── Kline stream ────────────────────────────────────────────────────────
  private klineSubject = new Subject<KlineWsMessage>();
  readonly kline$ = this.klineSubject.asObservable();

  // ── Mark price stream ───────────────────────────────────────────────────
  private markPriceSubject = new Subject<any>();
  readonly markPrice$ = this.markPriceSubject.asObservable();

  // ── Ticker stream ───────────────────────────────────────────────────
  private ticker24hSubject = new Subject<Ticker24hrWsMessage>();
  readonly ticker24h$ = this.ticker24hSubject.asObservable();

  // ── All Tickers stream ──────────────────────────────────────────────
  private allTickersSubject = new Subject<Ticker24hrWsMessage[]>();
  readonly allTickers$ = this.allTickersSubject.asObservable();

  // ── Depth stream ────────────────────────────────────────────────────────
  private depthSubject = new Subject<DepthWsMessage>();
  readonly depth$ = this.depthSubject.asObservable();

  wsDepth(symbol: string): void {
    const stream = `${symbol.toLowerCase()}@depth10@500ms`;
    this.connectWs(STREAM_NAME.DEPTH_UPDATE, stream, (data) => {
      if (data.e === STREAM_NAME.DEPTH_UPDATE) {
        this.depthSubject.next(data as DepthWsMessage);
      }
    }, this.binancePublicWSBaseUrl);
  }

  wsKline(symbol: string, interval: Timeframe): void {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    this.connectWs(STREAM_NAME.KLINE, stream, (data) => {
      if (data.e === STREAM_NAME.KLINE) {
        this.klineSubject.next(data as KlineWsMessage);
      }
    });
  }

  wsTicker24h(symbol: string): void {
    const stream = `${symbol.toLowerCase()}@ticker`;
    this.connectWs(STREAM_NAME.TICKER_24HR, stream, (data) => {
      if (data.e === STREAM_NAME.TICKER_24HR) {
        this.ticker24hSubject.next(data);
      }
    });
  }

  wsAllTickers(): void {
    const stream = `!ticker@arr`;
    this.connectWs(STREAM_NAME.ALL_TICKERS, stream, (data) => {
      this.allTickersSubject.next(data);
    });
  }

  wsMarkPrice(symbol: string, timeInterval: string = '@1s'): void {
    const stream = `${symbol.toLowerCase()}@markPrice${timeInterval}`;
    this.connectWs(STREAM_NAME.MARK_PRICE_UPDATE, stream, (data) => {
      if (data.e === STREAM_NAME.MARK_PRICE_UPDATE) {
        this.markPriceSubject.next(data);
      }
    });
  }

  unsubscribeWs(key: string): void {
    const ws = this.marketWSconnections.get(key);
    if (ws) {
      if (key === STREAM_NAME.KLINE) {
        this.klineSubject?.next(null as any);
      }

      if (key === STREAM_NAME.TICKER_24HR) {
        this.ticker24hSubject?.next(null as any);
      }

      if (key === STREAM_NAME.MARK_PRICE_UPDATE) {
        this.markPriceSubject?.next(null as any);
      }

      if (key === 'allTickers') {
        this.allTickersSubject?.next([] as any);
      }

      ws.onclose = null;
      ws.close();
      this.marketWSconnections.delete(key);
      this.retryAttempts.delete(key);
    }
  }

  closeAllWs(): void {
    this.marketWSconnections.forEach((ws, key) => {
      ws.onclose = null;
      ws.close();
    });
    this.marketWSconnections.clear();
    this.retryAttempts.clear();
  }

  private connectWs(
    key: string,
    stream: string,
    onMessage: (data: any) => void,
    baseUrl: string = this.binanceMarketWSBaseUrl
  ): void {
    this.unsubscribeWs(key);

    this.statusSubject.next({ key, status: 'connecting' });

    const url = `${baseUrl}/${stream}`;
    // console.log(`[WS] Connecting [${key}] → ${url}`);
    const ws = new WebSocket(url);
    this.marketWSconnections.set(key, ws);

    ws.onopen = () => {
      // console.log(`[WS] Connected [${key}]`);
      this.retryAttempts.set(key, 0);
      this.statusSubject.next({ key, status: 'live' });
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    ws.onerror = (event) => {
      console.error(`[WS] Error [${key}]`, event);
      this.statusSubject.next({ key, status: 'error' });
    };

    ws.onclose = (event) => {
      console.warn(`[WS] Closed [${key}] code=${event.code} reason="${event.reason}"`);
      this.marketWSconnections.delete(key);
      this.statusSubject.next({ key, status: 'closed' });
      this.scheduleReconnect(key, stream, onMessage);
    };
  }

  private scheduleReconnect(key: string, stream: string, onMessage: (data: any) => void): void {
    const attempt = (this.retryAttempts.get(key) ?? 0) + 1;
    this.retryAttempts.set(key, attempt);
    const delay = this.retryDelays[Math.min(attempt - 1, this.retryDelays.length - 1)];

    setTimeout(() => {
      if (this.marketWSconnections.has(key) || !key) return;
      this.connectWs(key, stream, onMessage);
    }, delay);
  }

  createAggTradeStream(symbol: string) {
    const key = symbol.toLowerCase();

    if (!this.aggTradeConnections[key]) {
      this.aggTradeConnections[key] = this.createAggTrade(key);
    }
  }

  getAggTradeStream(symbol: string): Observable<AggTradeWsMessage[]> {
    const key = symbol.toLowerCase();
    return this.aggTradeConnections[key].subject.asObservable();
  }

  disconnectAggTrade(symbol: string): void {
    const key = symbol.toLowerCase();
    const state = this.aggTradeConnections[key];

    if (state) {
      state.socket.close();
      delete this.aggTradeConnections[key];
    }
  }

  disconnectAllAggTrade(): void {
    Object.keys(this.aggTradeConnections).forEach((symbol) => {
      this.aggTradeConnections[symbol].socket.close();
    });
    this.aggTradeConnections = {};
  }

  private createAggTrade(symbol: string): AggTradeWs {
    const wsUrl = `${this.binanceMarketWSBaseUrl}/${symbol.toLowerCase()}@aggTrade`;
    const socket = new WebSocket(wsUrl);

    const aggTradeSubject = new Subject<AggTradeWsMessage[]>();
    const history: AggTradeWsMessage[] = [];

    socket.onopen = () => {
      // console.log(`[WS] AggTrade Connected: ${symbol}`);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        history.push(data);
        if (history.length > MAX_TRADE_HISTORY) {
          history.shift();
        }
        aggTradeSubject.next([...history]);
      } catch (e) {
        // console.error('[WS] AggTrade error:', e);
      }
    };

    socket.onclose = () => {
      // console.log(`[WS] AggTrade Reconnecting: ${symbol}`);
      setTimeout(() => {
        this.aggTradeConnections[symbol] = this.createAggTrade(symbol);
      }, 3000);
    };

    socket.onerror = (err) => {
      // console.error(`[WS] AggTrade Error: ${symbol}`, err);
      socket.close();
    };

    return {
      socket,
      subject: aggTradeSubject,
    };
  }
}
