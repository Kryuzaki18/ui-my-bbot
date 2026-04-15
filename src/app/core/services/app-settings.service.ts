import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Environments
import { prodEnv, testnetEnv } from '../../../environments/environment';

// Services
import { LocalStorageService } from './local-storage.service';
import { STORAGE } from '../constants/binance.constant';

@Injectable({
  providedIn: 'root',
})
export class AppSettingsService implements OnDestroy {
  private readonly localStorageService = inject(LocalStorageService);

  private isLoadingPositionsSubject = new BehaviorSubject<boolean>(false);
  readonly isLoadingPositions$ = this.isLoadingPositionsSubject.asObservable();

  private isLoadingOpenOrdersSubject = new BehaviorSubject<boolean>(false);
  readonly isLoadingOpenOrders$ = this.isLoadingOpenOrdersSubject.asObservable();

  private isLoadingPendingTpSlSubject = new BehaviorSubject<boolean>(false);
  readonly isLoadingPendingTpSl$ = this.isLoadingPendingTpSlSubject.asObservable();

  readonly isTestnet = this.localStorageService.getLocalStorageSignal<boolean>(STORAGE.IS_TESTNET, false);
  readonly env = computed(() => this.isTestnet() ? testnetEnv : prodEnv);

  setTestnet(value: boolean): void {
    this.localStorageService.updateLocalStorageSignal(STORAGE.IS_TESTNET, value);
  }

  setIsLoadingPositions(value: boolean): void {
    this.isLoadingPositionsSubject.next(value);
  }

  setIsLoadingOpenOrders(value: boolean): void {
    this.isLoadingOpenOrdersSubject.next(value);
  }

  setIsLoadingPendingTpSl(value: boolean): void {
    this.isLoadingPendingTpSlSubject.next(value);
  }

  ngOnDestroy(): void {
    this.isLoadingPositionsSubject.complete();
    this.isLoadingOpenOrdersSubject.complete();
    this.isLoadingPendingTpSlSubject.complete();
  }
}
