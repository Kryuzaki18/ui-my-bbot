import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  public getLocal(key: string): string | null {
    return localStorage.getItem(key);
  }

  public setLocal(key: string, val: string): void {
    localStorage.setItem(key, val);
  }

  public removeLocal(key: string): void {
    localStorage.removeItem(key);
  }

  public clearLocal(): void {
    localStorage.clear();
  }

  public getSession(key: string): string | null {
    return sessionStorage.getItem(key);
  }

  public setSession(key: string, val: string): void {
    sessionStorage.setItem(key, val);
  }

  public removeSession(key: string): void {
    sessionStorage.removeItem(key);
  }
  
  public clearSession(): void {
    sessionStorage.clear();
  }
}