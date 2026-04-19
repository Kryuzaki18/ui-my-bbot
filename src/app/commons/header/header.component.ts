import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Components
import { SigninComponent } from '../../components/signin/signin.component';
import { AccountBalanceComponent } from '../../components/account-balance/account-balance.component';
import { TradeFormComponent } from '../../components/trade-form/trades-form.component';

//PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '../../core/services/auth.service';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

// Constants
import { STORAGE } from '../../core/constants/binance.constant';

// Services
import { AppSettingsService } from '../../core/services/app-settings.service';
import { ChartService } from '../../core/services/chart/chart.service';
import { BinanceRestService } from '../../core/services/binance-rest.service';
import { LocalStorageService } from '../../core/services/local-storage.service';

@Component({
  selector: 'app-header',
  imports: [ButtonModule, DynamicDialogModule, DialogModule, MenuModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  standalone: true,
})
export class HeaderComponent implements OnInit {
  readonly appSettingsService = inject(AppSettingsService);
  readonly chartService = inject(ChartService);
  readonly binanceRestService = inject(BinanceRestService);
  readonly authService = inject(AuthService);
  private readonly localStorageService = inject(LocalStorageService);

  private readonly router = inject(Router);
  private readonly dialogService = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);

  items: MenuItem[] | undefined;
  gainers = signal<any[]>([]);
  losers = signal<any[]>([]);

  ngOnInit(): void {
    this.setItems();

    this.binanceRestService
      .getAllSymbolsWithVolume()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res) {
            const gainers = res
              .filter((s) => s.priceChangePercent > 0)
              .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
              .map((s) => {
                return {
                  symbol: s.symbol,
                  priceChangePercent: s.priceChangePercent,
                };
              })
              .slice(0, 10);

            const losers = res
              .filter((s) => s.priceChangePercent < 0)
              .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
              .map((s) => {
                return {
                  symbol: s.symbol,
                  priceChangePercent: s.priceChangePercent,
                };
              })
              .slice(0, 10);
            this.gainers.set(gainers);
            this.losers.set(losers);
          }
        },
        error: (err) => {},
      });
  }

  setItems(): void {
    this.items = [
      {
        label: 'Account Balance',
        icon: 'pi pi-wallet',
        command: () => this.showAccountBalanceDialog(),
      },
      {
        label: 'Trade Form',
        icon: 'pi pi-pencil',
        command: () => this.showTradeInputDialog(),
      },
      {
        label: 'Signout',
        icon: 'pi pi-sign-out',
        severity: 'danger',
        command: () => this.signout(),
      },
    ];
  }

  signout(): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    this.authService
      .signOut()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.chartService.setPositionChartData(null);
          this.chartService.setOpenOrdersChartData([]);
          this.router.navigate(['/home']);
        },
        error: (err) => {},
      });
  }

  signin(): void {
    if (this.authService.isLoggedIn()) {
      return;
    }

    this.dialogService.open(SigninComponent, {
      showHeader: false,
      closable: true,
      modal: true,
      contentStyle: { 'padding-bottom': '0' },
      breakpoints: {
        '375px': '90vw',
      },
    });
  }

  showAccountBalanceDialog(): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    this.dialogService.open(AccountBalanceComponent, {
      showHeader: false,
      width: '300px',
      modal: true,
      styleClass: 'p-0',
      data: {
        isDialog: true,
      },
    });
  }

  showTradeInputDialog(): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    this.dialogService.open(TradeFormComponent, {
      showHeader: false,
      width: '280px',
      modal: true,
      styleClass: 'p-0',
      data: {
        isDialog: true,
      },
    });
  }

  selectSymbol(symbol: string): void {
    const getSymbol = this.localStorageService.getLocalStorageSignal(
      STORAGE.SYMBOL,
      symbol.toLowerCase(),
    );
    if (symbol.toLowerCase() === getSymbol().toLowerCase()) {
      return;
    }
    this.chartService.selectedSymbol.set(symbol);
    window.location.reload();
  }
}
