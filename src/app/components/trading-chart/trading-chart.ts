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
} from '../../core/models/chart.model';

// Services
import { BinanceRestService } from '../../core/services/binance-rest.service';
import { BinanceWsService, WsStatus } from '../../core/services/binance-ws.service';
import { ChartThemeService } from '../../core/services/chart-theme.service';
import { UtilsService } from '../../core/services/utils.service';

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

  private readonly destroyRef = inject(DestroyRef);
  private readonly binanceRestService = inject(BinanceRestService);
  private readonly binanceWsService = inject(BinanceWsService);
  private readonly chartThemeService = inject(ChartThemeService);
  readonly utilsService = inject(UtilsService);

  private chart!: IChartApi;
  private volumeChart!: IChartApi;
  private candleSeries!: ISeriesApi<'Candlestick'>;
  private volumeSeries!: ISeriesApi<'Histogram'>;

  readonly aggTrades = input<Record<string, AggTradeWsMessage[]>>({});
  readonly currentTf = signal<Timeframe>(DEFAULT_TIMEFRAME);
  readonly showVolume = signal(true);
  readonly wsStatus = signal<WsStatus>('connecting');
  readonly price = signal(0);
  readonly prevPrice = signal(0);
  readonly ticker = signal<TickerData | null>(null);
  readonly markPriceData = signal<MarkPriceData | null>(null);
  readonly openInterest = signal(0);
  readonly ohlc = signal<OhlcDisplay | null>(null);
  readonly timeframes: Timeframe[] = TIMEFRAMES;
  readonly SYMBOLS = SYMBOLS;

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

  ngOnInit(): void {
    this.binanceWsService.wsKline(SYMBOLS.BTCUSDT, DEFAULT_TIMEFRAME);
    this.binanceWsService.wsMarkPrice(SYMBOLS.BTCUSDT);

    this.binanceWsService.status$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ status }) => {
        this.wsStatus.set(status);
      });

    this.binanceWsService.markPrice$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((d) => {
      console.log(d);
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
    this.binanceWsService.closeAll();
    this.binanceWsService.wsKline(SYMBOLS.BTCUSDT, tf);
    this.fetchKlines(tf);
    // this.movingTheChart();
  }

  toggleVolume(): void {
    const next = !this.showVolume();
    this.showVolume.set(next);
    this.volumeContainerRef.nativeElement.style.display = next ? 'block' : 'none';
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
    this.prevPrice.set(this.price());
    this.price.set(last.close);

    this.ohlc.set({
      o: this.utilsService.fmtPrice(last.open),
      h: this.utilsService.fmtPrice(last.high),
      l: this.utilsService.fmtPrice(last.low),
      c: this.utilsService.fmtPrice(last.close),
      v: this.utilsService.fmtVol(last.volume),
      isUp: last.close >= last.open,
    });
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
}
