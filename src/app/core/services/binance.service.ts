import { Injectable } from '@angular/core';
import { map, Observable, Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// Environment
import { environment } from '../../../environments/environment';

// Constants
import { STORAGE, TRADE } from '../constants/binance.constant';

// Services
import { StorageService } from './storage.service';

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
  private userDataListenKey: string | null = null;
  private userDataSocket: WebSocket | null = null;
  private userDataPingInterval: any;
  private userDataSubject = new Subject<any>();

  constructor(private http: HttpClient, private storageService: StorageService) {}

  private get authHeaders() {
    return new HttpHeaders().set('Authorization', `Bearer ${this.storageService.getLocal(STORAGE.lToken)}`);
  }

  // ==== REST API METHODS ====

  signIn(apiKey: string, apiSecret: string, useTestnet: boolean): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${environment.apiTradingBotUrl}/api/auth/signin`, {
      apiKey,
      apiSecret,
      useTestnet
    }).pipe(
      map((res) => {
        this.storageService.setLocal(STORAGE.lToken, res.token);
        return res;
      })
    );
  }

  signOut() {
    return this.http.post(`${environment.apiTradingBotUrl}/api/auth/signout`, {}, { headers: this.authHeaders });
  }

  placeOrder(body: any): Observable<any> {
    return this.http.post(`${environment.apiTradingBotUrl}/api/futures/order`, body, { headers: this.authHeaders });
  }

  takeProfit(body: any): Observable<any> {
    return this.http.post(`${environment.apiTradingBotUrl}/api/futures/take-profit`, body, { headers: this.authHeaders });
  }

  stopLoss(body: any): Observable<any> {
    return this.http.post(`${environment.apiTradingBotUrl}/api/futures/stop-loss`, body, { headers: this.authHeaders });
  }

  cancelOrder(symbol: string, orderId: number): Observable<any> {
    return this.http.post(`${environment.apiTradingBotUrl}/api/futures/cancel`, { symbol, orderId }, { headers: this.authHeaders });
  }

  getOpenOrders(symbol?: string): Observable<any[]> {
    let url = `${environment.apiTradingBotUrl}/api/futures/open-orders`;
    if (symbol) url += `?symbol=${symbol}`;
    return this.http.get<any[]>(url, { headers: this.authHeaders });
  }

  getUserInfo(): Observable<any> {
    return this.http.get(`${environment.apiTradingBotUrl}/api/user-info`, { headers: this.authHeaders });
  }

  // ==== USER DATA STREAM METHODS ====

  getUserDataStream(): Observable<any> {
    return this.userDataSubject.asObservable();
  }

  startUserDataStream(): void {
    if (this.userDataSocket) return;

    this.http.post<{listenKey: string}>(`${environment.apiTradingBotUrl}/api/user-stream`, {}, { headers: this.authHeaders })
      .subscribe({
        next: (res) => {
          this.userDataListenKey = res.listenKey;
          this.connectUserDataWebSocket();
          
          // Ping every 30 mins (1800000 ms)
          this.userDataPingInterval = setInterval(() => {
            this.keepAliveUserDataStream();
          }, 1800000);
        },
        error: (err) => console.error('Failed to start user data stream', err)
      });
  }

  private connectUserDataWebSocket(): void {
    if (!this.userDataListenKey) return;
    
    const WS_URL = `${environment.binanceFutureWebSocketBaseUrl}/${this.userDataListenKey}`;
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log(`[WS] User Data Stream Connected`);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.e === 'ACCOUNT_UPDATE' || data.e === 'ORDER_TRADE_UPDATE') {
        this.userDataSubject.next(data);
      }
    };

    socket.onclose = () => {
      console.log(`[WS] User Data Stream Reconnecting...`);
      setTimeout(() => {
        this.connectUserDataWebSocket();
      }, 5000);
    };

    socket.onerror = (err) => {
      console.error(`[WS] User Data Stream Error`, err);
      socket.close();
    };

    this.userDataSocket = socket;
  }

  private keepAliveUserDataStream(): void {
    this.http.put(`${environment.apiTradingBotUrl}/api/user-stream`, {}, { headers: this.authHeaders })
      .subscribe({
        error: (err) => console.error('Failed to keep-alive listenKey', err)
      });
  }

  stopUserDataStream(): void {
    if (this.userDataPingInterval) {
      clearInterval(this.userDataPingInterval);
    }
    if (this.userDataSocket) {
      this.userDataSocket.onclose = null; // prevent reconnect
      this.userDataSocket.close();
      this.userDataSocket = null;
    }
    if (this.userDataListenKey) {
      this.http.delete(`${environment.apiTradingBotUrl}/api/user-stream`, { headers: this.authHeaders }).subscribe();
      this.userDataListenKey = null;
    }
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