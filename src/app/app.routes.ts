import { Routes } from '@angular/router';
import { SigninComponent } from './pages/signin/signin';
import { Dashboard } from './pages/dashboard/dashboard';
import { authGuard } from './core/guards/auth.guard';
import { Home } from './pages/home/home';

export const routes: Routes = [
  { path: 'home', component: Home},
  { path: 'signin', component: SigninComponent },
  { path: 'future', component: Dashboard, canActivate: [authGuard] },
  // Redirects
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];
