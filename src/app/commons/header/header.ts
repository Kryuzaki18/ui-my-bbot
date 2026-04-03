import { Component, DestroyRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Constants
import { STORAGE } from '../../core/constants/binance.constant';

// Services
import { StorageService } from '../../core/services/storage.service';

//PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [ButtonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private router = inject(Router);
  private authService = inject(AuthService);
  private storageService = inject(StorageService);
  private destroyRef = inject(DestroyRef);

  signout(): void {
    if (this.storageService.getLocal(STORAGE.lToken)) {
      this.authService
      .signOut()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.storageService.removeLocal(STORAGE.lToken);
          this.router.navigate(['/signin']);
        },
        error: (err) => {
          console.error(err);
        },
      });
    }
  }
}
