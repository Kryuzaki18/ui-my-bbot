import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

// Models
import { UserInfo } from '../models/user-info.model';

// Environments
import { API_ROUTES } from '../../../environments/environment';

// Services
import { AppSettingsService } from './app-settings.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly appSettingsService = inject(AppSettingsService);
  
  private readonly totalLivePnl = new BehaviorSubject<number>(0);
  readonly totalLivePnl$ = this.totalLivePnl.asObservable();

  setTotalLivePnl(data: number): void {
    this.totalLivePnl.next(data);
  }

  private get apiBaseUrl(): string {
    return this.appSettingsService.env().apiBaseUrl;
  }

  getLeverageBracket(): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${API_ROUTES.futures.leverageBracket}`, {});
  }

  getCommissionRate(symbols: string[]): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${API_ROUTES.futures.commissionRate}`, { symbols });
  }

  getUserInfo(): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}${API_ROUTES.user.userInfo}`);
  }
}
