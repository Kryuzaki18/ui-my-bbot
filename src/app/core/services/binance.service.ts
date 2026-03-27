import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from '../../../environments/environment';

import { TRADE } from '../constants/binance.constant';

export interface BinanceWsPrice {
  symbol: string;
  time: number;
  price: number;
}

interface SymbolState {
  socket: WebSocket;
  subject: Subject<BinanceWsPrice[]>;
  history: BinanceWsPrice[];
  lastPrice: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class BinanceService {
  private states: Record<string, SymbolState> = {};

  constructor(private http: HttpClient) {}

  public get token(): string | null {
    return localStorage.getItem('binance_jwt');
  }

  public set token(val: string | null) {
    if (val) localStorage.setItem('binance_jwt', val);
    else localStorage.removeItem('binance_jwt');
  }

  private get authHeaders() {
    return new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
  }

  // ==== REST API METHODS ====

  signIn(apiKey: string, apiSecret: string, useTestnet: boolean): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${environment.apiTradingBotUrl}/api/auth/signin`, {
      apiKey,
      apiSecret,
      useTestnet
    });
  }

  signOut() {
    this.token = null;
  }

  placeOrder(body: any): Observable<any> {
    return this.http.post(`${environment.apiTradingBotUrl}/api/futures/order`, body, { headers: this.authHeaders });
  }

  takeProfit(body: any): Observable<any> {
    return this.http.post(`${environment.apiTradingBotUrl}/api/futures/take-profit`, body, { headers: this.authHeaders });
  }

  cancelOrder(symbol: string, orderId: number): Observable<any> {
    return this.http.post(`${environment.apiTradingBotUrl}/api/futures/cancel`, { symbol, orderId }, { headers: this.authHeaders });
  }

  // ==== WEBSOCKET METHODS ====

  /**
   * Factory method: returns shared observable per symbol
   */
  getPriceStream(symbol: string): Observable<BinanceWsPrice[]> {
    const key = symbol.toLowerCase();

    if (!this.states[key]) {
      this.states[key] = this.createState(key);
    }

    return this.states[key].subject.asObservable();
  }

  /**
   * Create WebSocket + state per symbol
   */
  private createState(symbol: string): SymbolState {
    const WS_URL = `${environment.binanceFutureWebSocketBaseUrl}/${symbol}@trade`;

    const subject = new Subject<BinanceWsPrice[]>();
    const history: BinanceWsPrice[] = [];
    let lastPrice: number | null = null;

    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log(`[WS] Connected: ${symbol}`);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      const price = parseFloat(data.p);
      const time = data.E;

      // avoid flicker / duplicate updates
      if (lastPrice === price || price === 0) return;
      lastPrice = price;

      const newItem: BinanceWsPrice = {
        symbol: symbol.toUpperCase(),
        time,
        price,
      };

      history.push(newItem);

      if (history.length > TRADE.maxHistory) {
        history.shift();
      }

      subject.next([...history]);
    };

    socket.onclose = () => {
      console.log(`[WS] Reconnecting: ${symbol}`);
      setTimeout(() => {
        this.states[symbol] = this.createState(symbol);
      }, 3000);
    };

    socket.onerror = (err) => {
      console.error(`[WS] Error: ${symbol}`, err);
      socket.close();
    };

    return {
      socket,
      subject,
      history,
      lastPrice,
    };
  }

  /**
   * Disconnect a symbol
   */
  disconnect(symbol: string) {
    const key = symbol.toLowerCase();
    const state = this.states[key];

    if (state) {
      state.socket.close();
      delete this.states[key];
    }
  }

  /**
   * Disconnect all
   */
  disconnectAll() {
    Object.keys(this.states).forEach((symbol) => {
      this.states[symbol].socket.close();
    });
    this.states = {};
  }
}