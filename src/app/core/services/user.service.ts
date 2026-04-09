import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Environments
import { API_ROUTES, environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);

  getLeverageBracket(): Observable<any> {
    return this.http.post(`${environment.apiTradingBotUrl}${API_ROUTES.futures.leverageBracket}`, {});
  }

  getUserInfo(): Observable<any> {
    return this.http.get(`${environment.apiTradingBotUrl}${API_ROUTES.user.userInfo}`);
  }
}
