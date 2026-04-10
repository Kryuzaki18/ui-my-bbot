import { Component, inject, OnInit, DestroyRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services
import { FutureTradeService } from '../../core/services/future-trade.service';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { UserWsService } from '../../core/services/user-ws.service';
import { AppSettingsService } from '../../core/services/app-settings.service';

// Models
import { OrderTypeEnum } from '../../core/models/trades.model';
import { STORAGE } from '../../core/constants/binance.constant';

// PrimeNG Modules
import { ProgressBarModule } from 'primeng/progressbar';
import { TabsModule } from 'primeng/tabs';

// Components
import { PositionsComponent } from './positions/positions.component';
import { OpenOrdersComponent } from './open-orders/open-orders.component';

@Component({
  selector: 'app-positions-and-orders',
  standalone: true,
  imports: [CommonModule, ProgressBarModule, TabsModule, PositionsComponent, OpenOrdersComponent],
  templateUrl: './positions-and-orders.component.html',
})
export class PositionsAndOrdersComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly userWsService = inject(UserWsService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly futureTradeService = inject(FutureTradeService);
  readonly appSettingsService = inject(AppSettingsService);
  
  readonly allOpenOrders = signal<any[]>([]);
  readonly positions = signal<any[]>([]);

  readonly orderTypeFilter = signal('basic');

  readonly basicOrders = computed(() => {
    return this.allOpenOrders().filter((o: any) => {
      const type = o.type || o.orderType || '';
      const isConditional = [OrderTypeEnum.STOP_MARKET, OrderTypeEnum.TAKE_PROFIT_MARKET].includes(type);
      return !isConditional && o.closePosition !== true;
    });
  });

  readonly conditionalOrders = computed(() => {
    return this.allOpenOrders().filter((o: any) => {
      const type = o.type || o.orderType || '';
      return [OrderTypeEnum.STOP_MARKET, OrderTypeEnum.TAKE_PROFIT_MARKET].includes(type);
    });
  });

  readonly visibleOrders = computed(() => {
    return this.orderTypeFilter() === 'basic' ? this.basicOrders() : this.conditionalOrders();
  });

  readonly enrichedPositions = computed(() => {
    const list = this.positions();
    const condOrders = this.conditionalOrders();

    return list.map((pos) => {
      const crossSide = pos.positionSide === 'LONG' || parseFloat(pos.positionAmt) > 0 ? 'SELL' : 'BUY';

      const tpOrder = condOrders.find(
        (o) => o.symbol === pos.symbol && o.side === crossSide && o.type === 'TAKE_PROFIT_MARKET',
      );
      const slOrder = condOrders.find(
        (o) => o.symbol === pos.symbol && o.side === crossSide && o.type === 'STOP_MARKET',
      );

      const entryPrice = parseFloat(pos.entryPrice);
      const leverage = parseFloat(pos.leverage || '20');
      const sign = pos.positionSide === 'SHORT' ? -1 : 1;

      let tpPercentage = null;
      let slPercentage = null;

      if (tpOrder && entryPrice > 0 && tpOrder.stopPrice) {
        tpPercentage = ((tpOrder.stopPrice - entryPrice) / entryPrice) * leverage * sign * 100;
      }
      if (slOrder && entryPrice > 0 && slOrder.stopPrice) {
        slPercentage = ((slOrder.stopPrice - entryPrice) / entryPrice) * leverage * sign * 100;
      }

      return {
        ...pos,
        tpPrice: tpOrder ? tpOrder.stopPrice : null,
        tpPercentage,
        slPrice: slOrder ? slOrder.stopPrice : null,
        slPercentage,
      };
    });
  });

  ngOnInit(): void {
    this.fetchOrders();
    this.fetchPositions();

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

  fetchOrders(): void {
    this.appSettingsService.setIsLoadingOpenOrders(true);

    this.futureTradeService
      .getPendingTpSl()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.allOpenOrders.set(orders);

          console.log(orders);
          setTimeout(() => {
            this.appSettingsService.setIsLoadingOpenOrders(false);
          }, 1000);
        },
        error: (err) => {
          console.error(err);
          this.appSettingsService.setIsLoadingOpenOrders(false);
        },
      });
  }

  private handleOrderTradeUpdate(o: any): void {
    this.allOpenOrders.update((current) => {
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
  }

  cancelOrder(order: any): void {
    this.appSettingsService.setIsLoadingOpenOrders(true);
    this.futureTradeService
      .cancelOrder(order.symbol, order.orderId, order.clientOrderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.appSettingsService.setIsLoadingOpenOrders(false);
        },
        error: (err) => {
          console.error(err);
          this.appSettingsService.setIsLoadingOpenOrders(false);
        },
      });
  }

  closePosition(pos: any): void {
    const positionSideMap =
      pos.positionSide === 'LONG'
        ? 'SELL'
        : pos.positionSide === 'SHORT'
          ? 'BUY'
          : pos.positionAmt > 0
            ? 'SELL'
            : 'BUY';
    const body = {
      symbol: pos.symbol,
      side: positionSideMap,
      type: 'MARKET',
      quantity: Math.abs(parseFloat(pos.positionAmt)).toString(),
      reduceOnly: true,
    };
    this.futureTradeService
      .closePosition(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err) => console.error('Failed to close position', err),
      });
  }

  selectSymbol(symbol: string): void {
    this.localStorageService.updateLocalStorageSignal(STORAGE.SYMBOL, symbol.toLowerCase());
    window.location.reload();
  }
}
