import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

//Services
import { AuthService } from './core/services/auth.service';
import { BinanceRestService } from './core/services/binance-rest.service';

// PrimeNG Modules
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { ToastMessageService } from './core/services/toast-message.service';

@Component({
  selector: 'app-root',
  imports: [RouterModule, ConfirmDialogModule, ToastModule, ScrollPanelModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly binanceRestService = inject(BinanceRestService);
  private readonly toastMessageService = inject(ToastMessageService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.getSymbolTickSize();
    this.authService.checkAuth().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  close(): void {
    this.toastMessageService.clear();
  }

  private getSymbolTickSize(): void {
    this.binanceRestService
      .getExchangeInfo()
      .subscribe((res) => {
        this.binanceRestService.setExchangeInfo(res);
      });
  }

}
