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
  `${environment.binancePublicWSBaseUrl}`,
  `${environment.binanceMarketWSBaseUrl}`,
  `${environment.binancePrivateWSBaseUrl}`,
  `${environment.binanceWSBaseUrl}`,
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

  const isApiRequest = request.url.startsWith(environment.apiTradingBotUrl);

  if (isApiRequest) {
    request = request.clone({ withCredentials: true });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isApiRequest) {
        authService.clearUser();
        router.navigate(['/home']);
      }
      return throwError(() => error);
    }),
  );
};
