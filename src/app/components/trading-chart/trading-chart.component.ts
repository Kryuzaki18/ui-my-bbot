import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

// Lightweight Charts
import {
  createChart,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  CrosshairMode,
  Time,
} from 'lightweight-charts';

// Constants
import {
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
  PositionChartData,
  OpenOrderChartLine,
  WsStatus,
  DrawnItem,
} from '../../core/models/chart.model';
import { OrderSideEnum } from '../../core/models/trades.model';

// Components
import { TradingSymbolsPopoverComponent } from './trading-symbols-popover/trading-symbols-popover.component';

// Services
import { BinanceRestService } from '../../core/services/binance-rest.service';
import { BinanceWsService } from '../../core/services/binance-ws.service';
import { ChartService } from '../../core/services/chart/chart.service';
import { UtilsService } from '../../core/services/utils.service';
import { IndicatorMaService } from '../../core/services/chart/indicator-ma.service';
import { IndicatorMacdService } from '../../core/services/chart/indicator-macd.service';
import { IndicatorBollingerService } from '../../core/services/chart/indicator-bollinger.service';
import { IndicatorRsiService } from '../../core/services/chart/indicator-rsi.service';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { AuthService } from '../../core/services/auth.service';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { PopoverModule } from 'primeng/popover';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';

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
    TooltipModule,
    TradingSymbolsPopoverComponent,
  ],
  templateUrl: './trading-chart.component.html',
  styleUrl: './trading-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradingChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('volumeContainer', { static: true }) volumeContainerRef!: ElementRef<HTMLDivElement>;

  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly binanceRestService = inject(BinanceRestService);
  private readonly binanceWsService = inject(BinanceWsService);
  private readonly chartService = inject(ChartService);
  private readonly indicatorMaService = inject(IndicatorMaService);
  private readonly indicatorMacdService = inject(IndicatorMacdService);
  private readonly indicatorBollingerService = inject(IndicatorBollingerService);
  private readonly indicatorRsiService = inject(IndicatorRsiService);
  private readonly localStorageService = inject(LocalStorageService);
  readonly utilsService = inject(UtilsService);
  readonly authService = inject(AuthService);
  readonly activatedRoute = inject(ActivatedRoute);

  private chart!: IChartApi;
  private volumeChart!: IChartApi;
  private candleSeries!: ISeriesApi<'Candlestick'>;
  private volumeSeries!: ISeriesApi<'Histogram'>;
  private resizeObserver!: ResizeObserver;

  // Indicator series references
  private maSeries: ISeriesApi<'Line'> | null = null;
  private emaSeries: ISeriesApi<'Line'> | null = null;
  private bbUpperSeries: ISeriesApi<'Line'> | null = null;
  private bbMiddleSeries: ISeriesApi<'Line'> | null = null;
  private bbLowerSeries: ISeriesApi<'Line'> | null = null;
  private macdLineSeries: ISeriesApi<'Line'> | null = null;
  private macdSignalSeries: ISeriesApi<'Line'> | null = null;
  private macdHistSeries: ISeriesApi<'Histogram'> | null = null;
  private rsiSeries: ISeriesApi<'Line'> | null = null;
  private timelineExtensionSeries: ISeriesApi<'Line'> | null = null;

  // Position price lines
  private entryPriceLine: IPriceLine | null = null;
  private takeProfitLine: IPriceLine | null = null;
  private stopLossLine: IPriceLine | null = null;
  // Open order price lines
  private openOrderLines: IPriceLine[] = [];

  // Drawing state
  private drawnItems: DrawnItem[] = [];
  private isDrawingTrendline = false;
  private currentTrendline: DrawnItem | null = null;
  private editingPoint: { item: DrawnItem; pointIndex: 1 | 2 | 'horizontal' } | null = null;

  private readonly initCandles = signal<CandleData[]>([]);
  readonly aggTrades = signal<AggTradeWsMessage[]>([]);
  readonly wsStatus = signal<WsStatus>('connecting');
  readonly ticker = signal<TickerData | null>(null);
  readonly ticker24hr = signal<Ticker24hrData | null>(null);
  readonly markPriceData = signal<MarkPriceData | null>(null);
  readonly openInterest = signal(0);
  readonly ohlc = signal<OhlcDisplay | null>(null);
  readonly currentPrice = signal(0);
  readonly previousPrice = signal(0);
  readonly volumeHeight = signal(100);

  readonly activeDrawingTool = signal<'cursor' | 'trendline' | 'horizontal' | 'eraser'>('cursor');

  get selectedSymbol() {
    return this.chartService.selectedSymbol();
  }

  get selectedTimeframe() {
    return this.chartService.selectedTimeframe();
  }

  readonly timeframes: Timeframe[] = TIMEFRAMES;

  readonly indicators = signal<IndicatorConfig[]>([
    { type: 'MA', label: 'MA (20)', color: '#58a6ff', enabled: false },
    { type: 'EMA', label: 'EMA (20)', color: '#f0a500', enabled: false },
    { type: 'BB', label: 'BB (20, 2)', color: '#a371f7', enabled: false },
    { type: 'MACD', label: 'MACD (12, 26, 9)', color: '#3fb950', enabled: false },
    { type: 'RSI', label: 'RSI (14)', color: '#eab308', enabled: false },
  ]);

  readonly activeIndicatorCount = computed(() => this.indicators().filter((i) => i.enabled).length);

  readonly isLoadingMaxRecentTrades = computed(() => {
    return this.aggTrades()?.length > 0;
  });

  readonly wsStatusLabel = computed(() => {
    const s = this.wsStatus();
    if (s === 'live') return this.selectedSymbol.toUpperCase();
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

 ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initAllWs();
      this.subscribeAllWs();
      this.subscribeAllRest();
      this.subscribeWsKline();
    });

    this.fetchKlines(this.selectedTimeframe);

    this.initCharts();
    this.movingTheChart();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.binanceWsService.closeAllWs();
    this.binanceWsService.disconnectAllAggTrade();
    this.chart?.remove();
    this.volumeChart?.remove();
  }

  private initAllWs(): void {
    this.binanceWsService.createAggTradeStream(this.selectedSymbol);
    this.binanceWsService.wsKline(this.selectedSymbol, this.selectedTimeframe);
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
    this.subscribeRestTicker24hr();
    this.subscribeRestOpenInterest();
  }

  setTimeframe(timeframe: Timeframe): void {
    if (timeframe === this.selectedTimeframe) return;

    this.localStorageService.updateLocalStorageSignal(STORAGE.TIMEFRAME, timeframe);
    this.fetchKlines(timeframe);

    this.binanceWsService.unsubscribeWs(STREAM_NAME.KLINE);
    this.binanceWsService.wsKline(this.selectedSymbol, timeframe);

    this.ngZone.runOutsideAngular(() => {
      this.subscribeWsKline();
    });
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = this.volumeHeight();

    const onMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY;
      let newHeight = startHeight + deltaY;

      if (newHeight < 50) newHeight = 50;
      if (newHeight > 500) newHeight = 500;

      this.volumeHeight.set(newHeight);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  toggleIndicator(type: IndicatorType, event: MouseEvent): void {
    event.stopPropagation();

    this.indicators.update((list) =>
      list.map((ind) => (ind.type === type ? { ...ind, enabled: !ind.enabled } : ind)),
    );

    this.renderAllIndicators();
  }

  setDrawingTool(tool: 'cursor' | 'trendline' | 'horizontal' | 'eraser'): void {
    this.activeDrawingTool.set(tool);
    if (tool !== 'cursor') {
      this.editingPoint = null;
    }
  }

  isIndicatorEnabled(type: IndicatorType): boolean {
    return this.indicators().find((i) => i.type === type)?.enabled ?? false;
  }

  getIndicatorColor(type: IndicatorType): string {
    return this.indicators().find((i) => i.type === type)?.color ?? '#fff';
  }

  saveScreenshot(): void {
    if (!this.chart) return;
    const canvas = this.chart.takeScreenshot();
    const link = document.createElement('a');
    link.download = `${this.selectedSymbol}-chart.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
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
      height: this.chartContainerRef.nativeElement.clientHeight,
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
      height: this.volumeContainerRef.nativeElement.clientHeight,
    });

    this.volumeSeries = this.volumeChart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'right',
    });

    this.chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) this.volumeChart.timeScale().setVisibleLogicalRange(range);
    });

    this.chart.subscribeClick((param) => {
      this.handleChartClick(param);
    });

    this.chart.subscribeCrosshairMove((param) => {
      this.handleChartMouseMove(param);

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

    // Start auto-resizing
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.chartContainerRef.nativeElement) {
          this.chart?.resize(entry.contentRect.width, entry.contentRect.height);
        } else if (entry.target === this.volumeContainerRef.nativeElement) {
          this.volumeChart?.resize(entry.contentRect.width, entry.contentRect.height);
        }
      }
    });

    this.resizeObserver.observe(this.chartContainerRef.nativeElement);
    this.resizeObserver.observe(this.volumeContainerRef.nativeElement);

    // Subscribe to position / TP / SL for current symbol
    this.chartService.positionChartData$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => this.updatePositionLines(data));

    // Subscribe to basic open orders for current symbol
    this.chartService.openOrdersChartData$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((orders) => this.updateOpenOrderLines(orders));
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

  private updatePositionLines(data: PositionChartData | null): void {
    if (!this.candleSeries) return;

    if (this.entryPriceLine) {
      this.candleSeries.removePriceLine(this.entryPriceLine);
      this.entryPriceLine = null;
    }
    if (this.takeProfitLine) {
      this.candleSeries.removePriceLine(this.takeProfitLine);
      this.takeProfitLine = null;
    }
    if (this.stopLossLine) {
      this.candleSeries.removePriceLine(this.stopLossLine);
      this.stopLossLine = null;
    }

    if (!data) return;

    if (data.entryPrice) {
      this.entryPriceLine = this.candleSeries.createPriceLine({
        price: data.entryPrice,
        color: '#f0a500',
        lineWidth: 1,
        lineStyle: 1, // Dotted
        axisLabelVisible: true,
        title: 'Entry',
      });
    }

    if (data.takeProfit) {
      this.takeProfitLine = this.candleSeries.createPriceLine({
        price: data.takeProfit,
        color: '#3fb950',
        lineWidth: 1,
        lineStyle: 1,
        axisLabelVisible: true,
        title: 'TP',
      });
    }

    if (data.stopLoss) {
      this.stopLossLine = this.candleSeries.createPriceLine({
        price: data.stopLoss,
        color: '#f85149',
        lineWidth: 1,
        lineStyle: 1,
        axisLabelVisible: true,
        title: 'SL',
      });
    }
  }

  private updateOpenOrderLines(orders: OpenOrderChartLine[]): void {
    if (!this.candleSeries) return;

    // Remove all previous open order lines
    for (const line of this.openOrderLines) {
      this.candleSeries.removePriceLine(line);
    }
    this.openOrderLines = [];

    for (const order of orders) {
      const isBuy = order.side === OrderSideEnum.BUY;
      const label = `${order.type} ${isBuy ? OrderSideEnum.BUY : OrderSideEnum.SELL} ${order.qty}`;
      const line = this.candleSeries.createPriceLine({
        price: order.price,
        color: isBuy ? '#3fb950' : '#f85149',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: label,
      });
      this.openOrderLines.push(line);
    }
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

  private handleChartClick(param: any): void {
    const tool = this.activeDrawingTool();
    if (!param.point) return;

    const price = this.candleSeries.coordinateToPrice(param.point.y);
    const time = this.getTimeFromParam(param);
    if (price === null || time === undefined) return;

    if (tool === 'cursor') {
      if (this.editingPoint) {
        this.editingPoint = null;
        return;
      }
      
      const clickX = param.point.x;
      const clickY = param.point.y;
      
      for (const item of this.drawnItems) {
        if (item.type === 'trendline' && item.data && item.data.time2) {
          const x1 = this.chart.timeScale().timeToCoordinate(item.data.time1);
          const y1 = this.candleSeries.priceToCoordinate(item.data.price1);
          const x2 = this.chart.timeScale().timeToCoordinate(item.data.time2);
          const y2 = this.candleSeries.priceToCoordinate(item.data.price2!);
          
          if (x1 !== null && y1 !== null) {
            if (Math.sqrt((x1 - clickX) ** 2 + (y1 - clickY) ** 2) < 15) {
               this.editingPoint = { item, pointIndex: 1 };
               return;
            }
          }
          if (x2 !== null && y2 !== null) {
            if (Math.sqrt((x2 - clickX) ** 2 + (y2 - clickY) ** 2) < 15) {
               this.editingPoint = { item, pointIndex: 2 };
               return;
            }
          }
        } else if (item.type === 'horizontal' && item.data) {
          const lineY = this.candleSeries.priceToCoordinate(item.data.price1);
          if (lineY !== null && Math.abs(lineY - clickY) < 15) {
            this.editingPoint = { item, pointIndex: 'horizontal' };
            return;
          }
        }
      }
      return;
    }

    if (tool === 'horizontal') {
      const priceLine = this.candleSeries.createPriceLine({
        price,
        color: '#3b82f6',
        lineWidth: 1,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
      });

      this.drawnItems.push({
        id: Math.random().toString(36).substring(2, 11),
        type: 'horizontal',
        priceLine,
        data: { time1: time, price1: price },
      });
    } else if (tool === 'trendline') {
      if (!this.isDrawingTrendline) {
        this.isDrawingTrendline = true;
        const series = this.chart.addSeries(LineSeries, {
          color: '#3b82f6',
          lineWidth: 1,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
          autoscaleInfoProvider: () => null, // Prevent scale jumping and resize logic loops
        });

        this.currentTrendline = {
          id: Math.random().toString(36).substring(2, 11),
          type: 'trendline',
          series,
          data: { time1: time, price1: price },
        };
      } else {
        if (this.currentTrendline && this.currentTrendline.data && this.currentTrendline.data.time1 !== time) {
          this.currentTrendline.data.time2 = time;
          this.currentTrendline.data.price2 = price;
          this.drawnItems.push(this.currentTrendline);
        } else if (this.currentTrendline?.series) {
          this.chart.removeSeries(this.currentTrendline.series);
        }
        this.isDrawingTrendline = false;
        this.currentTrendline = null;
      }
    } else if (tool === 'eraser') {
      this.eraseNearestItem(param);
    }
  }

  private handleChartMouseMove(param: any): void {
    const tool = this.activeDrawingTool();
    if (tool === 'cursor' && this.editingPoint) {
      if (!param.point) return;
      const price = this.candleSeries.coordinateToPrice(param.point.y);
      const time = this.getTimeFromParam(param);
      if (price === null || time === undefined) return;

      const item = this.editingPoint.item;
      const p = item.data!;
      let changed = false;

      if (this.editingPoint.pointIndex === 1) {
        if (p.time1 !== time || p.price1 !== price) {
          p.time1 = time;
          p.price1 = price;
          changed = true;
        }
      } else if (this.editingPoint.pointIndex === 2) {
        if (p.time2 !== time || p.price2 !== price) {
          p.time2 = time;
          p.price2 = price;
          changed = true;
        }
      } else if (this.editingPoint.pointIndex === 'horizontal') {
        if (p.price1 !== price) {
          p.price1 = price;
          if (item.priceLine) {
            item.priceLine.applyOptions({ price });
          }
        }
      }

      if (changed && p.time2 && item.series) {
        const dataPoints = [
          { time: p.time1, value: p.price1 },
          { time: p.time2, value: p.price2 },
        ].sort((a, b) => {
          if(a.time > b.time) return 1;
          if(a.time < b.time) return -1;
          return 0;
        });
        item.series.setData(dataPoints);
      }
      return;
    }

    if (tool === 'trendline' && this.isDrawingTrendline && this.currentTrendline?.series) {
      if (!param.point) return;
      const price = this.candleSeries.coordinateToPrice(param.point.y);
      const time = this.getTimeFromParam(param);
      if (price === null || time === undefined) return;

      const p1 = this.currentTrendline.data!;
      if (p1.time1 !== time) {
        if (p1.time2 === time && p1.price2 === price) return;
        p1.time2 = time;
        p1.price2 = price;

        const dataPoints = [
          { time: p1.time1, value: p1.price1 },
          { time, value: price },
        ].sort((a, b) => {
          if(a.time > b.time) return 1;
          if(a.time < b.time) return -1;
          return 0;
        });
        
        if (this.currentTrendline?.series) {
          this.currentTrendline.series.setData(dataPoints);
        }
      }
    }
  }

  private eraseNearestItem(param: any): void {
    const clickX = param.point.x;
    const clickY = param.point.y;

    let toDeleteIdx = -1;
    let minDistance = Infinity;

    for (let i = 0; i < this.drawnItems.length; i++) {
      const item = this.drawnItems[i];
      if (item.type === 'horizontal') {
        const lineY = this.candleSeries.priceToCoordinate(item.data!.price1);
        if (lineY !== null) {
          const diff = Math.abs(lineY - clickY);
          if (diff < minDistance) {
            minDistance = diff;
            toDeleteIdx = i;
          }
        }
      } else if (item.type === 'trendline') {
        const d = item.data!;
        if (d.time2) {
          const x1 = this.chart.timeScale().timeToCoordinate(d.time1);
          const y1 = this.candleSeries.priceToCoordinate(d.price1);
          const x2 = this.chart.timeScale().timeToCoordinate(d.time2);
          const y2 = this.candleSeries.priceToCoordinate(d.price2!);

          if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
            const dist = this.distanceToSegment(clickX, clickY, x1 as number, y1, x2 as number, y2);
            if (dist < minDistance) {
              minDistance = dist;
              toDeleteIdx = i;
            }
          }
        }
      }
    }

    if (toDeleteIdx !== -1 && minDistance < 15) {
      const item = this.drawnItems[toDeleteIdx];
      if (item.type === 'horizontal' && item.priceLine) {
        this.candleSeries.removePriceLine(item.priceLine);
      } else if (item.type === 'trendline' && item.series) {
        this.chart.removeSeries(item.series);
      }
      this.drawnItems.splice(toDeleteIdx, 1);
    }
  }

  private getOffsetByTimeframe(tf: Timeframe): number {
    const map: Record<string, number> = {
      '1m': 60,
      '3m': 3 * 60,
      '5m': 5 * 60,
      '15m': 15 * 60,
      '30m': 30 * 60,
      '1h': 60 * 60,
      '2h': 2 * 60 * 60,
      '4h': 4 * 60 * 60,
      '6h': 6 * 60 * 60,
      '8h': 8 * 60 * 60,
      '12h': 12 * 60 * 60,
      '1d': 24 * 60 * 60,
      '3d': 3 * 24 * 60 * 60,
      '1w': 7 * 24 * 60 * 60,
      '1M': 30 * 24 * 60 * 60,
    };
    return map[tf] ?? 60;
  }

  private getTimeFromParam(param: any): Time | undefined {
    if (param.time) return param.time as Time;
    if (param.point) {
      const logical = param.logical ?? this.chart.timeScale().coordinateToLogical(param.point.x);
      if (logical !== null) {
        const candles = this.initCandles();
        if (candles.length > 0) {
          const anchorLogical = candles.length - 1;
          const anchorTime = Math.floor(candles[anchorLogical].time); 
          
          const step = this.getOffsetByTimeframe(this.selectedTimeframe);
          const extrapolated = (anchorTime + Math.round(logical - anchorLogical) * step) as Time;
          
          return extrapolated;
        }
      }
    }
    return undefined;
  }

  private distanceToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let paramArg = -1;
    if (lenSq !== 0) paramArg = dot / lenSq;

    let xx, yy;

    if (paramArg < 0) {
      xx = x1;
      yy = y1;
    } else if (paramArg > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + paramArg * C;
      yy = y1 + paramArg * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
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
    const theme = this.chartService.currentTheme;

    const history = this.initCandles().map((d) => ({
      time: Math.floor(d.time) as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    this.candleSeries.setData(history);

    if (!this.timelineExtensionSeries) {
      this.timelineExtensionSeries = this.chart.addSeries(LineSeries, {
        color: 'transparent',
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
        autoscaleInfoProvider: () => null,
      });
    }

    if (history.length > 0) {
      const step = this.getOffsetByTimeframe(this.selectedTimeframe);
      const lastTime = history[history.length - 1].time as number;
      const oneMonthSeconds = 30 * 24 * 60 * 60; // Month Added
      const barsToAdd = Math.min(Math.floor(oneMonthSeconds / step), 5000); 

      const futureSpaces = [];
      for (let i = 1; i <= barsToAdd; i++) {
        futureSpaces.push({ time: (lastTime + i * step) as Time });
      }
      this.timelineExtensionSeries.setData(futureSpaces as any);
    }

    this.volumeSeries.setData(
      this.initCandles().map((c) => ({
        time: Math.floor(c.time) as Time,
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

  private subscribeRestTicker24hr(): void {
    this.binanceRestService
      .getTicker24hr(this.selectedSymbol)
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
    this.renderRsi(candles);
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
      if (!this.isIndicatorEnabled('RSI')) {
        this.volumeSeries.applyOptions({ visible: true });
      }
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

  private renderRsi(candles: CandleData[]): void {
    const enabled = this.isIndicatorEnabled('RSI');
    const color = this.getIndicatorColor('RSI');

    if (!enabled) {
      if (this.rsiSeries) {
        this.volumeChart.removeSeries(this.rsiSeries);
        this.rsiSeries = null;
      }
      // Restore volume series visibility
      if (!this.isIndicatorEnabled('MACD')) {
        this.volumeSeries.applyOptions({ visible: true });
      }
      return;
    }

    const data = this.indicatorRsiService.calculate(candles, 14);
    if (!data.length) return;

    // Hide volume bars when RSI is active
    this.volumeSeries.applyOptions({ visible: false });

    if (!this.rsiSeries) {
      this.rsiSeries = this.volumeChart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }

    this.rsiSeries.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
  }
}
