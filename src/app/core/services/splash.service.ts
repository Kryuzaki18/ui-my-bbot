import { computed, Injectable, signal } from '@angular/core';

export type SplashPhase = 'loading' | 'done';

@Injectable({ providedIn: 'root' })
export class SplashService {
  private readonly _phase = signal<SplashPhase>('loading');

  readonly phase = this._phase.asReadonly();
  readonly isRendered = computed(() => this._phase() !== 'done');

  complete(): void {
    setTimeout(() => this._phase.set('done'), 2500);
  }
}
