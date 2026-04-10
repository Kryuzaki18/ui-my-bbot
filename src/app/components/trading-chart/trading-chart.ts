import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
  HostListener,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

// Lightweight Charts
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  CrosshairMode,
  Time,
} from 'lightweight-charts';

// Constants
import {
  DEFAULT_TIMEFRAME,
  MAX_TRADE_HISTORY,
  STORAGE,
  STREAM_NAME,
  TIMEFRAMES,
} from '../../core/constants/binance.constant';

// Models
import {
  CandleData,
  TickerData,
  MarkPriceData,
  Timeframe,
  OhlcDisplay,
  AggTradeWsMessage,
  IndicatorType,
  IndicatorConfig,
  Ticker24hrData,
} from '../../core/models/chart.model';
import { TradingSymbolsPopoverComponent } from './trading-symbols-popover/trading-symbols-popover.component';

// Services
import { BinanceRestService } from '../../core/services/binance-rest.service';
import { BinanceWsService, WsStatus } from '../../core/services/binance-ws.service';
import { ChartService } from '../../core/services/chart/chart.service';
import { UtilsService } from '../../core/services/utils.service';
import { IndicatorMaService } from '../../core/services/chart/indicator-ma.service';
import { IndicatorMacdService } from '../../core/services/chart/indicator-macd.service';
import { IndicatorBollingerService } from '../../core/services/chart/indicator-bollinger.service';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { AppSettingsService } from '../../core/services/app-settings.service';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { PopoverModule } from 'primeng/popover';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-trading-chart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SkeletonModule,
    ScrollPanelModule,
    PopoverModule,
    DividerModule,
    TradingSymbolsPopoverComponent
  ],
  templateUrl: './trading-chart.html',
  styleUrls: ['./trading-chart.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradingChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('volumeContainer', { static: true }) volumeContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('indicatorMenuRef') indicatorMenuRef!: ElementRef<HTMLDivElement>;

  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly binanceRestService = inject(BinanceRestService);
  private readonly binanceWsService = inject(BinanceWsService);
  private readonly chartService = inject(ChartService);
  private readonly indicatorMaService = inject(IndicatorMaService);
  private readonly indicatorMacdService = inject(IndicatorMacdService);
  private readonly indicatorBollingerService = inject(IndicatorBollingerService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly appSettingsService = inject(AppSettingsService);
  readonly utilsService = inject(UtilsService);

  private chart!: IChartApi;
  private volumeChart!: IChartApi;
  private candleSeries!: ISeriesApi<'Candlestick'>;
  private volumeSeries!: ISeriesApi<'Histogram'>;

  // Indicator series references
  private maSeries: ISeriesApi<'Line'> | null = null;
  private emaSeries: ISeriesApi<'Line'> | null = null;
  private bbUpperSeries: ISeriesApi<'Line'> | null = null;
  private bbMiddleSeries: ISeriesApi<'Line'> | null = null;
  private bbLowerSeries: ISeriesApi<'Line'> | null = null;
  private macdLineSeries: ISeriesApi<'Line'> | null = null;
  private macdSignalSeries: ISeriesApi<'Line'> | null = null;
  private macdHistSeries: ISeriesApi<'Histogram'> | null = null;

  private readonly initCandles = signal<CandleData[]>([]);
  readonly aggTrades = signal<AggTradeWsMessage[]>([]);
  readonly showVolume = signal(true);
  readonly wsStatus = signal<WsStatus>('connecting');
  readonly ticker = signal<TickerData | null>(null);
  readonly ticker24hr = signal<Ticker24hrData | null>(null);
  readonly markPriceData = signal<MarkPriceData | null>(null);
  readonly openInterest = signal(0);
  readonly ohlc = signal<OhlcDisplay | null>(null);
  readonly timeframes: Timeframe[] = TIMEFRAMES;
  readonly currentPrice = signal(0);
  readonly previousPrice = signal(0);
  readonly MAX_TRADE_HISTORY = MAX_TRADE_HISTORY;
  readonly selectedSymbol = this.chartService.selectedSymbol();

  readonly selectedTimeframe = this.localStorageService.getLocalStorageSignal<Timeframe>(
    STORAGE.TIMEFRAME,
    DEFAULT_TIMEFRAME,
  );

  readonly showIndicatorMenu = signal(false);
  readonly indicators = signal<IndicatorConfig[]>([
    { type: 'MA', label: 'MA (20)', color: '#58a6ff', enabled: false },
    { type: 'EMA', label: 'EMA (20)', color: '#f0a500', enabled: false },
    { type: 'BB', label: 'BB (20, 2)', color: '#a371f7', enabled: false },
    { type: 'MACD', label: 'MACD (12, 26, 9)', color: '#3fb950', enabled: true },
  ]);

  readonly activeIndicatorCount = computed(() => this.indicators().filter((i) => i.enabled).length);

  readonly isLoadingMaxRecentTrades = computed(() => {
    return this.aggTrades()?.length > 0;
  });

  readonly wsStatusLabel = computed(() => {
    const s = this.wsStatus();
    if (s === 'live') return `${this.selectedSymbol.toUpperCase()} Perpetual`;
    if (s === 'connecting') return 'Connecting…';
    if (s === 'error') return 'Error — retrying…';
    return 'Reconnecting…';
  });

  readonly countdownFundingFee = computed(() => {
    const markPrice = this.markPriceData();
    const currentTime = Date.now();

    if (!markPrice || !markPrice.nextFundingTime) return '00:00:00';

    const diff = markPrice.nextFundingTime - currentTime;

    if (diff <= 0) return '00:00:00';

    const seconds = Math.floor((diff / 1000) % 60);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

    return [hours, minutes, seconds].map((v) => v.toString().padStart(2, '0')).join(':');
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showIndicatorMenu()) return;
    const menu = this.indicatorMenuRef?.nativeElement;
    if (menu && !menu.contains(event.target as Node)) {
      this.showIndicatorMenu.set(false);
    }
  }

  ngOnInit(): void {
    this.initAllWs();
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.subscribeAllWs();
      this.subscribeAllRest();
    });

    this.fetchKlines(this.selectedTimeframe());

    this.initCharts();
    this.movingTheChart();

    this.ngZone.runOutsideAngular(() => {
      this.subscribeWsKline();
    });
  }

  ngOnDestroy(): void {
    this.binanceWsService.closeAllWs();
    this.binanceWsService.disconnectAllAggTrade();
    this.chart?.remove();
    this.volumeChart?.remove();
  }

  private initAllWs(): void {
    this.binanceWsService.createAggTradeStream(this.selectedSymbol);
    this.binanceWsService.wsKline(this.selectedSymbol, this.selectedTimeframe());
    this.binanceWsService.wsMarkPrice(this.selectedSymbol);
    this.binanceWsService.wsTicker24h(this.selectedSymbol);
  }

  private subscribeAllWs(): void {
    this.subscribeWsStatus();
    this.subscribeWsAggTrades();
    this.subscribeWsMarkPrice();
    this.subscribeWsTicker24h();
  }

  private subscribeAllRest(): void {
    this.subscribeRestTicker();
    this.subscribeRestOpenInterest();
  }

  setTimeframe(tf: Timeframe): void {
    if (tf === this.selectedTimeframe()) return;
    this.localStorageService.updateLocalStorageSignal(STORAGE.TIMEFRAME, tf);
    this.fetchKlines(tf);
    this.binanceWsService.unsubscribeWs(STREAM_NAME.KLINE);
    this.binanceWsService.wsKline(this.selectedSymbol, tf);
    this.ngZone.runOutsideAngular(() => {
      this.subscribeWsKline();
    });
  }

  toggleVolume(): void {
    const next = !this.showVolume();
    this.showVolume.set(next);
    this.volumeContainerRef.nativeElement.style.display = next ? 'block' : 'none';
  }

  toggleIndicatorMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showIndicatorMenu.update((v) => !v);
  }

  toggleIndicator(type: IndicatorType, event: MouseEvent): void {
    event.stopPropagation();
    this.indicators.update((list) =>
      list.map((ind) => (ind.type === type ? { ...ind, enabled: !ind.enabled } : ind)),
    );
    this.renderAllIndicators();
  }

  isIndicatorEnabled(type: IndicatorType): boolean {
    return this.indicators().find((i) => i.type === type)?.enabled ?? false;
  }

  getIndicatorColor(type: IndicatorType): string {
    return this.indicators().find((i) => i.type === type)?.color ?? '#fff';
  }

  private initCharts(): void {
    const theme = this.chartService.currentTheme;
    const sharedOpts = {
      layout: {
        background: { color: theme.background },
        textColor: theme.text,
        fontSize: 11,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      },
      grid: { vertLines: { color: theme.grid }, horzLines: { color: theme.grid } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: theme.crosshair, labelBackgroundColor: theme.crosshair },
        horzLine: { color: theme.crosshair, labelBackgroundColor: theme.crosshair },
      },
      rightPriceScale: { borderColor: theme.border, scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: {
        borderColor: theme.border,
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
      },
      autoSize: false,
      localization: {
        timeFormatter: (timestamp: number) => {
          const date = new Date(timestamp * 1000);
          return new Intl.DateTimeFormat('en-GB', {
            weekday: 'short', // Mon
            day: 'numeric', // 1
            month: 'long', // April
            year: 'numeric', // 2026
            hour: 'numeric', // 1
            minute: '2-digit', // 00
            hour12: true, // am/pm
          })
            .format(date)
            .replace(',', '');
        },
      },
    };

    this.chart = createChart(this.chartContainerRef.nativeElement, {
      ...sharedOpts,
      width: this.chartContainerRef.nativeElement.clientWidth,
    });

    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: theme.up,
      downColor: theme.dn,
      borderUpColor: theme.up,
      borderDownColor: theme.dn,
      wickUpColor: theme.up,
      wickDownColor: theme.dn,
    });

    this.volumeChart = createChart(this.volumeContainerRef.nativeElement, {
      ...sharedOpts,
      rightPriceScale: { borderColor: theme.border, scaleMargins: { top: 0.1, bottom: 0 } },
      timeScale: { visible: true, borderColor: theme.border },
      width: this.volumeContainerRef.nativeElement.clientWidth,
    });

    this.volumeSeries = this.volumeChart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'right',
    });

    this.chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) this.volumeChart.timeScale().setVisibleLogicalRange(range);
    });

    this.chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) return;
      const d = param.seriesData.get(this.candleSeries) as any;
      const vd = param.seriesData.get(this.volumeSeries) as any;
      if (!d) return;
      this.ohlc.set({
        o: d.open.toFixed(7),
        h: d.high.toFixed(7),
        l: d.low.toFixed(7),
        c: d.close.toFixed(7),
        v: this.utilsService.fmtVol(vd?.value ?? 0),
        isUp: d.close >= d.open,
      });
    });

    this.chartService.theme$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((t) => this.applyTheme(t));
  }

  private applyTheme(t: any): void {
    const opt = {
      layout: { background: { color: t.background }, textColor: t.text },
      grid: { vertLines: { color: t.grid }, horzLines: { color: t.grid } },
    };
    this.chart?.applyOptions(opt);
    this.volumeChart?.applyOptions(opt);
    this.candleSeries?.applyOptions({
      upColor: t.up,
      downColor: t.dn,
      borderUpColor: t.up,
      borderDownColor: t.dn,
      wickUpColor: t.up,
      wickDownColor: t.dn,
    });
  }

  private movingTheChart(): void {
    if (!this.chart) return;

    const timeScale = this.chart.timeScale();
    const width = this.chartContainerRef.nativeElement.clientWidth;
    const barSpacing = timeScale.options().barSpacing;
    const barsInHalfScreen = width / 4 / barSpacing;
    timeScale.applyOptions({
      rightOffset: Math.floor(barsInHalfScreen),
    });

    timeScale.scrollToRealTime();
  }

  private fetchKlines(tf: Timeframe): void {
    this.binanceRestService
      .getKlines(this.selectedSymbol, tf, 1500)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (candles) => {
          this.applyKlineData(candles);
        },
        error: () => {
          setTimeout(() => this.fetchKlines(tf), 500);
        },
      });
  }

  private applyKlineData(candles: CandleData[]): void {
    this.initCandles.set(candles);
    // if (this.lastCandles.length > 0) {
    //   this.lastCandles.pop();
    // }
    const theme = this.chartService.currentTheme;

    const history = this.initCandles().map((d) => ({
      time: Math.floor(d.time) as Time, // Start time of the candle in seconds
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    this.candleSeries.setData(history);

    this.volumeSeries.setData(
      this.initCandles().map((c) => ({
        time: Math.floor(c.time) as Time, // Start time of the candle in seconds
        value: c.volume,
        color: c.close >= c.open ? theme.up + '55' : theme.dn + '55',
      })),
    );
    this.renderAllIndicators();
  }

  private subscribeWsStatus(): void {
    this.binanceWsService.status$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((s) => {
      if (!s) return;
      this.wsStatus.set(s.status);
    });
  }

  private subscribeWsAggTrades(): void {
    this.binanceWsService
      .getAggTradeStream(this.selectedSymbol)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        if (!data) return;
        this.aggTrades.set(data);
      });
  }

  private subscribeWsMarkPrice(): void {
    this.binanceWsService.markPrice$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((d) => {
      if (!d) return;
      this.markPriceData.set({
        markPrice: parseFloat(d?.p),
        indexPrice: parseFloat(d?.i),
        lastFundingRate: parseFloat(d?.r),
        nextFundingTime: d?.T,
      });
    });
  }

  private subscribeWsTicker24h(): void {
    this.binanceWsService.ticker24h$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((d) => {
      if (!d) return;

      const price = parseFloat(d.p);

      if (this.currentPrice() !== 0) {
        this.previousPrice.set(this.currentPrice());
      }

      this.currentPrice.set(price);

      this.ticker24hr.set({
        symbol: d.s,
        priceChange: price,
        priceChangePercent: parseFloat(d.P),
        lastPrice: parseFloat(d.c),
        highPrice: parseFloat(d.h),
        lowPrice: parseFloat(d.l),
        volume: parseFloat(d.v),
        quoteVolume: parseFloat(d.q),
      });
    });
  }

  private subscribeWsKline(): void {
    this.binanceWsService.kline$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((msg) => {
      if (!msg) return;

      const k = msg?.k;

      const time = Math.floor(k.t / 1000) as Time;
      const open = parseFloat(k.o);
      const high = parseFloat(k.h);
      const low = parseFloat(k.l);
      const close = parseFloat(k.c);
      const volume = parseFloat(k.v);
      const theme = this.chartService.currentTheme;

      this.candleSeries.update({
        time,
        open,
        high,
        low,
        close,
      });

      this.volumeSeries.update({
        time,
        value: volume,
        color: close >= open ? theme.up + '55' : theme.dn + '55',
      });

      this.ohlc.set({
        o: open.toFixed(7),
        h: high.toFixed(7),
        l: low.toFixed(7),
        c: close.toFixed(7),
        v: this.utilsService.fmtVol(volume),
        isUp: close >= open,
      });
    });
  }

  private subscribeRestTicker(): void {
    this.binanceRestService
      .getTicker(this.selectedSymbol)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.ticker.set(res);
      });
  }

  private subscribeRestOpenInterest(): void {
    this.binanceRestService
      .getOpenInterest(this.selectedSymbol)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.openInterest.set(res.openInterest);
      });
  }

  private renderAllIndicators(): void {
    const candles = this.initCandles();
    if (!candles.length) return;

    this.renderMA(candles);
    this.renderEMA(candles);
    this.renderBollinger(candles);
    this.renderMacd(candles);
  }

  private renderMA(candles: CandleData[]): void {
    const enabled = this.isIndicatorEnabled('MA');
    const color = this.getIndicatorColor('MA');

    if (!enabled) {
      if (this.maSeries) {
        this.chart.removeSeries(this.maSeries);
        this.maSeries = null;
      }
      return;
    }

    const data = this.indicatorMaService.calculateSMA(candles, 20);
    if (!this.maSeries) {
      this.maSeries = this.chart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }
    this.maSeries.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
  }

  private renderEMA(candles: CandleData[]): void {
    const enabled = this.isIndicatorEnabled('EMA');
    const color = this.getIndicatorColor('EMA');

    if (!enabled) {
      if (this.emaSeries) {
        this.chart.removeSeries(this.emaSeries);
        this.emaSeries = null;
      }
      return;
    }

    const data = this.indicatorMaService.calculateEMA(candles, 20);
    if (!this.emaSeries) {
      this.emaSeries = this.chart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }
    this.emaSeries.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
  }

  private renderBollinger(candles: CandleData[]): void {
    const enabled = this.isIndicatorEnabled('BB');
    const color = this.getIndicatorColor('BB');

    if (!enabled) {
      if (this.bbUpperSeries) {
        this.chart.removeSeries(this.bbUpperSeries);
        this.bbUpperSeries = null;
      }
      if (this.bbMiddleSeries) {
        this.chart.removeSeries(this.bbMiddleSeries);
        this.bbMiddleSeries = null;
      }
      if (this.bbLowerSeries) {
        this.chart.removeSeries(this.bbLowerSeries);
        this.bbLowerSeries = null;
      }
      return;
    }

    const data = this.indicatorBollingerService.calculate(candles, 20, 2);
    const lineOpts = {
      color,
      lineWidth: 1 as const,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    };

    if (!this.bbUpperSeries) this.bbUpperSeries = this.chart.addSeries(LineSeries, { ...lineOpts });
    if (!this.bbMiddleSeries)
      this.bbMiddleSeries = this.chart.addSeries(LineSeries, { ...lineOpts, lineStyle: 2 });
    if (!this.bbLowerSeries) this.bbLowerSeries = this.chart.addSeries(LineSeries, { ...lineOpts });

    this.bbUpperSeries.setData(data.map((p) => ({ time: p.time as Time, value: p.upper })));
    this.bbMiddleSeries.setData(data.map((p) => ({ time: p.time as Time, value: p.middle })));
    this.bbLowerSeries.setData(data.map((p) => ({ time: p.time as Time, value: p.lower })));
  }

  private renderMacd(candles: CandleData[]): void {
    const enabled = this.isIndicatorEnabled('MACD');
    const color = this.getIndicatorColor('MACD');

    if (!enabled) {
      if (this.macdLineSeries) {
        this.volumeChart.removeSeries(this.macdLineSeries);
        this.macdLineSeries = null;
      }
      if (this.macdSignalSeries) {
        this.volumeChart.removeSeries(this.macdSignalSeries);
        this.macdSignalSeries = null;
      }
      if (this.macdHistSeries) {
        this.volumeChart.removeSeries(this.macdHistSeries);
        this.macdHistSeries = null;
      }
      // Restore volume series visibility
      this.volumeSeries.applyOptions({ visible: true });
      return;
    }

    const data = this.indicatorMacdService.calculate(candles);
    if (!data.length) return;

    // Hide volume bars when MACD is active
    this.volumeSeries.applyOptions({ visible: false });

    if (!this.macdHistSeries) {
      this.macdHistSeries = this.volumeChart.addSeries(HistogramSeries, {
        priceScaleId: 'right',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
    }
    if (!this.macdLineSeries) {
      this.macdLineSeries = this.volumeChart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }
    if (!this.macdSignalSeries) {
      this.macdSignalSeries = this.volumeChart.addSeries(LineSeries, {
        color: '#f85149',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }

    this.macdHistSeries.setData(
      data.map((p) => ({
        time: p.time as Time,
        value: p.histogram,
        color: p.histogram >= 0 ? '#3fb95055' : '#f8514955',
      })),
    );
    this.macdLineSeries.setData(data.map((p) => ({ time: p.time as Time, value: p.macd })));
    this.macdSignalSeries.setData(data.map((p) => ({ time: p.time as Time, value: p.signal })));
  }
}
