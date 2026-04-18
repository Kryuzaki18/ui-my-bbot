import { Component, DestroyRef, inject, input, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Models
import { OrderTypeEnum } from '../../../core/models/trades.model';

// Services
import { ChartService } from '../../../core/services/chart/chart.service';
import { AppSettingsService } from '../../../core/services/app-settings.service';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-open-orders',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule],
  templateUrl: './open-orders.component.html',
})
export class OpenOrdersComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly appSettingsService = inject(AppSettingsService);
  readonly chartService = inject(ChartService);

  readonly basicOrders = input.required<any[]>();
  readonly onCancelOrder = output<any>();
  readonly onSelectSymbol = output<string>();

  OrderTypeEnum = OrderTypeEnum;
  isLoadingOpenOrders: boolean = false;

  ngOnInit(): void {
    this.appSettingsService.isLoadingOpenOrders$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.isLoadingOpenOrders = value;
      });
  }

  cancelOrder(order: any): void {
    this.onCancelOrder.emit(order);
  }

  selectSymbol(symbol: string): void {
    this.onSelectSymbol.emit(symbol);
  }
}
