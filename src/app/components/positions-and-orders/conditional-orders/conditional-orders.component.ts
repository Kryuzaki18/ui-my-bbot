import { Component, DestroyRef, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Models
import { OrderTypeEnum } from '../../../core/models/trades.model';
import { AppSettingsService } from '../../../core/services/app-settings.service';

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly appSettingsService = inject(AppSettingsService);
  readonly conditionalOrders = input.required<any[]>();
  readonly onSelectSymbol = output<string>();
  readonly onRemoveTPSL = output<any>();

  readonly orderTypeEnum = OrderTypeEnum;

  isLoadingPendingTpSl: boolean = false;

  ngOnInit(): void {
    this.appSettingsService.isLoadingPendingTpSl$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.isLoadingPendingTpSl = value;
      });
  }

  removeTPSL(tpsl: any): void {
    tpsl.isTakeProfit = tpsl.orderType === this.orderTypeEnum.TAKE_PROFIT_MARKET;
    this.onRemoveTPSL.emit(tpsl);
  }

  selectSymbol(symbol: string): void {
    this.onSelectSymbol.emit(symbol);
  }
}
