import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Models
import { ChartTheme, OpenOrderChartLine, PositionChartData, Timeframe } from '../../models/chart.model';

// Constants
import { DEFAULT_SYMBOL, DEFAULT_TIMEFRAME, STORAGE } from '../../constants/binance.constant';

// Services
import { LocalStorageService } from '../local-storage.service';

@Injectable({ providedIn: 'root' })
export class ChartService {
  private readonly localStorageService = inject(LocalStorageService);
  private themeSubject = new BehaviorSubject<ChartTheme>(this.buildTheme());
  private positionChartDataSubject = new BehaviorSubject<PositionChartData | null>(null);
  private openOrdersChartDataSubject = new BehaviorSubject<OpenOrderChartLine[]>([]);

  readonly selectedSymbol = this.localStorageService.getLocalStorageSignal<string>(
    STORAGE.SYMBOL,
    DEFAULT_SYMBOL,
  );

  readonly selectedTimeframe = this.localStorageService.getLocalStorageSignal<Timeframe>(
    STORAGE.TIMEFRAME,
    DEFAULT_TIMEFRAME,
  );

  readonly theme$ = this.themeSubject.asObservable();
  readonly positionChartData$ = this.positionChartDataSubject.asObservable();
  readonly openOrdersChartData$ = this.openOrdersChartDataSubject.asObservable();

  setPositionChartData(data: PositionChartData | null): void {
    this.positionChartDataSubject.next(data);
  }

  setOpenOrdersChartData(orders: OpenOrderChartLine[]): void {
    this.openOrdersChartDataSubject.next(orders);
  }

  get currentTheme(): ChartTheme {
    return this.themeSubject.value;
  }

  private buildTheme(): ChartTheme {
    // return this.isDark
    // ?
    return {
      background: '#0d1117',
      surface: '#161b22',
      border: '#21262d',
      text: '#c9d1d9',
      textMuted: '#8b949e',
      grid: '#161b22',
      up: '#3fb950',
      dn: '#f85149',
      crosshair: '#58a6ff',
    };
    // :

    // {
    //     background: '#ffffff',
    //     surface: '#f6f8fa',
    //     border: '#d0d7de',
    //     text: '#1f2328',
    //     textMuted: '#656d76',
    //     grid: '#f6f8fa',
    //     up: '#1a7f37',
    //     dn: '#cf222e',
    //     crosshair: '#0969da',
    //   };
  }
}
