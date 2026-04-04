import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

// Environments
import { API_ROUTES, environment } from '../../../environments/environment';

// Models
import { BinanceWsEventTypeEnum } from '../models/trades.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private userDataListenKey: string | null = null;
  private userDataSocket: WebSocket | null = null;
  private userDataPingInterval: any;
  private userDataSubject = new Subject<any>();

  constructor(private http: HttpClient) {}

  getUserInfo(): Observable<any> {
    return this.http.get(`${environment.apiTradingBotUrl}${API_ROUTES.user.userInfo}`);
  }

  getUserDataStream(): Observable<any> {
    return this.userDataSubject.asObservable();
  }

  startUserDataStream(): void {
    if (this.userDataSocket) return;

    this.http
      .post<{
        listenKey: string;
      }>(`${environment.apiTradingBotUrl}${API_ROUTES.user.userDataStream}`, {})
      .subscribe({
        next: (res) => {
          this.userDataListenKey = res.listenKey;
          this.connectUserDataWebSocket();

          // keepalive — Binance requires a PUT every 30–60 minutes
          this.userDataPingInterval = setInterval(
            () => {
              this.keepAliveUserDataStream();
            },
            30 * 60 * 1000,
          );
        },
        error: (err) => console.error('Failed to start user data stream', err),
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
      this.http
        .delete(`${environment.apiTradingBotUrl}${API_ROUTES.user.userDataStream}`)
        .subscribe();
      this.userDataListenKey = null;
    }
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
      if (
        [BinanceWsEventTypeEnum.ACCOUNT_UPDATE, BinanceWsEventTypeEnum.ORDER_TRADE_UPDATE].includes(
          data.e,
        )
      ) {
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
    this.http
      .put(`${environment.apiTradingBotUrl}${API_ROUTES.user.userDataStream}`, {})
      .subscribe({
        error: (err) => console.error('Failed to keep-alive listenKey', err),
      });
  }
}
