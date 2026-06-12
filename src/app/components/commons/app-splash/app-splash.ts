import { Component, inject, OnDestroy } from '@angular/core';
import { SplashService } from '../../../core/services/splash.service';

@Component({
  selector: 'app-app-splash',
  imports: [],
  templateUrl: './app-splash.html',
  styleUrl: './app-splash.scss',
})
export class AppSplash implements OnDestroy {
  protected readonly splashService = inject(SplashService);

  protected readonly statusMessages = [
    'Initializing system...',
    'Connecting to market...',
    'Loading configuration...',
    'Authenticating session...',
    'Fetching market data...',
  ];

  protected currentMessageIndex = 0;
  protected statusMessage = this.statusMessages[0];

  protected readonly candleBars = [
    { height: 35, delay: '0ms', bullish: true },
    { height: 65, delay: '180ms', bullish: false },
    { height: 45, delay: '360ms', bullish: true },
    { height: 80, delay: '540ms', bullish: true },
    { height: 30, delay: '720ms', bullish: false },
    { height: 55, delay: '900ms', bullish: true },
    { height: 70, delay: '1080ms', bullish: false },
    { height: 40, delay: '1260ms', bullish: true },
    { height: 90, delay: '1440ms', bullish: true },
    { height: 50, delay: '1620ms', bullish: false },
    { height: 25, delay: '1800ms', bullish: true },
    { height: 60, delay: '1980ms', bullish: false },
  ];

  private readonly intervalId = setInterval(() => this.cycleMessage(), 1900);

  private cycleMessage(): void {
    if (this.splashService.phase() !== 'loading') {
      clearInterval(this.intervalId);
      return;
    }
    this.currentMessageIndex = (this.currentMessageIndex + 1) % this.statusMessages.length;
    this.statusMessage = this.statusMessages[this.currentMessageIndex];
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }
}
