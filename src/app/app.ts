import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

// Services
import { BinanceWsService } from './core/services/binance-ws.service';

// Constants
import { DEFAULT_TIMEFRAME, SYMBOLS } from './core/constants/binance.constant';

// PrimeNG Modules
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ScrollPanelModule } from 'primeng/scrollpanel';

@Component({
  selector: 'app-root',
  imports: [RouterModule, ConfirmDialogModule, ToastModule, ScrollPanelModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private binanceWsService = inject(BinanceWsService);

  ngOnInit(): void {
    this.binanceWsService.createAggTradeStream(SYMBOLS.BTCUSDT);
    this.binanceWsService.createAggTradeStream(SYMBOLS.ETHUSDT);
  }
}
