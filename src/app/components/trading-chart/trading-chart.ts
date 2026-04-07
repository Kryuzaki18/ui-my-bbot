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
  input,
  HostListener,
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
import { DEFAULT_TIMEFRAME, SYMBOLS, TIMEFRAMES } from '../../core/constants/binance.constant';

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
} from '../../core/models/chart.model';

// Services
import { BinanceRestService } from '../../core/services/binance-rest.service';
import { BinanceWsService, WsStatus } from '../../core/services/binance-ws.service';
import { ChartThemeService } from '../../core/services/chart-theme.service';
import { UtilsService } from '../../core/services/utils.service';
import { IndicatorMaService } from '../../core/services/indicator-ma.service';
import { IndicatorMacdService } from '../../core/services/indicator-macd.service';
import { IndicatorBollingerService } from '../../core/services/indicator-bollinger.service';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-trading-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TableModule, SkeletonModule],
  templateUrl: './trading-chart.html',
  styleUrls: ['./trading-chart.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradingChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('volumeContainer', { static: true }) volumeContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('indicatorMenuRef') indicatorMenuRef!: ElementRef<HTMLDivElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly binanceRestService = inject(BinanceRestService);
  private readonly binanceWsService = inject(BinanceWsService);
  private readonly chartThemeService = inject(ChartThemeService);
  readonly utilsService = inject(UtilsService);
  private readonly indicatorMaService = inject(IndicatorMaService);
  private readonly indicatorMacdService = inject(IndicatorMacdService);
  private readonly indicatorBollingerService = inject(IndicatorBollingerService);

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

  // Cached candle data for re-render on toggle
  private lastCandles: CandleData[] = [];

  readonly aggTrades = input<Record<string, AggTradeWsMessage[]>>({});
  readonly currentTf = signal<Timeframe>(DEFAULT_TIMEFRAME);
  readonly showVolume = signal(true);
  readonly wsStatus = signal<WsStatus>('connecting');
  readonly ticker = signal<TickerData | null>(null);
  readonly markPriceData = signal<MarkPriceData | null>(null);
  readonly openInterest = signal(0);
  readonly ohlc = signal<OhlcDisplay | null>(null);
  readonly timeframes: Timeframe[] = TIMEFRAMES;
  readonly SYMBOLS = SYMBOLS;

  // Indicator state
  readonly showIndicatorMenu = signal(false);
  readonly indicators = signal<IndicatorConfig[]>([
    { type: 'MA', label: 'MA (20)', color: '#58a6ff', enabled: false },
    { type: 'EMA', label: 'EMA (20)', color: '#f0a500', enabled: false },
    { type: 'BB', label: 'BB (20, 2)', color: '#a371f7', enabled: false },
    { type: 'MACD', label: 'MACD (12, 26, 9)', color: '#3fb950', enabled: true },
  ]);

  readonly activeIndicatorCount = computed(() => this.indicators().filter((i) => i.enabled).length);

  readonly price = computed(() => {
    const p = this.aggTrades()[SYMBOLS.BTCUSDT]?.at(-1)?.p || 0;
    return Number(p);
  });

  readonly prevPrice = computed(() => {
    const p = this.aggTrades()[SYMBOLS.BTCUSDT]?.at(-2)?.p || 0;
    return Number(p);
  });

  readonly priceClass = computed(() => {
    const cur = this.price(),
      prev = this.prevPrice();
    if (cur > prev) return 'text-green-400';
    if (cur < prev) return 'text-red-700';
    return '';
  });

  readonly changeClass = computed(() => {
    const t = this.ticker();
    return !t ? '' : t.priceChangePercent >= 0 ? 'text-green-500' : 'text-red-700';
  });

  readonly fundingClass = computed(() => {
    const m = this.markPriceData();
    return !m ? '' : m.lastFundingRate >= 0 ? 'text-green-500' : 'text-red-700';
  });

  readonly wsStatusLabel = computed(() => {
    const s = this.wsStatus(),
      tf = this.currentTf();
    if (s === 'live') return `${SYMBOLS.BTCUSDT.toUpperCase()} Perpetual`;
    if (s === 'connecting') return 'Connecting…';
    if (s === 'error') return 'Error — retrying…';
    return 'Reconnecting…';
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
    this.binanceWsService.wsKline(SYMBOLS.BTCUSDT, DEFAULT_TIMEFRAME);
    this.binanceWsService.wsMarkPrice(SYMBOLS.BTCUSDT);

    this.binanceWsService.status$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ status }) => {
        this.wsStatus.set(status);
      });

    this.binanceWsService.markPrice$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((d) => {
      this.markPriceData.set({
        markPrice: parseFloat(d.p),
        indexPrice: parseFloat(d.i),
        lastFundingRate: parseFloat(d.r),
        nextFundingTime: d.T,
      });
    });

    this.wsKlineUpdates();

    this.binanceRestService
      .getTicker(SYMBOLS.BTCUSDT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((t) => {
        this.ticker.set(t);
      });

    this.binanceRestService
      .getOpenInterest(SYMBOLS.BTCUSDT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((oi) => {
        this.openInterest.set(oi.openInterest);
      });
  }

  ngAfterViewInit(): void {
    this.initCharts();
    this.fetchKlines(this.currentTf());
    this.movingTheChart();
  }

  ngOnDestroy(): void {
    this.binanceWsService.closeAll();
    this.chart?.remove();
    this.volumeChart?.remove();
  }

  setTimeframe(tf: Timeframe): void {
    if (tf === this.currentTf()) return;
    this.currentTf.set(tf);
    this.binanceWsService.unsubscribe('kline');
    this.binanceWsService.wsKline(SYMBOLS.BTCUSDT, tf);
    this.fetchKlines(tf);
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
    const theme = this.chartThemeService.current;
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
      timeScale: { visible: false, borderColor: theme.border },
      handleScroll: false,
      handleScale: false,
      width: this.chartContainerRef.nativeElement.clientWidth,
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
        o: this.utilsService.fmtPrice(d.open),
        h: this.utilsService.fmtPrice(d.high),
        l: this.utilsService.fmtPrice(d.low),
        c: this.utilsService.fmtPrice(d.close),
        v: this.utilsService.fmtVol(vd?.value ?? 0),
        isUp: d.close >= d.open,
      });
    });

    this.chartThemeService.theme$
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
      .getKlines(SYMBOLS.BTCUSDT, tf, 500)
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
    this.lastCandles = candles;
    const theme = this.chartThemeService.current;

    this.candleSeries.setData(
      candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    this.volumeSeries.setData(
      candles.map((c) => ({
        time: c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? theme.up + '55' : theme.dn + '55',
      })),
    );

    const last = candles[candles.length - 1];

    this.ohlc.set({
      o: this.utilsService.fmtPrice(last.open),
      h: this.utilsService.fmtPrice(last.high),
      l: this.utilsService.fmtPrice(last.low),
      c: this.utilsService.fmtPrice(last.close),
      v: this.utilsService.fmtVol(last.volume),
      isUp: last.close >= last.open,
    });

    this.renderAllIndicators();
  }

  private wsKlineUpdates(): void {
    this.binanceWsService.kline$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((msg) => {
      const k = msg.k;
      const time = Math.floor(k.t / 1000) as Time;
      const open = parseFloat(k.o);
      const high = parseFloat(k.h);
      const low = parseFloat(k.l);
      const close = parseFloat(k.c);
      const volume = parseFloat(k.v);
      const theme = this.chartThemeService.current;

      const candle = { time, open, high, low, close };
      this.candleSeries.update(candle);

      this.volumeSeries.update({
        time,
        value: volume,
        color: close >= open ? theme.up + '55' : theme.dn + '55',
      });

      this.ohlc.set({
        o: this.utilsService.fmtPrice(open),
        h: this.utilsService.fmtPrice(high),
        l: this.utilsService.fmtPrice(low),
        c: this.utilsService.fmtPrice(close),
        v: this.utilsService.fmtVol(volume),
        isUp: close >= open,
      });
    });
  }

  // ─── Indicator Rendering ────────────────────────────────────────────────────

  private renderAllIndicators(): void {
    const candles = this.lastCandles;
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
