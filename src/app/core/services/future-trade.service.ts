import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Environment
import { API_ROUTES, environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FutureTradeService {
  constructor(private http: HttpClient) {}

  placeOrder(body: any): Observable<any> {
    return this.http.post(`${environment.apiTradingBotUrl}${API_ROUTES.futures.order}`, body);
  }

  takeProfit(body: any): Observable<any> {
    return this.http.post(`${environment.apiTradingBotUrl}${API_ROUTES.futures.takeProfit}`, body);
  }

  stopLoss(body: any): Observable<any> {
    return this.http.post(`${environment.apiTradingBotUrl}${API_ROUTES.futures.stopLoss}`, body);
  }

  cancelOrder(symbol: string, orderId: number): Observable<any> {
    return this.http.post(`${environment.apiTradingBotUrl}${API_ROUTES.futures.cancel}`, {
      symbol,
      orderId,
    });
  }

  getOpenOrders(symbol?: string): Observable<any[]> {
    let url = `${environment.apiTradingBotUrl}${API_ROUTES.futures.openOrders}`;
    if (symbol) url += `?symbol=${symbol}`;
    return this.http.get<any[]>(url);
  }
}
