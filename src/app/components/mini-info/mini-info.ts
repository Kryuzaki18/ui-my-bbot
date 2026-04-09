import { Component, OnInit, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';

// Services
import { UserWsService } from '../../core/services/user-ws.service';
import { UserService } from '../../core/services/user.service';

// Models
import { UserInfo } from '../../core/models/user-info.model';

// PrimeNG
import { Skeleton } from 'primeng/skeleton';

@Component({
  selector: 'app-mini-info',
  imports: [CurrencyPipe, Skeleton],
  templateUrl: './mini-info.html',
  styleUrl: './mini-info.scss',
})
export class MiniInfoComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private userWsService = inject(UserWsService);
  private userService = inject(UserService);

  userInfo = signal<UserInfo | null>(null);

  ngOnInit(): void {
    this.getUserInfo();

    this.userWsService
      .getUserDataStream()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (update) => {
          const balances = update.a?.B;
          const positions = update.a?.P;

          if (this.userInfo()) {
            let newWalletBalance = this.userInfo()!.totalWalletBalance;
            let newAvailableBalance = this.userInfo()!.availableBalance;
            let newUnrealizedProfit = this.userInfo()!.totalUnrealizedProfit;

            // Update Balances from stream
            if (balances) {
              const usdtBalance = balances.find((b: any) => b.a === 'USDT');
              if (usdtBalance) {
                newWalletBalance = parseFloat(usdtBalance.wb);
                newAvailableBalance = parseFloat(usdtBalance.cw);
              }
            }

            // Update Unrealized PNL from stream
            if (positions && positions.length > 0) {
              let sumPnL = 0;
              positions.forEach((p: any) => {
                sumPnL += parseFloat(p.up);
              });
              newUnrealizedProfit = sumPnL;
            }

            this.userInfo.set({
              ...this.userInfo(),
              totalWalletBalance: newWalletBalance,
              availableBalance: newAvailableBalance,
              totalUnrealizedProfit: newUnrealizedProfit,
            });
          }
        },
      });
  }

  getUserInfo(): void {
    this.userService
      .getUserInfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.userInfo.set(res);
        },
        error: (err) => {
          console.error(err);
        },
      });
  }
}
