import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap, throwError } from 'rxjs';

// Environment
import { API_ROUTES, environment } from '../../../environments/environment';
import { UserWsService } from './user-ws.service';

interface IAuth {
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userWsService = inject(UserWsService);
  private readonly session = signal<boolean>(false);

  isLoggedIn = computed(() => !!this.session());

  clearSession(): void {
    this.session.set(false);
  }

  checkAuth(): Observable<boolean> {
    return this.http.get<boolean>(`${environment.apiTradingBotUrl}${API_ROUTES.auth.me}`).pipe(
      tap((isAuth: boolean) => this.session.set(isAuth)),
      catchError(() => {
        this.session.set(false);
        return of(false);
      }),
    );
  }

  signIn(apiKey: string, apiSecret: string, useTestnet: boolean): Observable<IAuth> {
    return this.http
      .post<IAuth>(`${environment.apiTradingBotUrl}${API_ROUTES.auth.signIn}`, {
        apiKey,
        apiSecret,
        useTestnet,
      })
      .pipe(
        tap((res) => {
          this.userWsService.startUserDataStream();
          this.session.set(true);
        }),
      );
  }

  signInWithEmail(email: string, password: string, useTestnet: boolean): Observable<IAuth> {
    return this.http
      .post<IAuth>(`${environment.apiTradingBotUrl}${API_ROUTES.auth.signInWithEmail}`, {
        email,
        password,
        useTestnet,
      })
      .pipe(
        tap((res) => {
          this.userWsService.startUserDataStream();
          this.session.set(true);
        }),
      );
  }

  signOut(): Observable<IAuth> {
    this.userWsService.stopUserDataStream();

    return this.http
      .post<IAuth>(`${environment.apiTradingBotUrl}${API_ROUTES.auth.signOut}`, {})
      .pipe(
        tap(() => this.clearSession()),
        catchError((err) => {
          this.clearSession();
          return throwError(() => err);
        })
      );
  }
}
