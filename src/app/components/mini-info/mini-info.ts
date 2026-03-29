import { Component, OnInit, OnDestroy } from '@angular/core';

import { BinanceService } from '../../core/services/binance.service';

import { UserInfo } from '../../core/models/user-info.model';

@Component({
  selector: 'app-mini-info',
  imports: [],
  templateUrl: './mini-info.html',
  styleUrl: './mini-info.scss',
})
export class MiniInfo implements OnInit, OnDestroy {
  userInfo: UserInfo | null = null;

  constructor(private binanceService: BinanceService) {}

  ngOnInit(): void {
    this.getUserInfo();

    // Start WebSocket Stream
    this.binanceService.startUserDataStream();

    this.binanceService.getUserDataStream().subscribe({
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
      }
    });
  } 

  ngOnDestroy(): void {
    this.binanceService.stopUserDataStream();
  }

  getUserInfo(): void {
    this.binanceService.getUserInfo().subscribe({
      next: (res) => {
        this.userInfo = res;
      },
      error: (err) => {
        console.error('err: ', err);
      },
    });
  }
}
