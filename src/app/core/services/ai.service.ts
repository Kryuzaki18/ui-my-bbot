import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Environments
import { API_ROUTES } from '../../../environments/environment';

// Services
import { inject, Injectable } from '@angular/core';
import { AppSettingsService } from './app-settings.service';

// Models
import { AIResponse, ConversationMessage } from '../models/ai.model';
import { TradeBotPayload, TradeBotResponse } from '../models/trades.model';

@Injectable({
  providedIn: 'root',
})
export class AIService {
  private readonly http = inject(HttpClient);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly apiBaseUrl = this.appSettingsService.env().apiBaseUrl;

  chatBot(message: string, history: ConversationMessage[]): Observable<AIResponse> {
    return this.http.post<AIResponse>(`${this.apiBaseUrl}${API_ROUTES.ai.chat}`, { message, history });
  }

  analyzeMarket(symbol: string, interval: string): Observable<AIResponse> {
    return this.http.post<AIResponse>(`${this.apiBaseUrl}${API_ROUTES.ai.analyzeMarket}`, {
      symbol: symbol.toLowerCase(),
      interval,
    });
  }

  activateBot(body: TradeBotPayload): Observable<TradeBotResponse> {
    return this.http.post<TradeBotResponse>(`${this.apiBaseUrl}${API_ROUTES.ai.tradeBot}`, body);
  }
}
