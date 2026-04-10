import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
export class OpenOrdersComponent {
  readonly visibleOrders = input.required<any[]>();
  readonly orderTypeFilter = input.required<string>();

  readonly orderTypeOptions = [
    { label: 'Basic', value: 'basic' },
    { label: 'Conditional', value: 'conditional' },
  ];

  readonly onFilterChange = output<string>();
  readonly onCancelOrder = output<any>();
  readonly onSelectSymbol = output<string>();

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
