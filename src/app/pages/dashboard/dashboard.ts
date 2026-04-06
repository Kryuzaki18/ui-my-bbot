import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Constant
import { MAX_TRADE_HISTORY } from '../../core/constants/binance.constant';

// Models
import { AggTradeWsMessage } from '../../core/models/chart.model';

// Services
import { BinanceWsService } from '../../core/services/binance-ws.service';

// Components
import { Header } from '../../commons/header/header';
import { TradesTerminal } from '../../components/trades-terminal/trades-terminal';
import { MiniInfo } from '../../components/mini-info/mini-info';
import { OpenOrders } from '../../components/open-orders/open-orders';

@Component({
  selector: 'app-dashboard',
  imports: [Header, TradesTerminal, MiniInfo, OpenOrders],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  standalone: true,
})
export class Dashboard implements OnInit {
  readonly aggTrades = signal<Record<string, AggTradeWsMessage[]>>({});

  defaultSymbols = ['btcusdt', 'ethusdt'];

  private destroyRef = inject(DestroyRef);
  private binanceWsService = inject(BinanceWsService);

  ngOnInit(): void {
    this.watchAggTrades();
  }

  private watchAggTrades(): void {
    this.aggTrades.set(this.defaultSymbols.reduce((acc, symbol) => ({ ...acc, [symbol]: [] }), {}));

    this.defaultSymbols.forEach((symbol) => {
      this.binanceWsService
        .getAggTradeStream(symbol)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((data) => {
          this.aggTrades.update((current) => ({
            ...current,
            [symbol]: data,
          }));
        });
    });
  }

}
