import { HttpClient } from '@angular/common/http';

// Environments
import { API_ROUTES } from '../../../environments/environment';

// Services
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { AppSettingsService } from './app-settings.service';

// Models
import { AIResponse } from '../models/ai.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AIService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly apiBaseUrl = this.appSettingsService.env().apiBaseUrl;

  private get isTestnet() {
    return this.appSettingsService.isTestnet();
  }

  chatBot(message: string): Observable<AIResponse> {
    return this.http.post<AIResponse>(`${this.apiBaseUrl}${API_ROUTES.ai.chat}`, { message });
  }

  analyzeMarket(symbol: string, interval: string): Observable<AIResponse> {
    const deepAnalyze = !this.authService.isLoggedIn() ? 0 : this.isTestnet ? 0 : 1;

    return this.http.post<AIResponse>(`${this.apiBaseUrl}${API_ROUTES.ai.analyzeMarket}`, {
      symbol: symbol.toLowerCase(),
      interval,
      deepAnalyze,
    });
  }
}
