import { Injectable, OnDestroy } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class AppSettingsService implements OnDestroy {
  private isLoadingOpenOrdersSubject = new BehaviorSubject<boolean>(false);
  readonly isLoadingOpenOrders$ = this.isLoadingOpenOrdersSubject.asObservable();

  private isLoadingPositionsSubject = new BehaviorSubject<boolean>(false);
  readonly isLoadingPositions$ = this.isLoadingPositionsSubject.asObservable();

  setIsLoadingOpenOrders(value: boolean) {
    this.isLoadingOpenOrdersSubject.next(value);
  }

  setIsLoadingPositions(value: boolean) {
    this.isLoadingPositionsSubject.next(value);
  }

  ngOnDestroy(): void {
    this.isLoadingOpenOrdersSubject.complete();
    this.isLoadingPositionsSubject.complete();
  }
} 