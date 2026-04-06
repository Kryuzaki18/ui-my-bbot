import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Commons
import { Header } from '../../commons/header/header';

// Services
import { AggTradeWsMessage } from '../../core/models/chart.model';
import { BinanceWsService } from '../../core/services/binance-ws.service';

@Component({
  selector: 'app-home',
  imports: [Header],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  standalone: true,
})
export class Home {
  readonly aggTrades = signal<Record<string, AggTradeWsMessage[]>>({});

  defaultSymbols: string = 'btcusdt';

  private destroyRef = inject(DestroyRef);
  private binanceWsService = inject(BinanceWsService);

  ngOnInit(): void {
    this.watchAggTrades();
  }

  private watchAggTrades(): void {
    this.binanceWsService
      .getAggTradeStream(this.defaultSymbols)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.aggTrades.update((current) => ({
          ...current,
          [this.defaultSymbols]: data,
        }));
      });
  }
}
