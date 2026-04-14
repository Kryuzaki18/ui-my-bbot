import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

// Models
import { OrderTypeEnum } from '../../../core/models/trades.model';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-conditional-orders',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule],
  templateUrl: './conditional-orders.component.html',
})
export class ConditionalOrdersComponent {
  readonly conditionalOrders = input.required<any[]>();
  readonly onCancelOrder = output<any>();
  readonly onSelectSymbol = output<string>();
  
  readonly OrderTypeEnum = OrderTypeEnum;

  cancelOrder(order: any): void {
    this.onCancelOrder.emit(order);
  }

  selectSymbol(symbol: string): void {
    this.onSelectSymbol.emit(symbol);
  }
}
