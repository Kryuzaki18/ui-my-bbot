import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { DOCUMENT } from '@angular/common';

// Components
import { HeaderComponent } from './components/commons/header/header.component';
import { FooterComponent } from './components/commons/footer/footer.component';
import { ChatComponent } from './components/chat/chat-component';
import { AppSplash } from './components/commons/app-splash/app-splash';

//Services
import { AuthService } from './core/services/auth.service';
import { BinanceRestService } from './core/services/binance-rest.service';
import { ToastMessageService } from './core/services/toast-message.service';
import { SplashService } from './core/services/splash.service';

// PrimeNG Modules
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-root',
  imports: [
    RouterModule,
    ConfirmDialogModule,
    ToastModule,
    ScrollPanelModule,
    ButtonModule,
    DialogModule,
    HeaderComponent,
    FooterComponent,
    ChatComponent,
    AppSplash,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly binanceRestService = inject(BinanceRestService);
  private readonly toastMessageService = inject(ToastMessageService);
  private readonly authService = inject(AuthService);
  private readonly splashService = inject(SplashService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.authService
      .checkAuth()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (isAuth) => this.splashService.complete(isAuth),
        error: () => this.splashService.complete(false),
      });

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.document.querySelector('.p-scrollpanel-content')?.scrollTo({ top: 0, behavior: 'smooth' });
      });

    this.getSymbolTickSize();
  }

  close(): void {
    this.toastMessageService.clear();
  }

  private getSymbolTickSize(): void {
    this.binanceRestService.getExchangeInfo().subscribe((res) => {
      this.binanceRestService.setExchangeInfo(res);
    });
  }
}
