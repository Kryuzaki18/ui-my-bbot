import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-positions',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule],
  templateUrl: './positions.component.html',
})
export class PositionsComponent {
  readonly positions = input.required<any[]>();
  readonly onClosePosition = output<any>();
  readonly onSelectSymbol = output<string>();
  readonly onOpenTPSLDialog = output<{ pos: any; isTakeProfit: boolean }>();
  readonly onRemoveTPSL = output<string>();

  closePosition(pos: any): void {
    this.onClosePosition.emit(pos);
  }

  selectSymbol(symbol: string): void {
    this.onSelectSymbol.emit(symbol);
  }

  openTPSLDialog(pos: any, isTakeProfit: boolean): void {
    this.onOpenTPSLDialog.emit({ pos, isTakeProfit });
  }

  removeTPSL(pos: any): void {
    this.onRemoveTPSL.emit(pos);
  }
}
