import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

// Environment
import { environment } from '../../../environments/environment';

// Models
import { AggTradeWsMessage, KlineWsMessage, Timeframe } from '../models/chart.model';
import { MAX_TRADE_HISTORY } from '../constants/binance.constant';

export type WsStatus = 'connecting' | 'live' | 'error' | 'closed';

export interface AggTradeWs {
  socket: WebSocket;
  subject: Subject<AggTradeWsMessage[]>;
}

@Injectable({
  providedIn: 'root',
})
export class BinanceWsService {
  private readonly marketWsBase = environment.binanceMarketWSBaseUrl;

  private aggTradeConnections: Record<string, AggTradeWs> = {};
  private connections = new Map<string, WebSocket>();

  /** Reconnect delay: 1s, 2s, 4s, 8s … capped at 30s */
  private retryDelays = [1000, 2000, 4000, 8000, 16000, 30000];
  private retryAttempts = new Map<string, number>();

  // ── Status stream ───────────────────────────────────────────────────────
  private statusSubject = new Subject<{ url: string; status: WsStatus }>();
  readonly status$ = this.statusSubject.asObservable();

  // ── Kline stream ────────────────────────────────────────────────────────
  private klineSubject = new Subject<KlineWsMessage>();
  readonly kline$ = this.klineSubject.asObservable();

  // ── Mark price stream ───────────────────────────────────────────────────
  private markPriceSubject = new Subject<any>();
  readonly markPrice$ = this.markPriceSubject.asObservable();

  wsKline(symbol: string, interval: Timeframe): void {
    const url = `${this.marketWsBase}/${symbol.toLowerCase()}@kline_${interval}`;
    this.connect(url, (data) => {
      if (data.e === 'kline') {
        this.klineSubject.next(data as KlineWsMessage);
      }
    });
  }

  wsMarkPrice(symbol: string, timeInterval: string = '@1s'): void {
    const url = `${this.marketWsBase}/${symbol.toLowerCase()}@markPrice${timeInterval}`;
    this.connect(url, (data) => {
      if (data.e === 'markPriceUpdate') {
        this.markPriceSubject.next(data);
      }
    });
  }

  unsubscribe(streamKey: string): void {
    const ws = this.connections.get(streamKey);
    if (ws) {
      ws.onclose = null;
      ws.close();
      this.connections.delete(streamKey);
      this.retryAttempts.delete(streamKey);
    }
  }

  closeAll(): void {
    this.connections.forEach((ws, key) => {
      ws.onclose = null;
      ws.close();
    });
    this.connections.clear();
    this.retryAttempts.clear();
  }

  private connect(url: string, onMessage: (data: any) => void): void {
    this.unsubscribe(url);

    this.statusSubject.next({ url, status: 'connecting' });

    const ws = new WebSocket(url);
    this.connections.set(url, ws);

    ws.onopen = () => {
      this.retryAttempts.set(url, 0);
      this.statusSubject.next({ url, status: 'live' });
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('[BinanceWs] Parse error:', e);
      }
    };

    ws.onerror = () => {
      this.statusSubject.next({ url, status: 'error' });
    };

    ws.onclose = () => {
      this.statusSubject.next({ url, status: 'closed' });
      this.scheduleReconnect(url, onMessage);
    };
  }

  private scheduleReconnect(url: string, onMessage: (data: any) => void): void {
    const attempt = (this.retryAttempts.get(url) ?? 0) + 1;
    this.retryAttempts.set(url, attempt);
    const delay = this.retryDelays[Math.min(attempt - 1, this.retryDelays.length - 1)];

    setTimeout(() => {
      if (this.connections.has(url) || !url) return;
      this.connect(url, onMessage);
    }, delay);
  }

  // wsAggTrade(symbol: string): void {
  //   const url = `${this.marketWsBase}/${symbol.toLowerCase()}@aggTrade`;
  //   this.connect(url, (data) => {
  //     if (data.e === 'aggTrade') {
  //       this.aggTradeSubject.next(data as AggTradeWsMessage);
  //     }
  //   });
  // }

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
    const wsUrl = `${this.marketWsBase}/${symbol.toLowerCase()}@aggTrade`;
    const socket = new WebSocket(wsUrl);

    const aggTradeSubject = new Subject<AggTradeWsMessage[]>();
    const history: AggTradeWsMessage[] = [];

    socket.onopen = () => {
      console.log(`[WS] AggTrade Connected: ${symbol}`);
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
        console.error('[WS] AggTrade error:', e);
      }
    };

    socket.onclose = () => {
      console.log(`[WS] AggTrade Reconnecting: ${symbol}`);
      setTimeout(() => {
        this.aggTradeConnections[symbol] = this.createAggTrade(symbol);
      }, 3000);
    };

    socket.onerror = (err) => {
      console.error(`[WS] AggTrade Error: ${symbol}`, err);
      socket.close();
    };

    return {
      socket,
      subject: aggTradeSubject
    };
  }
}
