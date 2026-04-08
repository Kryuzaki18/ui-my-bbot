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

// Environments
import { environment } from '../../../environments/environment';

// Services
import { AuthService } from '../services/auth.service';

const PUBLIC_URL_PATTERNS: (string | RegExp)[] = [
  `${environment.binancePublicWSBaseUrl}`,
  `${environment.binanceMarketWSBaseUrl}`,
  `${environment.binancePrivateWSBaseUrl}`,
  `${environment.binanceWSBaseUrl}`,
];

const COOKIE_URL_PATTERNS: (string | RegExp)[] = [
  `${environment.apiTradingBotUrl}`,
];

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

export const AuthInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);

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
