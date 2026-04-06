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
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval } from 'rxjs';
import { takeUntil, startWith } from 'rxjs/operators';
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
import { BinanceRestService } from '../../core/services/binance-rest.service';
import { BinanceWsService, WsStatus } from '../../core/services/binance-ws.service';
import { ChartThemeService } from '../../core/services/chart-theme.service';
// import { buildEmaSeriesData, updateEmaLive } from '../../core/services/ema.util';
import { CandleData, TickerData, MarkPriceData, Timeframe, RecentTrade } from '../../core/models/chart.model';

const SYMBOL = 'BTCUSDT';
const EMA_PERIOD = 20;
const MAX_TRADES = 40;

interface OhlcDisplay {
  o: string; h: string; l: string; c: string; v: string;
  isUp: boolean;
}

@Component({
  selector: 'app-trading-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trading-chart.html',
  styleUrls: ['./trading-chart.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradingChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('volumeContainer', { static: true }) volumeContainerRef!: ElementRef<HTMLDivElement>;

  private readonly rest = inject(BinanceRestService);
  private readonly wsService = inject(BinanceWsService);
  private readonly themeService = inject(ChartThemeService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly destroy$ = new Subject<void>();

  // Lightweight Charts instances
  private chart!: IChartApi;
  private volumeChart!: IChartApi;
  private candleSeries!: ISeriesApi<'Candlestick'>;
  private volumeSeries!: ISeriesApi<'Histogram'>;
  private emaSeries!: ISeriesApi<'Line'>;
  private ema50Series!: ISeriesApi<'Line'>;

  // Signals
  readonly currentTf = signal<Timeframe>('5m');
  readonly showEma20 = signal(false);
  readonly showEma50 = signal(false);
  readonly showVolume = signal(true);
  readonly wsStatus = signal<WsStatus>('connecting');
  readonly isLoading = signal(true);
  readonly loadingMessage = signal('Initialising chart…');
  readonly price = signal(0);
  readonly prevPrice = signal(0);
  readonly ticker = signal<TickerData | null>(null);
  readonly markPriceData = signal<MarkPriceData | null>(null);
  readonly openInterest = signal(0);
  readonly ohlc = signal<OhlcDisplay | null>(null);
  readonly trades = signal<RecentTrade[]>([]);

  // EMA data
  // private ema20Data: EmaPoint[] = [];
  // private ema50Data: EmaPoint[] = [];

  readonly timeframes: Timeframe[] = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];

  // Computed
  readonly priceClass = computed(() => {
    const cur = this.price(), prev = this.prevPrice();
    if (cur > prev) return 'price--up';
    if (cur < prev) return 'price--down';
    return '';
  });

  readonly changeClass = computed(() => {
    const t = this.ticker();
    return !t ? '' : t.priceChangePercent >= 0 ? 'text--up' : 'text--down';
  });

  readonly fundingClass = computed(() => {
    const m = this.markPriceData();
    return !m ? '' : m.lastFundingRate >= 0 ? 'text--up' : 'text--down';
  });

  readonly wsStatusLabel = computed(() => {
    const s = this.wsStatus(), tf = this.currentTf();
    if (s === 'live') return `Live · ${SYMBOL} @kline_${tf}`;
    if (s === 'connecting') return 'Connecting…';
    if (s === 'error') return 'Error — retrying…';
    return 'Reconnecting…';
  });

  // Formatters
  fmtPrice(n: number): string {
    return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  fmtVol(n: number): string {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toFixed(2);
  }
  fmtPercent(n: number): string { return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'; }
  fmtFunding(rate: number): string { return (rate * 100).toFixed(4) + '%'; }
  fmtTime(date: Date): string { return date.toTimeString().slice(0, 8); }

  // Lifecycle
  ngOnInit(): void {
    this.watchWsStatus();
    this.watchMarkPrice();
    this.watchAggTrades();
    this.startPeriodicPolling();
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initCharts();
      this.loadAndSubscribe(this.currentTf());
      this.observeResize();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.wsService.closeAll();
    this.chart?.remove();
    this.volumeChart?.remove();
  }

  // Chart init
  private initCharts(): void {
    const theme = this.themeService.current;
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
      timeScale: { borderColor: theme.border, timeVisible: true, secondsVisible: false, barSpacing: 8 },
    };

    this.chart = createChart(this.chartContainerRef.nativeElement, {
      ...sharedOpts,
      width: this.chartContainerRef.nativeElement.offsetWidth,
      height: 460,
      // watermark: {
      //   visible: true, fontSize: 28,
      //   horzAlign: 'center', vertAlign: 'center',
      //   color: 'rgba(128,128,128,0.04)',
      //   text: 'BTCUSDT PERP',
      // },
    });

    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: theme.up, downColor: theme.dn,
      borderUpColor: theme.up, borderDownColor: theme.dn,
      wickUpColor: theme.up, wickDownColor: theme.dn,
    });

    this.emaSeries = this.chart.addSeries(LineSeries, {
      color: '#f0b90b', lineWidth: 1,
      priceLineVisible: false, lastValueVisible: true,
      crosshairMarkerVisible: false, visible: false,
    });

    this.ema50Series = this.chart.addSeries(LineSeries, {
      color: '#60a5fa', lineWidth: 1,
      priceLineVisible: false, lastValueVisible: true,
      crosshairMarkerVisible: false, visible: false,
    });

    this.volumeChart = createChart(this.volumeContainerRef.nativeElement, {
      ...sharedOpts,
      width: this.volumeContainerRef.nativeElement.offsetWidth,
      height: 90,
      rightPriceScale: { borderColor: theme.border, scaleMargins: { top: 0.1, bottom: 0 } },
      timeScale: { visible: false, borderColor: theme.border },
      handleScroll: false, handleScale: false,
    });

    this.volumeSeries = this.volumeChart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'right',
    });

    // Sync timescales
    this.chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) this.volumeChart.timeScale().setVisibleLogicalRange(range);
    });

    // Crosshair OHLCV tooltip
    this.chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) return;
      const d = param.seriesData.get(this.candleSeries) as any;
      const vd = param.seriesData.get(this.volumeSeries) as any;
      if (!d) return;
      this.ngZone.run(() => {
        this.ohlc.set({
          o: this.fmtPrice(d.open), h: this.fmtPrice(d.high),
          l: this.fmtPrice(d.low), c: this.fmtPrice(d.close),
          v: this.fmtVol(vd?.value ?? 0), isUp: d.close >= d.open,
        });
        this.cdr.markForCheck();
      });
    });

    this.themeService.theme$.pipe(takeUntil(this.destroy$)).subscribe((t) => this.applyTheme(t));
  }

  private applyTheme(t: any): void {
    const opt = { layout: { background: { color: t.background }, textColor: t.text }, grid: { vertLines: { color: t.grid }, horzLines: { color: t.grid } } };
    this.chart?.applyOptions(opt);
    this.volumeChart?.applyOptions(opt);
    this.candleSeries?.applyOptions({ upColor: t.up, downColor: t.dn, borderUpColor: t.up, borderDownColor: t.dn, wickUpColor: t.up, wickDownColor: t.dn });
  }

  private observeResize(): void {
    const ro = new ResizeObserver(() => {
      const w = this.chartContainerRef.nativeElement.offsetWidth;
      this.chart?.resize(w, 460);
      this.volumeChart?.resize(w, 90);
    });
    ro.observe(this.chartContainerRef.nativeElement);
  }

  // Data loading
  private loadAndSubscribe(tf: Timeframe): void {
    this.ngZone.run(() => {
      this.isLoading.set(true);
      this.loadingMessage.set(`Loading ${tf} klines…`);
      this.cdr.markForCheck();
    });

    this.rest.getKlines(SYMBOL, tf, 500)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (candles) => {
          this.ngZone.runOutsideAngular(() => this.applyKlineData(candles));
          this.ngZone.run(() => { this.isLoading.set(false); this.cdr.markForCheck(); });
        },
        error: () => {
          this.ngZone.run(() => { this.loadingMessage.set('Failed — retrying in 3s…'); this.cdr.markForCheck(); });
          setTimeout(() => this.loadAndSubscribe(tf), 3000);
        },
      });

    this.wsService.wsKline(SYMBOL, tf);
    // this.wsService.wsAggTrade(SYMBOL);
    this.wsService.wsMarkPrice(SYMBOL);
  }

  private applyKlineData(candles: CandleData[]): void {
    const theme = this.themeService.current;

    this.candleSeries.setData(candles.map((c) => ({
      time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close,
    })));

    this.volumeSeries.setData(candles.map((c) => ({
      time: c.time as Time, value: c.volume,
      color: c.close >= c.open ? theme.up + '55' : theme.dn + '55',
    })));

    this.chart.timeScale().fitContent();

    const times = candles.map((c) => c.time);
    const closes = candles.map((c) => c.close);
    // this.ema20Data = buildEmaSeriesData(times, closes, EMA_PERIOD);
    // this.ema50Data = buildEmaSeriesData(times, closes, 50);
    // this.emaSeries.setData(this.ema20Data.map((p) => ({ time: p.time as Time, value: p.value })));
    // this.ema50Series.setData(this.ema50Data.map((p) => ({ time: p.time as Time, value: p.value })));

    const last = candles[candles.length - 1];
    this.ngZone.run(() => {
      this.prevPrice.set(this.price());
      this.price.set(last.close);
      this.ohlc.set({ o: this.fmtPrice(last.open), h: this.fmtPrice(last.high), l: this.fmtPrice(last.low), c: this.fmtPrice(last.close), v: this.fmtVol(last.volume), isUp: last.close >= last.open });
      this.cdr.markForCheck();
    });
  }

  // WS subscriptions
  private watchWsStatus(): void {
    this.wsService.status$.pipe(takeUntil(this.destroy$)).subscribe(({ status }) => {
      this.wsStatus.set(status);
      this.cdr.markForCheck();
    });
  }

  private watchMarkPrice(): void {
    this.wsService.markPrice$.pipe(takeUntil(this.destroy$)).subscribe((d) => {
      this.markPriceData.set({ markPrice: parseFloat(d.p), indexPrice: parseFloat(d.i), lastFundingRate: parseFloat(d.r), nextFundingTime: d.T });
      this.cdr.markForCheck();
    });
  }

  private watchAggTrades(): void {
    // this.wsService.aggTrade$.pipe(takeUntil(this.destroy$)).subscribe((trade) => {
    //   this.prevPrice.set(this.price());
    //   const p = parseFloat(trade.p);
    //   this.price.set(p);
    //   const next: RecentTrade = { price: p, qty: parseFloat(trade.q), isBuyerMaker: trade.m, time: new Date(trade.T) };
    //   this.trades.set([next, ...this.trades()].slice(0, MAX_TRADES));
    //   this.cdr.markForCheck();
    // });
  }

  private setupKlineUpdates(): void {
    this.wsService.kline$.pipe(takeUntil(this.destroy$)).subscribe((msg) => {
      const k = msg.k;
      const time = Math.floor(k.t / 1000) as Time;
      const open = parseFloat(k.o), high = parseFloat(k.h);
      const low = parseFloat(k.l), close = parseFloat(k.c);
      const volume = parseFloat(k.v);
      const theme = this.themeService.current;

      this.ngZone.runOutsideAngular(() => {
        this.candleSeries.update({ time, open, high, low, close });
        this.volumeSeries.update({ time, value: volume, color: close >= open ? theme.up + '55' : theme.dn + '55' });

        // if (this.ema20Data.length) {
        //   const newEma20 = updateEmaLive(this.ema20Data[this.ema20Data.length - 1].value, close, EMA_PERIOD);
        //   const pt: any = { time, value: parseFloat(newEma20.toFixed(2)) };
        //   this.ema20Data.push(pt);
        //   this.emaSeries.update({ time, value: pt.value });
        // }
        // if (this.ema50Data.length) {
        //   const newEma50 = updateEmaLive(this.ema50Data[this.ema50Data.length - 1].value, close, 50);
        //   const pt: any = { time, value: parseFloat(newEma50.toFixed(2)) };
        //   this.ema50Data.push(pt);
        //   this.ema50Series.update({ time, value: pt.value });
        // }
      });

      this.ngZone.run(() => {
        this.ohlc.set({ o: this.fmtPrice(open), h: this.fmtPrice(high), l: this.fmtPrice(low), c: this.fmtPrice(close), v: this.fmtVol(volume), isUp: close >= open });
        this.cdr.markForCheck();
      });
    });
  }

  // Polling
  private startPeriodicPolling(): void {
    interval(10_000).pipe(startWith(0), takeUntil(this.destroy$)).subscribe(() => {
      this.rest.getTicker(SYMBOL).subscribe((t) => { this.ticker.set(t); this.cdr.markForCheck(); });
    });
    interval(30_000).pipe(startWith(0), takeUntil(this.destroy$)).subscribe(() => {
      this.rest.getOpenInterest(SYMBOL).subscribe((oi) => { this.openInterest.set(oi.openInterest); this.cdr.markForCheck(); });
    });
    setTimeout(() => this.setupKlineUpdates(), 100);
  }

  // User actions
  setTimeframe(tf: Timeframe): void {
    if (tf === this.currentTf()) return;
    this.currentTf.set(tf);
    this.wsService.closeAll();
    this.loadAndSubscribe(tf);
    this.cdr.markForCheck();
  }

  toggleEma20(): void {
    const next = !this.showEma20();
    this.showEma20.set(next);
    this.emaSeries.applyOptions({ visible: next });
  }

  toggleEma50(): void {
    const next = !this.showEma50();
    this.showEma50.set(next);
    this.ema50Series.applyOptions({ visible: next });
  }

  toggleVolume(): void {
    const next = !this.showVolume();
    this.showVolume.set(next);
    this.volumeContainerRef.nativeElement.style.display = next ? 'block' : 'none';
  }
}
