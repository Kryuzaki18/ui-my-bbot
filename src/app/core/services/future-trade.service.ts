import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Environment
import { API_ROUTES } from '../../../environments/environment';

// Services
import { AppSettingsService } from './app-settings.service';

@Injectable({
  providedIn: 'root',
})
export class FutureTradeService {
  private http = inject(HttpClient);
  private readonly appSettingsService = inject(AppSettingsService);

  private get apiBaseUrl(): string {
    return this.appSettingsService.env().apiBaseUrl;
  }

  getPendingTpSl(symbol?: string): Observable<any[]> {
    let url = `${this.apiBaseUrl}${API_ROUTES.futures.pendingTpSl}`;
    if (symbol) url += `?symbol=${symbol}`;
    return this.http.get<any[]>(url);
  }

  getOpenOrders(symbol?: string): Observable<any[]> {
    let url = `${this.apiBaseUrl}${API_ROUTES.futures.openOrders}`;
    if (symbol) url += `?symbol=${symbol}`;
    return this.http.get<any[]>(url);
  }

  getFuturesPositions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBaseUrl}${API_ROUTES.futures.positions}`);
  }

  placeOrder(body: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${API_ROUTES.futures.order}`, body);
  }

  takeProfit(body: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${API_ROUTES.futures.takeProfit}`, body);
  }

  stopLoss(body: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${API_ROUTES.futures.stopLoss}`, body);
  }

  closePosition(body: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${API_ROUTES.futures.closePosition}`, body);
  }

  cancelTpSl(body: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${API_ROUTES.futures.cancelTpSl}`, body);
  }

  cancelOrder(symbol: string, orderId: number, clientOrderId?: string): Observable<any> {
    const payload = { symbol, orderId, clientOrderId };
    return this.http.post(`${this.apiBaseUrl}${API_ROUTES.futures.cancel}`, payload);
  }
}
