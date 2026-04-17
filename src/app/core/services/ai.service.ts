import { HttpClient } from '@angular/common/http';

// Environments
import { API_ROUTES } from '../../../environments/environment';

// Services
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { AppSettingsService } from './app-settings.service';

// Models
import { AIResponse } from '../models/ai.model';

@Injectable({
  providedIn: 'root',
})
export class AIService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly apiBaseUrl = this.appSettingsService.env().apiBaseUrl;

  chatBot(message: string) {
    const endpoint =
      this.authService.isLoggedIn()
        ? API_ROUTES.ai.chat
        : API_ROUTES.ai.chat;
    return this.http.post<AIResponse>(`${this.apiBaseUrl}${endpoint}`, { message });
  }

  analyzeMarket(symbol: string, timeframe: string) {
    const endpoint =
      this.authService.isLoggedIn()
        ? API_ROUTES.ai.analyzeMarket
        : API_ROUTES.ai.analyzeMarket;
    return this.http.post<AIResponse>(`${this.apiBaseUrl}${endpoint}`, { symbol, timeframe });
  }
}
