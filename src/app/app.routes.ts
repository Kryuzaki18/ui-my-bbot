import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { authGuard } from './core/guards/auth.guard';
import { HomeComponent } from './pages/home/home';

export const routes: Routes = [
  { path: 'home', component: HomeComponent},
  { path: 'future', component: DashboardComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];
