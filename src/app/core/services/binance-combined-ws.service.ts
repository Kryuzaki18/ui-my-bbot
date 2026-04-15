import { Injectable, signal, OnDestroy, inject } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { retry } from 'rxjs/operators';

// Constants
import { STREAM_NAME } from '../constants/binance.constant';

// Services
import { AppSettingsService } from './app-settings.service';

@Injectable({ providedIn: 'root' })
export class BinanceCombinedWSService implements OnDestroy {
  private readonly appSettingsService = inject(AppSettingsService)
  private readonly binancePublicWSBaseUrl = this.appSettingsService.env().binancePublicWSBaseUrl;

  private socket$?: WebSocketSubject<any>;
  private requestId = 1; // Required for Binance request tracking

  public trades = signal<any>(null);
  public ticker24hr = signal<any>(null);
  public kline = signal<any>(null);
  public activeStreams = signal<string[]>([]);

  connect(symbol: string) {
    const s = symbol.toLowerCase();
    this.socket$ = webSocket(this.binancePublicWSBaseUrl);

    this.socket$.pipe(retry({ delay: 3000 })).subscribe({
      next: (msg) => this.dispatch(msg),
      error: (err) => console.error('Connection Error:', err),
    });

    this.toggleStream(s, STREAM_NAME.AGG_TRADE, true);
    this.toggleStream(s, STREAM_NAME.TICKER_24HR, true);
    this.toggleStream(s, STREAM_NAME.KLINE, true);
  }

  toggleStream(symbol: string, type: string, state: boolean) {
    const streamName = `${symbol.toLowerCase()}@${type}`;
    const method = state ? 'SUBSCRIBE' : 'UNSUBSCRIBE';

    this.socket$?.next({
      method: method,
      params: [streamName],
      id: this.requestId++,
    });
  }

  isLive(type: string): boolean {
    return this.activeStreams().some((s) => s.includes(type));
  }

  private dispatch(msg: any) {
    if (msg.result === null) {
      this.refreshActiveList();
      return;
    }

    if (Array.isArray(msg.result)) {
      this.activeStreams.set(msg.result);
      return;
    }

    switch (msg.e) {
      case STREAM_NAME.AGG_TRADE:
        this.trades.set(msg);
        break;
      case STREAM_NAME.TICKER_24HR:
        this.ticker24hr.set(msg);
        break;
      case STREAM_NAME.KLINE:
        this.kline.set(msg);
        break;
    }
  }

  private refreshActiveList(): void {
    this.socket$?.next({ method: 'LIST_SUBSCRIPTIONS', id: this.requestId++ });
  }

  disconnect(): void {
    this.socket$?.complete();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
