import { Injectable, signal, OnDestroy } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BinanceCombinedWSService implements OnDestroy {
  private readonly publicWsBase = environment.binancePublicWSBaseUrl;
  private socket$?: WebSocketSubject<any>;
  private requestId = 1; // Required for Binance request tracking

  // 1. Using Signals for State (Best for UI)
  public trades = signal<any>(null);
  public ticker24hr = signal<any>(null);
  public kline = signal<any>(null);
  public activeStreams = signal<string[]>([]); // Track what is actually ON

  connect(symbol: string) {
    const s = symbol.toLowerCase();
    // Using /ws/ path is better for dynamic SUBSCRIBE/UNSUBSCRIBE
    const url = `${this.publicWsBase}/ws/`;

    this.socket$ = webSocket(url);

    this.socket$.pipe(retry({ delay: 3000 })).subscribe({
      next: (msg) => this.dispatch(msg),
      error: (err) => console.error('Connection Error:', err),
    });

    // Initial Subscriptions
    this.toggleStream(s, 'aggTrade', true);
    this.toggleStream(s, '24hrTicker', true);
    this.toggleStream(s, 'kline_1m', true);
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
      case 'aggTrade':
        this.trades.set(msg);
        break;
      case '24hrTicker':
        this.ticker24hr.set(msg);
        break;
      case 'kline':
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
