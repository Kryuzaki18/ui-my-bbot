import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

// Environment
import { API_ROUTES, environment } from '../../../environments/environment';

// Services
import { StorageService } from './storage.service';

// Constants
import { STORAGE } from '../constants/binance.constant';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private storageService = inject(StorageService);

  signIn(apiKey: string, apiSecret: string, useTestnet: boolean): Observable<{ token: string }> {
    return this.http
      .post<{ token: string }>(`${environment.apiTradingBotUrl}${API_ROUTES.auth.signIn}`, {
        apiKey,
        apiSecret,
        useTestnet,
      })
      .pipe(
        map((res) => {
          this.storageService.setLocal(STORAGE.lToken, res.token);
          return res;
        }),
      );
  }

  signOut(): Observable<void> {
    return this.http.post<void>(`${environment.apiTradingBotUrl}${API_ROUTES.auth.signOut}`, {});
  }
}
