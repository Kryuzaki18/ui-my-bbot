import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services
import { BinanceService } from '../../core/services/binance.service';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  selector: 'app-open-orders',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, ProgressBarModule],
  templateUrl: './open-orders.html',
  styleUrl: './open-orders.scss',
})
export class OpenOrders implements OnInit {
  binanceService = inject(BinanceService);
  openOrders: any[] = [];
  loading = false;
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.fetchOrders();

    this.binanceService
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

    this.binanceService
      .getOpenOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.openOrders = orders.filter((o: any) => {
            const type = o.type || o.orderType || '';
            const isConditional = [
              'STOP_MARKET',
              'TAKE_PROFIT_MARKET',
              'STOP',
              'TAKE_PROFIT',
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

    this.binanceService
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
