import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services
import { UserService } from '../../core/services/user.service';
import { FutureTradeService } from '../../core/services/future-trade.service';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { OrderTypeEnum } from '../../core/models/trades.model';

@Component({
  selector: 'app-open-orders',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, ProgressBarModule],
  templateUrl: './open-orders.html',
  styleUrl: './open-orders.scss',
})
export class OpenOrders implements OnInit {
  private destroyRef = inject(DestroyRef);
  private userService = inject(UserService);
  private futureTradeService = inject(FutureTradeService);

  openOrders: any[] = [];
  loading = false;

  ngOnInit(): void {
    this.fetchOrders();

    this.userService
      .getUserDataStream()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        if (data && data.e === 'ORDER_TRADE_UPDATE') {
          this.fetchOrders();
        }
      });
  }

  fetchOrders(): void {
    this.loading = true;

    this.futureTradeService
      .getOpenOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.openOrders = orders.filter((o: any) => {
            const type = o.type || o.orderType || '';
            const isConditional = [
              OrderTypeEnum.STOP_MARKET,
              OrderTypeEnum.TAKE_PROFIT_MARKET,
            ].includes(type);
            return !isConditional && o.closePosition !== true;
          });

          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
        },
      });
  }

  cancelOrder(order: any): void {
    this.loading = true;

    this.futureTradeService
      .cancelOrder(order.symbol, order.orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.fetchOrders(),
        error: (err) => {
          console.error(err);
          this.loading = false;
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
}
