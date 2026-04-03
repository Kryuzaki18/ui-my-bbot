import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Models
import { BinanceWsPrice } from '../../core/models/trades.model';

// Services
import { BinanceService } from '../../core/services/binance.service';

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
  defaultSymbols = ['btcusdt', 'ethusdt'];
  prices = signal<Record<string, BinanceWsPrice[]>>({});

  private destroyRef = inject(DestroyRef);
  private BinanceService = inject(BinanceService);

  ngOnInit(): void {
    this.getPriceStream();
  }

  private getPriceStream(): void {
    this.prices.set(this.defaultSymbols.reduce((acc, symbol) => ({ ...acc, [symbol]: [] }), {}));

    this.defaultSymbols.forEach((symbol) => {
      this.BinanceService.getPriceStream(symbol)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((data) => {
          this.prices.update((current) => ({
            ...current,
            [symbol]: data,
          }));
        });
    });
  }
}
