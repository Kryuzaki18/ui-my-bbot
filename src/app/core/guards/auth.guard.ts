import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

// Constants
import { STORAGE } from '../constants/binance.constant';

// Services
import { StorageService } from '../services/storage.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const storageService = inject(StorageService);

  if (storageService.getLocal(STORAGE.lToken)) {
    return true;
  }

  return router.createUrlTree(['/signin']);
};
