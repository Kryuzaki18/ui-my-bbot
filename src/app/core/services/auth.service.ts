import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, shareReplay, tap, throwError } from 'rxjs';

import { API_ROUTES } from '../../../environments/environment';

// Services
import { UserWsService } from './user-ws.service';
import { AppSettingsService } from './app-settings.service';

interface IAuth {
  message: string;
}

interface ISwitchModeResponse extends IAuth {
  useTestnet: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userWsService = inject(UserWsService);
  private readonly appSettingsService = inject(AppSettingsService);

  private get apiBaseUrl() {
    return this.appSettingsService.env().apiBaseUrl;
  }

  private readonly session = signal<boolean>(false);
  private checkAuth$?: Observable<boolean>;
  private hasChecked = false;

  isLoggedIn = computed(() => !!this.session());

  clearSession(): void {
    this.session.set(false);
    this.hasChecked = false;
  }

  checkAuth(): Observable<boolean> {
    if (this.session()) return of(true);

    if (this.hasChecked) {
      return of(this.session());
    }

    if (this.checkAuth$) return this.checkAuth$;

    this.checkAuth$ = this.http
      .get<boolean>(`${this.apiBaseUrl}${API_ROUTES.auth.me}`)
      .pipe(
        tap((isAuth: boolean) => {
          this.session.set(isAuth);
          this.hasChecked = true;
          this.checkAuth$ = undefined;
        }),
        catchError(() => {
          this.session.set(false);
          this.hasChecked = true;
          this.checkAuth$ = undefined;
          return of(false);
        }),
        shareReplay(1),
      );

    return this.checkAuth$;
  }

  signIn(apiKey: string, apiSecret: string, useTestnet: boolean): Observable<IAuth> {
    return this.http
      .post<IAuth>(`${this.apiBaseUrl}${API_ROUTES.auth.signIn}`, {
        apiKey,
        apiSecret,
        useTestnet,
      })
      .pipe(
        tap(() => {
          this.session.set(true);
          this.appSettingsService.setTestnet(useTestnet);
        }),
      );
  }

  signInWithEmail(email: string, password: string, useTestnet: boolean): Observable<IAuth> {
    return this.http
      .post<IAuth>(`${this.apiBaseUrl}${API_ROUTES.auth.signInWithEmail}`, {
        email,
        password,
        useTestnet,
      })
      .pipe(
        tap(() => {
          this.session.set(true);
          this.appSettingsService.setTestnet(useTestnet);
        }),
      );
  }

  switchModeSilently(nextUseTestnet: boolean): Observable<IAuth> {
    return this.http
      .post<ISwitchModeResponse>(`${this.apiBaseUrl}${API_ROUTES.auth.switchMode}`, {
        useTestnet: nextUseTestnet,
      })
      .pipe(
        tap((res) => {
          this.session.set(true);
          this.appSettingsService.setTestnet(res.useTestnet);
        }),
      );
  }

  signOut(): Observable<IAuth> {
    this.userWsService.stopUserDataStream();

    return this.http
      .post<IAuth>(`${this.apiBaseUrl}${API_ROUTES.auth.signOut}`, {})
      .pipe(
        tap(() => {
          this.appSettingsService.setTestnet(false);
          this.clearSession();
        }),
        catchError((err) => {
          this.clearSession();
          return throwError(() => err);
        }),
      );
  }
}
