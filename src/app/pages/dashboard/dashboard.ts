import { Component, effect, signal } from '@angular/core';
import { Subscription } from 'rxjs';

// Services
import { BinanceService, BinanceWsPrice } from '../../core/services/binance.service';

// Components
import { Header } from '../../commons/header/header';
import { TradesTerminal } from '../../components/trades-terminal/trades-terminal';
import { MiniInfo } from "../../components/mini-info/mini-info";
import { OpenOrders } from "../../components/open-orders/open-orders";

@Component({
  selector: 'app-dashboard',
  imports: [Header, TradesTerminal, MiniInfo, OpenOrders],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  standalone: true,
})
export class Dashboard {
  symbols = ['btcusdt', 'ethusdt'];
  prices = signal<Record<string, BinanceWsPrice[]>>({});

  private subs: Subscription[] = [];

  constructor(private BinanceService: BinanceService) { }

  ngOnInit(): void {
    this.prices.set(this.symbols.reduce((acc, symbol) => ({ ...acc, [symbol]: [] }), {}));

    this.symbols.forEach((symbol) => {
      const sub = this.BinanceService.getPriceStream(symbol).subscribe((data) => {
        this.prices.update((current) => ({
          ...current,
          [symbol]: data,
        }));
      });

      this.subs.push(sub);
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
  }
}
