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
import { StorageService } from '../services/storage.service';

// Constants
import { STORAGE } from '../constants/binance.constant';

const PUBLIC_URL_PATTERNS: (string | RegExp)[] = [
  `${environment.apiTradingBotUrl}${API_ROUTES.auth.signIn}`,
  `${environment.apiTradingBotUrl}${API_ROUTES.auth.signOut}`,
  `${environment.binanceFutureWebSocketBaseUrl}`,
  // /^https:\/\/fapi\.binance\.com/,
  // /^https:\/\/testnet\.binancefuture\.com/,
  /^wss?:\/\//,
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
  const storageService = inject(StorageService);
  const router = inject(Router);

  if (isPublicUrl(request.url)) {
    return next(request);
  }

  const token = storageService.getLocal(STORAGE.lToken);

  if (token) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        // withCredentials: request.url.startsWith(environment.apiTradingBotUrl),
      },
    });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        storageService.clearLocal();
        router.navigate(['/signin']);
      }
      return throwError(() => error);
    }),
  );
};
