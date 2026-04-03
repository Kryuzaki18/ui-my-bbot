import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

// Environment
import { environment } from '../../../environments/environment';

// Constants
import { TRADE } from '../constants/binance.constant';

// Models
import { BinanceWsPrice, SymbolState } from '../models/trades.model';

@Injectable({
  providedIn: 'root',
})
export class BinanceService {
  private states: Record<string, SymbolState> = {};

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
  disconnect(symbol: string): void {
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
  disconnectAll(): void {
    Object.keys(this.states).forEach((symbol) => {
      this.states[symbol].socket.close();
    });
    this.states = {};
  }
}
