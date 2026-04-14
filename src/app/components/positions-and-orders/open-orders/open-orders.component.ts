import { Component, input, OnChanges, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Models
import { OrderTypeEnum } from '../../../core/models/trades.model';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';

@Component({
  selector: 'app-open-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, SelectButtonModule],
  templateUrl: './open-orders.component.html',
})
export class OpenOrdersComponent implements OnChanges {
  readonly visibleOrders = input.required<any[]>();
  readonly orderTypeFilter = input.required<string>();
  readonly ordersCount = input.required<{ basic: number; conditional: number }>();

  readonly onFilterChange = output<string>();
  readonly onCancelOrder = output<any>();
  readonly onSelectSymbol = output<string>();

  readonly OrderTypeEnum = OrderTypeEnum;

  orderTypeOptions = [
    { label: 'Basic', value: 'basic' },
    { label: 'Conditional', value: 'conditional' },
  ];

  ngOnChanges(): void {
    this.orderTypeOptions = [
      {
        label: `Basic(${this.ordersCount().basic})`,
        value: 'basic',
      },
      {
        label: `Conditional(${this.ordersCount().conditional})`,
        value: 'conditional',
      },
    ];
  }

  filterChange(value: string): void {
    this.onFilterChange.emit(value);
  }

  cancelOrder(order: any): void {
    this.onCancelOrder.emit(order);
  }

  selectSymbol(symbol: string): void {
    this.onSelectSymbol.emit(symbol);
  }
}
