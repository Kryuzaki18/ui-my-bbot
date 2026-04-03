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
import { StorageService } from '../services/storage.service';

// Constants
import { STORAGE } from '../constants/binance.constant';

export const AuthInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const storageService = inject(StorageService);
  const router = inject(Router);

  const token = storageService.getLocal(STORAGE.lToken);

  if (token) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
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
