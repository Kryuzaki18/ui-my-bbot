import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptors';

import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload',
      }),
    ),
    provideHttpClient(withFetch(), withInterceptors([AuthInterceptor])),
    providePrimeNG({
      theme: {
        preset: Aura,
      },
    }),
    DialogService,
    MessageService,
    ConfirmationService,
  ],
};
