import {
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services
import { BinanceRestService } from '../../../core/services/binance-rest.service';
import { UtilsService } from '../../../core/services/utils.service';
import { ChartService } from '../../../core/services/chart/chart.service';
import { AppSettingsService } from '../../../core/services/app-settings.service';

// Models
import { ExchangeSymbolsWithVolume } from '../../../core/models/trades.model';

// PrimeNG
import { TableModule } from 'primeng/table';
import { PopoverModule, Popover } from 'primeng/popover';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ScrollTopModule } from 'primeng/scrolltop';

@Component({
  selector: 'app-trading-symbols-popover',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    PopoverModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ScrollTopModule,
  ],
  templateUrl: './trading-symbols-popover.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradingSymbolsPopoverComponent implements OnInit {
  @ViewChild('symbolsPopover') popover!: Popover;

  private readonly destroyRef = inject(DestroyRef);
  private readonly binanceRestService = inject(BinanceRestService);
  private readonly chartService = inject(ChartService);
  private readonly appSettingsService = inject(AppSettingsService);
  readonly utilsService = inject(UtilsService);

  readonly exchangeSymbols = signal<ExchangeSymbolsWithVolume[]>([]);

  ngOnInit(): void {
    this.binanceRestService
      .getAllSymbolsWithVolume()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.exchangeSymbols.set(res);
      });
  }

  toggle(event: Event): void {
    this.popover.toggle(event);
  }

  hide(): void {
    this.popover.hide();
  }

  selectSymbol(symbol: string): void {
    this.appSettingsService.setIsCurrentPositionLoading(true);
    this.chartService.selectedSymbol.set(symbol);
    window.location.reload();
  }
}
