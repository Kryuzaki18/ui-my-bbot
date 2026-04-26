import { Component, inject, OnInit, DestroyRef, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, forkJoin } from 'rxjs';

// Services
import { UtilsService } from '../../core/services/utils.service';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { FutureTradeService } from '../../core/services/future-trade.service';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { UserWsService } from '../../core/services/user-ws.service';
import { BinanceWsService } from '../../core/services/binance-ws.service';
import { ToastMessageService } from '../../core/services/toast-message.service';
import { ChartService } from '../../core/services/chart/chart.service';
import { UserService } from '../../core/services/user.service';

// Models
import { OrderSideEnum, OrderTypeEnum, PositionSideEnum } from '../../core/models/trades.model';
import { DEFAULT_SYMBOL, STORAGE, USER_STREAM } from '../../core/constants/binance.constant';

// Components
import { PositionsComponent } from './positions/positions.component';
import { OpenOrdersComponent } from './open-orders/open-orders.component';
import { ConditionalOrdersComponent } from './conditional-orders/conditional-orders.component';
import { TpSlComponent } from '../tp-sl/tp-sl.component';

// PrimeNG Modules
import { ProgressBarModule } from 'primeng/progressbar';
import { TabsModule } from 'primeng/tabs';
import { ConfirmationService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SelectButtonModule } from 'primeng/selectbutton';

