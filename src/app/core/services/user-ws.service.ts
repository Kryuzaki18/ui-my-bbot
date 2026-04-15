import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

// Environments
import { API_ROUTES } from '../../../environments/environment';

// Constants
import { KEEP_ALIVE_USER_DATA_STREAM } from '../constants/binance.constant';

// Services
import { AppSettingsService } from './app-settings.service';

interface UserStream {
  listenKey: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserWsService {
  private readonly http = inject(HttpClient);
  private readonly appSettingsService = inject(AppSettingsService);

  private get apiBaseUrl(): string {
    return this.appSettingsService.env().apiBaseUrl;
  }

  private get binanceWSBaseUrl(): string {
    return this.appSettingsService.env().binanceWSBaseUrl;
  }

  private readonly userData$ = new Subject<any>();

  private userDataListenKey: string | null = null;
  private userDataWs: WebSocket | null = null;
  private userDataPingInterval: any;

  getUserDataStream(): Observable<any> {
    return this.userData$.asObservable();
  }

  startUserDataStream(): void {
    if (this.userDataWs) return;

    this.http
      .post<UserStream>(`${this.apiBaseUrl}${API_ROUTES.user.userDataStream}`, {})
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
      this.http.delete(`${this.apiBaseUrl}${API_ROUTES.user.userDataStream}`).subscribe();
      this.userDataListenKey = null;
    }
  }

  private connectUserDataWebSocket(): void {
    if (!this.userDataListenKey) return;

    const WS_URL = `${this.binanceWSBaseUrl}/${this.userDataListenKey}`;
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
    this.http.put<UserStream>(`${this.apiBaseUrl}${API_ROUTES.user.userDataStream}`, {}).subscribe({
      error: (err) => console.error('Failed to keep-alive listenKey', err),
    });
  }
}
