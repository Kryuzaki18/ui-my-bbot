import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';

// Environment
import { API_ROUTES, environment } from '../../../environments/environment';
import { UserService } from './user.service';

interface IAuth {
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userService = inject(UserService);
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
          this.userService.startUserDataStream();
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
          this.userService.startUserDataStream();
          this.session.set(true);
        }),
      );
  }

  signOut(): Observable<IAuth> {
    this.userService.stopUserDataStream();

    return this.http
      .post<IAuth>(`${environment.apiTradingBotUrl}${API_ROUTES.auth.signOut}`, {})
      .pipe(tap(() => this.clearSession()));
  }
}
