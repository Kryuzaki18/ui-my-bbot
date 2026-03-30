import { Component, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';

// Services
import { BinanceService } from '../../core/services/binance.service';

// Models
import { UserInfo } from '../../core/models/user-info.model';

@Component({
  selector: 'app-mini-info',
  imports: [CurrencyPipe],
  templateUrl: './mini-info.html',
  styleUrl: './mini-info.scss',
})
export class MiniInfo implements OnInit, OnDestroy {
  userInfo: UserInfo | null = null;
  private destroyRef = inject(DestroyRef);

  constructor(private binanceService: BinanceService) {}

  ngOnInit(): void {
    this.getUserInfo();

    // Start WebSocket Stream
    this.binanceService.startUserDataStream();

    this.binanceService
      .getUserDataStream()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (update) => {
          const balances = update.a?.B;
          const positions = update.a?.P;

          if (this.userInfo) {
            let newWalletBalance = this.userInfo.totalWalletBalance;
            let newAvailableBalance = this.userInfo.availableBalance;
            let newUnrealizedProfit = this.userInfo.totalUnrealizedProfit;

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
              // Recalculate or simply use the streaming up for the specific position
              // But if P provides multiple positions, we sum them
              let sumPnL = 0;
              positions.forEach((p: any) => {
                sumPnL += parseFloat(p.up);
              });
              newUnrealizedProfit = sumPnL;
            }

            this.userInfo = {
              ...this.userInfo,
              totalWalletBalance: newWalletBalance,
              availableBalance: newAvailableBalance,
              totalUnrealizedProfit: newUnrealizedProfit,
            };
          }
        },
      });
  }

  ngOnDestroy(): void {
    this.binanceService.stopUserDataStream();
  }

  getUserInfo(): void {
    this.binanceService
      .getUserInfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.userInfo = res;
        },
        error: (err) => {
          console.error(err);
        },
      });
  }
}
