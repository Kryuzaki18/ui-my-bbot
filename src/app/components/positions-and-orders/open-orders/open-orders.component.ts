import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

// Services
import { ChartService } from '../../../core/services/chart/chart.service';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-open-orders',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule],
  templateUrl: './open-orders.component.html',
})
export class OpenOrdersComponent {
  readonly chartService = inject(ChartService);

  readonly basicOrders = input.required<any[]>();
  readonly onCancelOrder = output<any>();
  readonly onSelectSymbol = output<string>();

  cancelOrder(order: any): void {
    this.onCancelOrder.emit(order);
  }

  selectSymbol(symbol: string): void {
    this.onSelectSymbol.emit(symbol);
  }
}
