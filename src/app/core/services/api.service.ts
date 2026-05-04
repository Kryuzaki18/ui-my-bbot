import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

type QueryParams = Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

interface HttpOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  params?: QueryParams;
  withCredentials?: boolean;
  responseType?: 'json';
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);

  private buildParams(params: QueryParams): HttpParams {
    return Object.entries(params).reduce(
      (httpParams, [key, value]) =>
        value !== null && value !== undefined
          ? httpParams.set(key, String(value))
          : httpParams,
      new HttpParams()
    );
  }

  get<T>(url: string, options?: HttpOptions): Observable<T> {
    return this.http.get<T>(url, {
      ...options,
      params: options?.params ? this.buildParams(options.params) : undefined,
    });
  }

  post<T, B = unknown>(url: string, body?: B, options?: HttpOptions): Observable<T> {
    return this.http.post<T>(url, body ?? {}, {
      ...options,
      params: options?.params ? this.buildParams(options.params) : undefined,
    });
  }

  put<T, B = unknown>(url: string, body?: B, options?: HttpOptions): Observable<T> {
    return this.http.put<T>(url, body ?? {}, {
      ...options,
      params: options?.params ? this.buildParams(options.params) : undefined,
    });
  }

  patch<T, B = unknown>(url: string, body?: B, options?: HttpOptions): Observable<T> {
    return this.http.patch<T>(url, body ?? {}, {
      ...options,
      params: options?.params ? this.buildParams(options.params) : undefined,
    });
  }

  delete<T>(url: string, options?: HttpOptions): Observable<T> {
    return this.http.delete<T>(url, {
      ...options,
      params: options?.params ? this.buildParams(options.params) : undefined,
    });
  }
}