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
import { API_ROUTES, environment } from '../../../environments/environment';

// Services
import { AuthService } from '../services/auth.service';

const PUBLIC_URL_PATTERNS: (string | RegExp)[] = [
  `${environment.apiTradingBotUrl}${API_ROUTES.auth.signIn}`,
  `${environment.apiTradingBotUrl}${API_ROUTES.auth.signOut}`,
  `${environment.binancePublicWSBaseUrl}`,
  `${environment.binanceMarketWSBaseUrl}`,
  `${environment.binancePrivateWSBaseUrl}`
];

const isPublicUrl = (url: string): boolean => {
  return PUBLIC_URL_PATTERNS.some((pattern) =>
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

  if (authService.isLoggedIn()) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${authService.user()?.token}`,
        // withCredentials: request.url.startsWith(environment.apiTradingBotUrl),
      },
    });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        router.navigate(['/home']);
      }
      return throwError(() => error);
    }),
  );
};
