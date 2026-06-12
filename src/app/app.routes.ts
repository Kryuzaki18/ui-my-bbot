import { Routes } from '@angular/router';

// Auth
import { authGuard } from './core/guards/auth.guard';

// Components
import { HomeComponent } from './pages/home/home.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { TermsComponent } from './pages/legal/terms/terms.component';
import { PrivacyComponent } from './pages/legal/privacy/privacy.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'future', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'terms', component: TermsComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];