@Component({
  selector: 'app-positions-and-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProgressBarModule,
    TabsModule,
    SelectButtonModule,
    PositionsComponent,
    OpenOrdersComponent,
    ConditionalOrdersComponent,
  ],
  templateUrl: './positions-and-orders.component.html',
})
export class PositionsAndOrdersComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly utilsService = inject(UtilsService);
  private readonly userWsService = inject(UserWsService);
  private readonly userService = inject(UserService);
  private readonly binanceWsService = inject(BinanceWsService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly futureTradeService = inject(FutureTradeService);
  private readonly dialogService = inject(DialogService);
  private readonly toastMessageService = inject(ToastMessageService);
  private readonly chartService = inject(ChartService);
  readonly confirmationService = inject(ConfirmationService);
  readonly appSettingsService = inject(AppSettingsService);

  private dialogRef: DynamicDialogRef<any> | null = null;

  readonly positions = signal<any[]>([]);
  readonly openOrders = signal<any[]>([]);
  readonly pendingTpSl = signal<any[]>([]);
  readonly livePrices = signal<Record<string, number>>({});
  readonly orderTypeFilter = signal('basic');

  readonly orderTypeOptions = computed(() => [
    {
      label: `Basic(${this.basicOrders().length})`,
      value: 'basic',
    },
    {
      label: `Conditional(${this.conditionalOrders().length})`,
      value: 'conditional',
    },
  ]);

  readonly currentSymbol = this.localStorageService.getLocalStorageSignal(
    STORAGE.SYMBOL,
    DEFAULT_SYMBOL,
  );

  readonly basicOrders = computed(() => {
    return this.openOrders().filter((o: any) => {
      return o.closePosition !== true;
    });
  });

  readonly conditionalOrders = computed(() => {
    return this.pendingTpSl().filter((o: any) => {
      const type = o.type || o.orderType || '';
      return [OrderTypeEnum.STOP_MARKET, OrderTypeEnum.TAKE_PROFIT_MARKET].includes(type);
    });
  });

  readonly enrichedPositions = computed(() => {
    const list = this.positions();
    const condOrders = this.conditionalOrders();

    const mapList = list
      .map((pos) => {
        const tpOrder = condOrders.find(
          (o) =>
            o.symbol.toLowerCase() === pos.symbol.toLowerCase() &&
            o.orderType === OrderTypeEnum.TAKE_PROFIT_MARKET,
        );
        const slOrder = condOrders.find(
          (o) =>
            o.symbol.toLowerCase() === pos.symbol.toLowerCase() &&
            o.orderType === OrderTypeEnum.STOP_MARKET,
        );

        const entryPrice = parseFloat(pos.entryPrice);
        const leverage = parseFloat(pos.leverage || '20');
        const sign = pos.positionAmt > 0 ? 1 : -1;

        const currentPrice = this.livePrices()[pos.symbol] || parseFloat(pos.markPrice);
        const positionAmt = parseFloat(pos.positionAmt);
        const livePnl = (currentPrice - entryPrice) * positionAmt;
        const initialMargin = (Math.abs(positionAmt) * entryPrice) / leverage;
        const roi = initialMargin > 0 ? (livePnl / initialMargin) * 100 : 0;

        let takeProfitPnlPercent = null;
        let stopLossPnlPercent = null;

        if (tpOrder && entryPrice > 0 && tpOrder.triggerPrice) {
          takeProfitPnlPercent =
            ((tpOrder.triggerPrice - entryPrice) / entryPrice) * leverage * sign * 100;
        }
        if (slOrder && entryPrice > 0 && slOrder.triggerPrice) {
          stopLossPnlPercent =
            ((slOrder.triggerPrice - entryPrice) / entryPrice) * leverage * sign * 100;
        }

        const fee = parseFloat(pos.commissionRate?.takerCommissionRate || 0.0004);
        pos.breakEvenPrice = this.utilsService.calculateBreakEven(currentPrice, positionAmt, fee);
        pos.markPrice = currentPrice;

        return {
          ...pos,
          livePnl,
          roi,
          takeProfit: {
            ...tpOrder,
            pnlPercent: takeProfitPnlPercent,
          },
          stopLoss: {
            ...slOrder,
            pnlPercent: stopLossPnlPercent,
          },
          margin: this.utilsService.calculateMargin(pos.positionAmt, pos.markPrice, pos.leverage),
        };
      })
      .sort((a, b) => {
        if (a.symbol.toLowerCase() === this.currentSymbol().toLowerCase()) return -1;
        if (b.symbol.toLowerCase() === this.currentSymbol().toLowerCase()) return 1;

        return 0;
      });

    return mapList;
  });

  private readonly syncPositionToAccountBalance= effect(() => {
    const pos = this.enrichedPositions();

    if (!pos) {
      return;
    }

    const totalBalance = pos.reduce((acc, p) => acc + p.livePnl, 0);
    this.userService.setTotalLivePnl(totalBalance);
  });

  private readonly syncPositionToChart = effect(() => {
    const sym = this.currentSymbol().toLowerCase();
    const pos = this.enrichedPositions().find((p) => p.symbol.toLowerCase() === sym);

    if (!pos) {
      this.chartService.setPositionChartData(null);
      return;
    }

    const entryPrice = parseFloat(pos.entryPrice);
    const tpPrice = pos.takeProfit?.triggerPrice ? parseFloat(pos.takeProfit.triggerPrice) : null;
    const slPrice = pos.stopLoss?.triggerPrice ? parseFloat(pos.stopLoss.triggerPrice) : null;

    this.chartService.setPositionChartData({
      price: entryPrice,
      takeProfit: tpPrice && !isNaN(tpPrice) ? tpPrice : null,
      stopLoss: slPrice && !isNaN(slPrice) ? slPrice : null,
      positionSide: pos.positionSide ?? '',
    });
  });

  private readonly syncOpenOrdersToChart = effect(() => {
    const sym = this.currentSymbol().toLowerCase();
    const lines = this.basicOrders()
      .filter((o: any) => o.symbol?.toLowerCase() === sym && parseFloat(o.price) > 0)
      .map((o: any) => ({
        price: parseFloat(o.price),
        side: o.side,
        type: o.type ?? 'LIMIT',
        qty: parseFloat(o.origQty ?? o.qty ?? 0),
        orderId: o.orderId ?? o.clientOrderId ?? Math.random(),
      }));

    this.chartService.setOpenOrdersChartData(lines);
  });

  ngOnInit(): void {
    this.fetchPositions();
    this.fetchOpenOrders();
    this.fetchPendingTpSl();

    this.binanceWsService.wsAllTickers();

    this.binanceWsService.allTickers$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tickers) => {
        const currentPrice = { ...this.livePrices() };
        let updated = false;

        const activeSymbols = new Set(this.positions().map((p) => p.symbol));
        if (activeSymbols.size === 0) return;

        for (const ticker of tickers) {
          if (activeSymbols.has(ticker.s)) {
            currentPrice[ticker.s] = parseFloat(ticker.c);
            updated = true;
          }
        }

        if (updated) {
          this.livePrices.set(currentPrice);
        }
      });

    this.appSettingsService.isLoadingPositions$
      .pipe(debounceTime(1200), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (isLoading) => {
          if (isLoading) {
            this.fetchPositions();
          }
        },
        error: (err) => {
          console.error(err);
          this.appSettingsService.setIsLoadingPositions(false);
        },
      });

    this.appSettingsService.isLoadingOpenOrders$
      .pipe(debounceTime(1200), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (isLoading) => {
          if (isLoading) {
            this.fetchOpenOrders();
          }
        },
        error: (err) => {
          console.error(err);
          this.appSettingsService.setIsLoadingOpenOrders(false);
        },
      });

    this.appSettingsService.isLoadingPendingTpSl$
      .pipe(debounceTime(1200), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (isLoading) => {
          if (isLoading) {
            this.fetchPendingTpSl();
          }
        },
        error: (err) => {
          console.error(err);
          this.appSettingsService.setIsLoadingPendingTpSl(false);
        },
      });

    this.userWsService
      .getUserDataStream()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (update) => {
          if (update.e === USER_STREAM.ORDER_TRADE_UPDATE) {
            if (update.o.X === 'NEW') {
              console.log('NEW: ', update);
            } else if (update.o.X === 'PARTIALLY_FILLED') {
              // this.fetchPositions();
              // this.fetchOpenOrders();
              console.log('PARTIALLY_FILLED: ', update);
            } else if (update.o.X === 'FILLED') {
              // this.fetchPositions();
              // this.fetchOpenOrders();
              console.log('FILLED: ', update);
            } else if (update.o.X === 'CANCELED') {
              // this.fetchOpenOrders();
              console.log('CANCELED ORDER_TRADE_UPDATE: ', update);
            }
          } else if (update.e === USER_STREAM.ALGO_UPDATE) {
            if (update.o.X === 'CANCELED') {
              // this.fetchPositions();
              // this.fetchPendingTpSl();
              console.log('CANCELED ALGO_UPDATE: ', update);
            }
          } else if (update.e === USER_STREAM.OTOCO_ORDER_UPDATE) {
            console.log('OTOCO_ORDER_UPDATE: ', update);
          }
        },
        error: (err) => {
          console.log('USER_STREAM ERROR: ', err);
        },
      });
  }

  private fetchPositions(): void {
    forkJoin({
      positions: this.futureTradeService.getFuturesPositions(),
      commissionRate: this.userService.getCommissionRate([this.currentSymbol()]),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ positions, commissionRate }) => {
          const activePos = positions
            .filter((p: any) => parseFloat(p.positionAmt) !== 0)
            .map((pos: any) => {
              return {
                ...pos,
                commissionRate: commissionRate.find(
                  (r: any) => r.symbol.toLowerCase() === pos.symbol.toLowerCase(),
                ),
              };
            });

          this.positions.set(activePos);
          this.appSettingsService.setIsLoadingPositions(false);
        },
        error: (err) => {
          console.error(err);
          this.appSettingsService.setIsLoadingPositions(false);
        },
      });
  }

  private fetchOpenOrders(): void {
    this.futureTradeService
      .getOpenOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.openOrders.set(orders);
          this.appSettingsService.setIsLoadingOpenOrders(false);
        },
        error: (err) => {
          console.error(err);
          this.appSettingsService.setIsLoadingOpenOrders(false);
        },
      });
  }

  private fetchPendingTpSl(): void {
    this.futureTradeService
      .getPendingTpSl()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.pendingTpSl.set(orders);
          this.appSettingsService.setIsLoadingPendingTpSl(false);
        },
        error: (err) => {
          console.error(err);
          this.appSettingsService.setIsLoadingPendingTpSl(false);
        },
      });
  }

  cancelOrder(order: any): void {
    this.futureTradeService
      .cancelOrder(order.symbol, order.orderId, order.clientOrderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.appSettingsService.setIsLoadingPositions(true);
          this.appSettingsService.setIsLoadingOpenOrders(true);
          this.appSettingsService.setIsLoadingPendingTpSl(true);
        },
        error: (err) => {
          this.appSettingsService.setIsLoadingPositions(false);
          this.appSettingsService.setIsLoadingOpenOrders(false);
          this.appSettingsService.setIsLoadingPendingTpSl(false);
          console.error(err);
        },
      });
  }

  closePosition(pos: any): void {
    const positionSideMap =
      pos.positionSide === PositionSideEnum.LONG
        ? OrderSideEnum.SELL
        : pos.positionSide === PositionSideEnum.SHORT
          ? OrderSideEnum.BUY
          : pos.positionAmt > 0
            ? OrderSideEnum.SELL
            : OrderSideEnum.BUY;
    const body = {
      symbol: pos.symbol,
      side: positionSideMap,
      type: OrderTypeEnum.MARKET,
      quantity: Math.abs(parseFloat(pos.positionAmt)).toString(),
      reduceOnly: true,
    };

    this.confirmationService.confirm({
      message: `Are you sure you want to close ${pos.symbol} position?`,
      header: 'Close Position?',
      icon: 'pi pi-info-circle',
      rejectLabel: 'Cancel',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
        size: 'small',
      },
      acceptButtonProps: {
        label: 'Confirm',
        severity: 'success',
        outlined: true,
        size: 'small',
      },
      accept: () => {
        this.futureTradeService
          .closePosition(body)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.appSettingsService.setIsLoadingPositions(true);
              this.appSettingsService.setIsLoadingOpenOrders(true);
              this.appSettingsService.setIsLoadingPendingTpSl(true);
            },
            error: (err) => {
              this.appSettingsService.setIsLoadingPositions(false);
              this.appSettingsService.setIsLoadingOpenOrders(false);
              this.appSettingsService.setIsLoadingPendingTpSl(false);
            },
          });
      },
      reject: () => {},
    });
  }

  selectSymbol(symbol: string): void {
    if (symbol.toLowerCase() === this.currentSymbol().toLowerCase()) {
      return;
    }

    this.localStorageService.updateLocalStorageSignal(STORAGE.SYMBOL, symbol.toLowerCase());
    window.location.reload();
  }

  removeTPSL(pos: any): void {
    this.futureTradeService
      .cancelTpSl({
        algoId: pos.isTakeProfit
          ? pos?.algoId || pos?.takeProfit?.algoId
          : pos?.algoId || pos?.stopLoss?.algoId,
        clientAlgoId: pos.isTakeProfit
          ? pos?.clientAlgoId || pos?.takeProfit?.clientAlgoId
          : pos?.clientAlgoId || pos?.stopLoss?.clientAlgoId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.toastMessageService.success(
            pos.isTakeProfit ? 'Take profit removed.' : 'Stop loss removed.',
          );
          this.appSettingsService.setIsLoadingPositions(true);
          this.appSettingsService.setIsLoadingOpenOrders(true);
          this.appSettingsService.setIsLoadingPendingTpSl(true);
        },
        error: (err) => {
          const { error, details } = err.error;
          this.toastMessageService.error(error, details.msg);

          this.appSettingsService.setIsLoadingPositions(false);
          this.appSettingsService.setIsLoadingOpenOrders(false);
          this.appSettingsService.setIsLoadingPendingTpSl(false);
        },
      });
  }

  openTPSLDialog(pos: any): void {
    this.dialogRef = this.dialogService.open(TpSlComponent, {
      showHeader: false,
      data: {
        ...pos,
        type: pos.isTakeProfit ? OrderTypeEnum.TAKE_PROFIT_MARKET : OrderTypeEnum.STOP_MARKET,
      },
      width: '500px',
      modal: true,
      breakpoints: {
        '425px': '90%',
      },
    });

    this.dialogRef?.onClose.subscribe((payload) => {
      if (!payload) {
        return;
      }

      if (payload.isRemove) {
        this.removeTPSL(pos);
        return;
      }

      const newPayload: any = {
        symbol: pos.symbol,
        triggerPrice: payload.triggerPrice,
        closePosition: true,
      };

      if (payload?.type === OrderTypeEnum.STOP_MARKET) {
        const side = Number(pos?.positionAmt) > 0 ? OrderSideEnum.SELL : OrderSideEnum.BUY;
        newPayload.side = side;

        this.futureTradeService
          .stopLoss(newPayload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              this.toastMessageService.success('Stop loss set successfully.');
              this.appSettingsService.setIsLoadingPositions(true);
              this.appSettingsService.setIsLoadingPendingTpSl(true);
            },
            error: (err) => {
              const { error, details } = err.error;
              this.toastMessageService.error(error, details.msg);

              this.appSettingsService.setIsLoadingPositions(false);
              this.appSettingsService.setIsLoadingPendingTpSl(false);
            },
          });
      } else if (payload?.type === OrderTypeEnum.TAKE_PROFIT_MARKET) {
        const side = Number(pos?.positionAmt) > 0 ? OrderSideEnum.BUY : OrderSideEnum.SELL;
        newPayload.side = side;

        this.futureTradeService
          .takeProfit(newPayload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              this.toastMessageService.success('Take profit set successfully.');
              this.appSettingsService.setIsLoadingPositions(true);
              this.appSettingsService.setIsLoadingPendingTpSl(true);
            },
            error: (err) => {
              const { error, details } = err.error;
              this.toastMessageService.error(error, details.msg);

              this.appSettingsService.setIsLoadingPositions(false);
              this.appSettingsService.setIsLoadingPendingTpSl(false);
            },
          });
      }
    });
  }
}
