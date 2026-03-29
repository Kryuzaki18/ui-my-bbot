import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BinanceService } from '../../core/services/binance.service';

import { ButtonModule } from 'primeng/button';
@Component({
  selector: 'app-header',
  imports: [ButtonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private router = inject(Router);
  private binanceService = inject(BinanceService);

  logout(): void {
    if (this.binanceService.token) {
      this.binanceService.signOut().subscribe({
        next: () => {
          this.binanceService.token = null;
          this.router.navigate(['/binance/signin']);
        },
        error: (err) => {
          console.error(err);
        },
      });
    }
  }
}
