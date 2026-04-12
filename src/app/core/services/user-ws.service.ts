import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

// Environments
import { API_ROUTES, environment } from '../../../environments/environment';

// Constants
import { KEEP_ALIVE_USER_DATA_STREAM } from '../constants/binance.constant';

interface UserStream {
  listenKey: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserWsService {
  private userDataListenKey: string | null = null;
  private userDataWs: WebSocket | null = null;
  private userDataPingInterval: any;
  private readonly userData$ = new Subject<any>();
  private readonly http = inject(HttpClient);

  getUserDataStream(): Observable<any> {
    return this.userData$.asObservable();
  }

  startUserDataStream(): void {
    if (this.userDataWs) return;

    this.http
      .post<UserStream>(`${environment.apiTradingBotUrl}${API_ROUTES.user.userDataStream}`, {})
      .subscribe({
        next: (res) => {
          this.userDataListenKey = res.listenKey;
          this.connectUserDataWebSocket();

          this.userDataPingInterval = setInterval(() => {
            this.keepAliveUserDataStream();
          }, KEEP_ALIVE_USER_DATA_STREAM);
        },
        error: (err) => console.error('Failed to start user data stream', err),
      });
  }

  stopUserDataStream(): void {
    if (this.userDataPingInterval) {
      clearInterval(this.userDataPingInterval);
    }
    if (this.userDataWs) {
      this.userDataWs.onclose = null; // prevent reconnect
      this.userDataWs.close();
      this.userDataWs = null;
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

    const WS_URL = `${environment.binanceWSBaseUrl}/${this.userDataListenKey}`;
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      // console.log(`[WS] User Data Stream Connected`);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // if (
      //   [BinanceWsEventTypeEnum.ACCOUNT_UPDATE, BinanceWsEventTypeEnum.ORDER_TRADE_UPDATE].includes(
      //     data.e,
      //   )
      // ) {
      this.userData$.next(data);
      // }
    };

    socket.onclose = () => {
      // console.log(`[WS] User Data Stream Reconnecting...`);
      setTimeout(() => {
        this.connectUserDataWebSocket();
      }, 5000);
    };

    socket.onerror = (err) => {
      // console.error(`[WS] User Data Stream Error`, err);
      socket.close();
    };

    this.userDataWs = socket;
  }

  private keepAliveUserDataStream(): void {
    this.http
      .put<UserStream>(`${environment.apiTradingBotUrl}${API_ROUTES.user.userDataStream}`, {})
      .subscribe({
        error: (err) => console.error('Failed to keep-alive listenKey', err),
      });
  }
}