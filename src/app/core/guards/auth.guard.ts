import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

// Services
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (authService.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
