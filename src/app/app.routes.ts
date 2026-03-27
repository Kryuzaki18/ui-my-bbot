import { Routes } from '@angular/router';
import { SigninComponent } from './pages/signin/signin';
import { Dashboard } from './pages/dashboard/dashboard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'binance/signin', component: SigninComponent },
  { path: 'binance/future/order', component: Dashboard, canActivate: [authGuard] },
  // Redirects
  { path: '', redirectTo: 'binance/future/order', pathMatch: 'full' },
  { path: '**', redirectTo: 'binance/signin' }
];
