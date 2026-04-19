import {
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services
import { BinanceRestService } from '../../../core/services/binance-rest.service';
import { BinanceWsService } from '../../../core/services/binance-ws.service';
import { UtilsService } from '../../../core/services/utils.service';
import { ChartService } from '../../../core/services/chart/chart.service';
import { LocalStorageService } from '../../../core/services/local-storage.service';

// Models
import { ExchangeSymbolsWithVolume } from '../../../core/models/trades.model';
import { STORAGE } from '../../../core/constants/binance.constant';

// PrimeNG
import { TableModule } from 'primeng/table';
import { PopoverModule, Popover } from 'primeng/popover';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Table } from 'primeng/table';

@Component({
  selector: 'app-trading-symbols-popover',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    PopoverModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './trading-symbols-popover.component.html',
  styleUrl: './trading-symbols-popover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradingSymbolsPopoverComponent implements OnInit {
  @ViewChild('symbolsPopover') popover!: Popover;
  @ViewChild('dtSymbols', { static: false }) dtSymbols?: Table;

  private readonly destroyRef = inject(DestroyRef);
  private readonly binanceRestService = inject(BinanceRestService);
  private readonly binanceWsService = inject(BinanceWsService);
  private readonly chartService = inject(ChartService);
  private readonly localStorageService = inject(LocalStorageService);
  readonly utilsService = inject(UtilsService);

  readonly exchangeSymbols = signal<ExchangeSymbolsWithVolume[]>([]);
  readonly favorites = this.localStorageService.getLocalStorageSignal<string[]>(
    STORAGE.FAV_SYMBOLS,
    [],
  );

  readonly tableData = computed(() => {
    const favs = this.favorites() || [];
    const favsSet = new Set(favs);
    return this.exchangeSymbols().map((s) => ({
      ...s,
      isFavorite: favsSet.has(s.symbol),
    }));
  });

  ngOnInit(): void {
    this.binanceRestService
      .getAllSymbolsWithVolume()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.exchangeSymbols.set(res);
      });
  }

  onShow(): void {
    this.binanceWsService.wsAllTickers();

    this.binanceWsService.allTickers$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tickers) => {
        if (!tickers || tickers.length === 0) return;

        const tickerMap = new Map(tickers.map((t) => [t.s, t]));

        this.exchangeSymbols.update((current) => {
          let hasChanges = false;
          const updatedList = current.map((sym) => {
            const tick = tickerMap.get(sym.symbol);
            if (tick) {
              const lastPrice = parseFloat(tick.c);
              const priceChangePercent = parseFloat(tick.P);
              const quoteVolume = parseFloat(tick.q);

              if (
                sym.lastPrice !== lastPrice ||
                sym.priceChangePercent !== priceChangePercent ||
                sym.quoteVolume !== quoteVolume
              ) {
                hasChanges = true;
                return { ...sym, lastPrice, priceChangePercent, quoteVolume };
              }
            }
            return sym;
          });
          return hasChanges ? updatedList : current;
        });
      });
  }

  toggleFavorite(symbol: string, event: Event): void {
    event.stopPropagation();
    const currentList = this.favorites() || [];
    const currentSet = new Set(currentList);
    if (currentSet.has(symbol)) {
      currentSet.delete(symbol);
    } else {
      currentSet.add(symbol);
    }
    this.localStorageService.updateLocalStorageSignal(STORAGE.FAV_SYMBOLS, Array.from(currentSet));
  }

  toggle(event: Event): void {
    this.popover.toggle(event);
  }

  hide(): void {
    this.popover.hide();
  }

  selectSymbol(symbol: string): void {
    const getSymbol = this.localStorageService.getLocalStorageSignal(
      STORAGE.SYMBOL,
      symbol.toLowerCase(),
    );
    if (symbol.toLowerCase() === getSymbol().toLowerCase()) {
      return;
    }
    this.chartService.selectedSymbol.set(symbol);
    this.hide();
    window.location.reload();
  }
}
