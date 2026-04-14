import { Component, DestroyRef, inject, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-header',
  imports: [ButtonModule, DynamicDialogModule, DialogModule, MenuModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  standalone: true,
})
export class HeaderComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialogService = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);

  items: MenuItem[] | undefined;

  ngOnInit(): void {
    this.setItems();
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
}
