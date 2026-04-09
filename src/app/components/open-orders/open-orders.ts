import { Component, inject, OnInit, DestroyRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services
import { FutureTradeService } from '../../core/services/future-trade.service';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { UserWsService } from '../../core/services/user-ws.service';

// Constants
import { STORAGE } from '../../core/constants/binance.constant';

// Models
import { OrderTypeEnum } from '../../core/models/trades.model';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TabsModule } from 'primeng/tabs';
import { AppSettingsService } from '../../core/services/app-settings.service';

@Component({
  selector: 'app-open-orders',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, ProgressBarModule, TabsModule],
  templateUrl: './open-orders.html',
  styleUrl: './open-orders.scss',
})
export class OpenOrders implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly userWsService = inject(UserWsService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly futureTradeService = inject(FutureTradeService);
  readonly appSettingsService = inject(AppSettingsService);
  readonly openOrders = signal<any[]>([]);

  ngOnInit(): void {
    this.fetchOrders();

    this.userWsService
      .getUserDataStream()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        if (data && data.e === 'ORDER_TRADE_UPDATE') {
          this.fetchOrders();
        }
      });
  }

  onTabChange(event: any) {
    if (Number(event) === 1) {
      this.fetchOrders();
    }
  }

  fetchOrders(): void {
    this.appSettingsService.setIsLoadingOpenOrders(true);

    this.futureTradeService
      .getOpenOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          const filteredOrders = orders.filter((o: any) => {
            const type = o.type || o.orderType || '';
            const isConditional = [
              OrderTypeEnum.STOP_MARKET,
              OrderTypeEnum.TAKE_PROFIT_MARKET,
            ].includes(type);
            return !isConditional && o.closePosition !== true;
          });

          this.openOrders.set(filteredOrders);
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

  cancelOrder(order: any): void {
    this.futureTradeService
      .cancelOrder(order.symbol, order.orderId, order.clientOrderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.fetchOrders();
          this.appSettingsService.setIsLoadingOpenOrders(false);
        },
        error: (err) => {
          console.error(err);
          this.appSettingsService.setIsLoadingOpenOrders(false);
        },
      });
  }

  editOrder(order: any): void {}

  cancelAllOrders(): void {
    // this.loading = true;
    // this.binanceService.cancelAllOrders().subscribe({
    //   next: () => this.fetchOrders(),
    //   error: (err) => {
    //     console.error('Failed to cancel all orders', err);
    //     this.loading = false;
    //   }
    // });
  }

  selectSymbol(symbol: string): void {
    this.localStorageService.updateLocalStorageSignal(STORAGE.SYMBOL, symbol.toLowerCase());
    window.location.reload();
  }
}
