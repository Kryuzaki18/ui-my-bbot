import { Component, OnInit, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe, CurrencyPipe, NgClass } from '@angular/common';

// Services
import { UserWsService } from '../../core/services/user-ws.service';
import { UserService } from '../../core/services/user.service';

// Constants
import { USER_STREAM } from '../../core/constants/binance.constant';

// Models
import { UserInfo } from '../../core/models/user-info.model';

// PrimeNG
import { Skeleton } from 'primeng/skeleton';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-account-balance',
  imports: [AsyncPipe, CurrencyPipe, NgClass, Skeleton],
  templateUrl: './account-balance.component.html',
  styleUrl: './account-balance.component.scss',
  standalone: true,
})
export class AccountBalanceComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly userWsService = inject(UserWsService);
  readonly userService = inject(UserService);

  private readonly dialogRef = inject(DynamicDialogRef, { optional: true });
  readonly dynamicDialogConfig = inject(DynamicDialogConfig, { optional: true });

  userInfo = signal<UserInfo | null>(null);

  ngOnInit(): void {
    this.getUserInfo();

    this.userService.totalLivePnl$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (pnl) => {
        const absPnl = Math.abs(pnl);
        this.userInfo.update((prev) => ({
          ...prev,
          availableBalance:
            pnl > 0
              ? (prev?.totalWalletBalance || 0) + absPnl
              : (prev?.totalWalletBalance || 0) - absPnl,
        }));
      },
    });

    this.userWsService
      .getUserDataStream()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (update) => {
          if (update.e === USER_STREAM.ACCOUNT_UPDATE) {
            this.getUserInfo();
          }
        },
        error: (err) => {
          console.error(err);
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

  close(): void {
    this.dialogRef?.close();
  }
}
