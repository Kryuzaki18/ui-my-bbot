import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

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
export class OpenOrders implements OnInit, OnDestroy {
  binanceService = inject(BinanceService);
  openOrders: any[] = [];
  loading = false;
  private destroy$ = new Subject<void>();

  ngOnInit():void {
    this.fetchOrders();

    this.binanceService.getUserDataStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.e === 'ORDER_TRADE_UPDATE') {
          // Whenever an order update occurs (like a fill or creation), re-fetch
          this.fetchOrders();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchOrders(): void {
    this.loading = true;
    this.binanceService.getOpenOrders().subscribe({
      next: (orders) => {
        this.openOrders = orders.filter((o: any) => {
          const type = o.type || o.orderType || '';
          const isConditional = ['STOP_MARKET', 'TAKE_PROFIT_MARKET', 'STOP', 'TAKE_PROFIT'].includes(type);
          return !isConditional && o.closePosition !== true;
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to fetch open orders', err);
        this.loading = false;
      }
    });
  }

  cancelOrder(order: any): void {
    this.loading = true;
    this.binanceService.cancelOrder(order.symbol, order.orderId).subscribe({
      next: () => this.fetchOrders(),
      error: (err) => {
        console.error('Failed to cancel order', err);
        this.loading = false;
      }
    });
  }

  editOrder(order: any): void {

  }

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
