import { Injectable, OnDestroy } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class AppSettingsService implements OnDestroy {
  private isCurrentPositionLoadingSubject = new BehaviorSubject<boolean>(true);
  readonly isCurrentPositionLoading$ = this.isCurrentPositionLoadingSubject.asObservable();

  private isLoadingOpenOrdersSubject = new BehaviorSubject<boolean>(true);
  readonly isLoadingOpenOrders$ = this.isLoadingOpenOrdersSubject.asObservable();

  setIsCurrentPositionLoading(value: boolean) {
    this.isCurrentPositionLoadingSubject.next(value);
  }

  setIsLoadingOpenOrders(value: boolean) {
    this.isLoadingOpenOrdersSubject.next(value);
  }

  ngOnDestroy(): void {
    this.isCurrentPositionLoadingSubject.complete();
    this.isLoadingOpenOrdersSubject.complete();
  }
} 