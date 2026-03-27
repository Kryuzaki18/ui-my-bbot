import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { BinanceService } from '../services/binance.service';

export const authGuard: CanActivateFn = () => {
  const binanceService = inject(BinanceService);
  const router = inject(Router);

  if (binanceService.token) {
    return true;
  }

  return router.createUrlTree(['/binance/signin']);
};
