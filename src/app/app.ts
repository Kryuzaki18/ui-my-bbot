import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

// Services
import { BinanceWsService } from './core/services/binance-ws.service';

// PrimeNG Modules
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  imports: [RouterModule, ConfirmDialogModule, ToastModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private binanceWsService = inject(BinanceWsService);

  ngOnInit(): void {
    this.binanceWsService.createAggTradeStream('btcusdt');
    this.binanceWsService.createAggTradeStream('ethusdt');
  }
}
