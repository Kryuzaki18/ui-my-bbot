import { Component, inject, OnInit, DestroyRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

// Services
import { UtilsService } from '../../core/services/utils.service';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { FutureTradeService } from '../../core/services/future-trade.service';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { UserWsService } from '../../core/services/user-ws.service';
import { BinanceWsService } from '../../core/services/binance-ws.service';
import { ToastMessageService } from '../../core/services/toast-message.service';

// Models
import { OrderSideEnum, OrderTypeEnum, PositionSideEnum } from '../../core/models/trades.model';
import { DEFAULT_SYMBOL, STORAGE } from '../../core/constants/binance.constant';

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
  private readonly binanceWsService = inject(BinanceWsService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly futureTradeService = inject(FutureTradeService);
  private readonly dialogService = inject(DialogService);
  private readonly toastMessageService = inject(ToastMessageService);
  readonly confirmationService = inject(ConfirmationService);
  readonly appSettingsService = inject(AppSettingsService);

  private dialogRef: DynamicDialogRef<any> | null = null;

  readonly openOrders = signal<any[]>([]);
  readonly pendingTpSl = signal<any[]>([]);
  readonly positions = signal<any[]>([]);
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

        const currentPrice =
          this.livePrices()[pos.symbol] || parseFloat(pos.markPrice || pos.entryPrice);
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

  ngOnInit(): void {
    this.fetchOpenOrders();
    this.fetchPendingTpSl();
    this.fetchPositions();

    this.binanceWsService.wsAllTickers();

    this.binanceWsService.allTickers$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tickers) => {
        const currentPrice = { ...this.livePrices() };
        let updated = false;

        const activeSymbols = new Set(this.positions().map((p) => p.symbol));
        if (activeSymbols.size === 0) return;

        for (const t of tickers) {
          if (activeSymbols.has(t.s)) {
            currentPrice[t.s] = parseFloat(t.c);
            updated = true;
          }
        }

        if (updated) {
          this.livePrices.set(currentPrice);
        }
      });

    this.userWsService
      .getUserDataStream()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        if (!data) return;

        if (data.e === 'ORDER_TRADE_UPDATE') {
          this.handleOrderTradeUpdate(data.o);
        } else if (data.e === 'ACCOUNT_UPDATE') {
          this.handleAccountUpdate(data.a);
        }
      });

    this.appSettingsService.isLoadingPositions$
      .pipe(debounceTime(1200), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (isLoading) => {
          if (isLoading) {
            this.appSettingsService.setIsLoadingPositions(false);
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
            this.appSettingsService.setIsLoadingOpenOrders(false);
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
            this.appSettingsService.setIsLoadingPendingTpSl(false);
            this.fetchPendingTpSl();
          }
        },
        error: (err) => {
          console.error(err);
          this.appSettingsService.setIsLoadingPendingTpSl(false);
        },
      });
  }

  fetchPositions(): void {
    this.futureTradeService
      .getFuturesPositions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (allPositions) => {
          const activePos = allPositions.filter((p: any) => parseFloat(p.positionAmt) !== 0);
          this.positions.set(activePos);
        },
        error: (err) => console.error(err),
      });
  }

  private fetchOpenOrders(): void {
    this.futureTradeService
      .getOpenOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.openOrders.set(orders);
        },
        error: (err) => {
          console.error(err);
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
        },
        error: (err) => {
          console.error(err);
        },
      });
  }

  private handleOrderTradeUpdate(o: any): void {
    this.pendingTpSl.update((current) => {
      const isTerminal = ['CANCELED', 'FILLED', 'REJECTED', 'EXPIRED'].includes(o.X);
      const idx = current.findIndex((ord) => ord.orderId === o.i || ord.clientOrderId === o.c);

      if (isTerminal) {
        if (idx > -1) {
          const updated = [...current];
          updated.splice(idx, 1);
          return updated;
        }
        return current;
      }

      const orderData = {
        updateTime: o.T,
        symbol: o.s,
        side: o.S,
        type: o.o,
        price: parseFloat(o.p),
        stopPrice: parseFloat(o.sp),
        origQty: parseFloat(o.q),
        executedQty: parseFloat(o.z),
        clientOrderId: o.c,
        orderId: o.i,
        closePosition: o.cp,
      };

      if (idx > -1) {
        const updated = [...current];
        updated[idx] = { ...updated[idx], ...orderData };
        return updated;
      } else {
        return [orderData, ...current];
      }
    });
  }

  private handleAccountUpdate(a: any): void {
    if (!a.P || !Array.isArray(a.P)) return;

    this.positions.update((current) => {
      let updated = [...current];
      for (const p of a.P) {
        const amt = parseFloat(p.pa);
        const idx = updated.findIndex((pos) => pos.symbol === p.s);

        if (amt === 0) {
          if (idx > -1) updated.splice(idx, 1);
        } else {
          const posData = {
            symbol: p.s,
            positionAmt: p.pa,
            entryPrice: p.ep,
            unRealizedProfit: p.up,
            positionSide: p.ps,
          };
          if (idx > -1) {
            updated[idx] = { ...updated[idx], ...posData };
          } else {
            updated.push(posData);
          }
        }
      }
      return updated;
    });

    this.fetchPositions();
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

  removeTPSL(pos: any): void {}

  openTPSLDialog({ pos, isTakeProfit }: { pos: any; isTakeProfit: boolean }): void {
    this.dialogRef = this.dialogService.open(TpSlComponent, {
      showHeader: false,
      data: {
        ...pos,
        type: isTakeProfit ? OrderTypeEnum.TAKE_PROFIT_MARKET : OrderTypeEnum.STOP_MARKET,
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
        this.futureTradeService
          .cancelTpSl({
            algoId: isTakeProfit ? pos?.takeProfit?.algoId : pos?.stopLoss?.algoId,
            clientAlgoId: isTakeProfit
              ? pos?.takeProfit?.clientAlgoId
              : pos?.stopLoss?.clientAlgoId,
          })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              this.toastMessageService.success(
                isTakeProfit ? 'Take profit removed.' : 'Stop loss removed.',
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
    });
  }
}
