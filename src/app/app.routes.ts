import { Routes } from '@angular/router';
import { SigninComponent } from './pages/signin/signin';
import { Dashboard } from './pages/dashboard/dashboard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'signin', component: SigninComponent },
  { path: 'future', component: Dashboard, canActivate: [authGuard] },
  // Redirects
  { path: '', redirectTo: 'future', pathMatch: 'full' },
  { path: '**', redirectTo: 'signin' }
];
