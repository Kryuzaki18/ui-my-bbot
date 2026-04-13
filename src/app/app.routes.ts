import { Routes } from '@angular/router';

// Auth
import { authGuard } from './core/guards/auth.guard';

// Components
import { HomeComponent } from './pages/home/home.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent},
  { path: 'future', component: DashboardComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];
