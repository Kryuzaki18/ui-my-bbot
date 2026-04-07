import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';

// Environment
import { API_ROUTES, environment } from '../../../environments/environment';

export interface AuthUser {
  username: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private _user = signal<AuthUser | null>(null);

  isLoggedIn = computed(() => !!this._user());

  get user() {
    return this._user.asReadonly();
  }

  clearUser(): void {
    this._user.set(null);
  }

  checkAuth(): Observable<AuthUser | null> {
    return this.http.get<AuthUser>(`${environment.apiTradingBotUrl}${API_ROUTES.auth.me}`).pipe(
      tap((user) => this._user.set(user)),
      catchError(() => {
        this._user.set(null);
        return of(null);
      }),
    );
  }

  signIn(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
  ): Observable<{ message: string; username: string }> {
    return this.http
      .post<{ message: string; username: string }>(
        `${environment.apiTradingBotUrl}${API_ROUTES.auth.signIn}`,
        { apiKey, apiSecret, useTestnet },
        { withCredentials: true }, // Cookie is set by the server in response
      )
      .pipe(tap((res) => this._user.set({ username: res.username })));
  }

  signInWithEmail(
    email: string,
    password: string,
    useTestnet: boolean,
  ): Observable<{ message: string; username: string }> {
    return this.http
      .post<{ message: string; username: string }>(
        `${environment.apiTradingBotUrl}${API_ROUTES.auth.signInWithEmail}`,
        { email, password, useTestnet },
        { withCredentials: true }, // Cookie is set by the server in response
      )
      .pipe(tap((res) => this._user.set({ username: res.username })));
  }

  signOut(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${environment.apiTradingBotUrl}${API_ROUTES.auth.signOut}`,
        {},
        { withCredentials: true }, // Server clears the cookie
      )
      .pipe(tap(() => this._user.set(null)));
  }
}
