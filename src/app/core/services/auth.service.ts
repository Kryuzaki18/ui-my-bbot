import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';

// Environment
import { API_ROUTES, environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private _user = signal<any>(null);

  isLoggedIn = computed(() => !!this._user());

  get user() {
    return this._user.asReadonly();
  }

  checkAuth(): Observable<any> {
    return this.http.get<any>('/api/auth/me', { withCredentials: true }).pipe(
      tap((user) => this._user.set(user)),
      catchError(() => {
        this._user.set(null);
        return of(null);
      }),
    );
  }

  signInWithEmail(email: string, password: string, useTestnet: boolean) {
    return this.http
      .post<{ token: string }>(`${environment.apiTradingBotUrl}${API_ROUTES.auth.signIn}`, {
        email,
        password,
        useTestnet,
      })
      .pipe(tap((user) => this._user.set(user)));
  }

  signIn(apiKey: string, apiSecret: string, useTestnet: boolean): Observable<{ token: string }> {
    return this.http
      .post<{ token: string }>(`${environment.apiTradingBotUrl}${API_ROUTES.auth.signIn}`, {
        apiKey,
        apiSecret,
        useTestnet,
      })
      .pipe(tap((user) => this._user.set(user)));
  }

  signOut(): Observable<void> {
    return this.http
      .post<void>(`${environment.apiTradingBotUrl}${API_ROUTES.auth.signOut}`, {})
      .pipe(tap(() => this._user.set(null)));
  }
}
