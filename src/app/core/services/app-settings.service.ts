import { Injectable, OnDestroy } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class AppSettingsService implements OnDestroy {

  private isLoadingPositionsSubject = new BehaviorSubject<boolean>(false);
  readonly isLoadingPositions$ = this.isLoadingPositionsSubject.asObservable();

  private isLoadingOpenOrdersSubject = new BehaviorSubject<boolean>(false);
  readonly isLoadingOpenOrders$ = this.isLoadingOpenOrdersSubject.asObservable();

  private isLoadingPendingTpSlSubject = new BehaviorSubject<boolean>(false);
  readonly isLoadingPendingTpSl$ = this.isLoadingPendingTpSlSubject.asObservable();

  setIsLoadingPositions(value: boolean) {
    this.isLoadingPositionsSubject.next(value);
  }

  setIsLoadingOpenOrders(value: boolean) {
    this.isLoadingOpenOrdersSubject.next(value);
  }

  setIsLoadingPendingTpSl(value: boolean) {
    this.isLoadingPendingTpSlSubject.next(value);
  }

  ngOnDestroy(): void {
    this.isLoadingPositionsSubject.complete();
    this.isLoadingOpenOrdersSubject.complete();
    this.isLoadingPendingTpSlSubject.complete();
  }
} 