import { computed, Injectable, signal } from '@angular/core';

export type SplashPhase = 'loading' | 'success' | 'exiting' | 'done';

@Injectable({ providedIn: 'root' })
export class SplashService {
  private readonly _phase = signal<SplashPhase>('loading');

  readonly phase = this._phase.asReadonly();
  readonly isRendered = computed(() => this._phase() !== 'done');

  complete(isAuthenticated: boolean): void {
    if (isAuthenticated) {
      this._phase.set('success');
    } 
    setTimeout(() => this.startExit(), 1500);
  }

  private startExit(): void {
    this._phase.set('exiting');
    setTimeout(() => this._phase.set('done'), 700);
  }
}
