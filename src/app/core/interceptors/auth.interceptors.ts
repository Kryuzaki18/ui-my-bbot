import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

// Services
import { AuthService } from '../services/auth.service';
import { AppSettingsService } from '../services/app-settings.service';

export const AuthInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const appSettingsService = inject(AppSettingsService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const binancePublicWSBaseUrl = appSettingsService.env().binancePublicWSBaseUrl;
  const binanceMarketWSBaseUrl = appSettingsService.env().binanceMarketWSBaseUrl;
  const binancePrivateWSBaseUrl = appSettingsService.env().binancePrivateWSBaseUrl;
  const binanceWSBaseUrl = appSettingsService.env().binanceWSBaseUrl;
  const apiBaseUrl = appSettingsService.env().apiBaseUrl;

  const PUBLIC_URL_PATTERNS: (string | RegExp)[] = [
    `${binancePublicWSBaseUrl}`,
    `${binanceMarketWSBaseUrl}`,
    `${binancePrivateWSBaseUrl}`,
    `${binanceWSBaseUrl}`,
  ];

  const COOKIE_URL_PATTERNS: (string | RegExp)[] = [`${apiBaseUrl}`];

  const isPublicUrl = (url: string): boolean => {
    return PUBLIC_URL_PATTERNS.some((pattern) =>
      pattern instanceof RegExp ? pattern.test(url) : url.startsWith(pattern),
    );
  };

  const isCookieRequest = (url: string): boolean => {
    return COOKIE_URL_PATTERNS.some((pattern) =>
      pattern instanceof RegExp ? pattern.test(url) : url.startsWith(pattern),
    );
  };

  if (isPublicUrl(request.url)) {
    return next(request);
  }

  if (isCookieRequest(request.url)) {
    request = request.clone({ withCredentials: true });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isCookieRequest(request.url)) {
        authService.clearSession();
        router.navigate(['/home']);
      }
      return throwError(() => error);
    }),
  );
};
