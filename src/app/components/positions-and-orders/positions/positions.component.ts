import { Component, DestroyRef, inject, input, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Models
import { PositionSideEnum } from '../../../core/models/trades.model';

// Services
import { ChartService } from '../../../core/services/chart/chart.service';
import { AppSettingsService } from '../../../core/services/app-settings.service';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-positions',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule],
  templateUrl: './positions.component.html',
  styleUrl: './positions.component.scss',
})
export class PositionsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly appSettingsService = inject(AppSettingsService);
  readonly chartService = inject(ChartService);

  readonly positions = input.required<any[]>();
  readonly onClosePosition = output<any>();
  readonly onSelectSymbol = output<string>();
  readonly onOpenTPSLDialog = output<any>();
  readonly onRemoveTPSL = output<any>();

  readonly positionSideEnum = PositionSideEnum;
  isLoadingPositions: boolean = false;

  ngOnInit(): void {
    this.appSettingsService.isLoadingPositions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.isLoadingPositions = value;
      });
  }

  closePosition(pos: any): void {
    this.onClosePosition.emit(pos);
  }

  selectSymbol(symbol: string): void {
    this.onSelectSymbol.emit(symbol);
  }

  openTPSLDialog(pos: any, isTakeProfit: boolean): void {
    pos.isTakeProfit = isTakeProfit;
    this.onOpenTPSLDialog.emit(pos);
  }

  removeTPSL(pos: any, isTakeProfit: boolean): void {
    pos.isTakeProfit = isTakeProfit;
    this.onRemoveTPSL.emit(pos);
  }
}
