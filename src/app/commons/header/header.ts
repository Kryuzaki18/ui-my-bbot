import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Components
import { SigninComponent } from '../../pages/signin/signin';

// Services
import { UserService } from '../../core/services/user.service';

//PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/services/auth.service';
import { DialogService, DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-header',
  imports: [ButtonModule, DynamicDialogModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  standalone: true,
})
export class Header implements OnInit {
  readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly dialogService = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  private dialogRef: DynamicDialogRef | null = null;

  ngOnInit(): void {
    this.authService
      .checkAuth()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // console.info('Signin.');
        },
        error: (err) => {
          console.error(err);
        },
      });
  }

  signout(): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    this.authService
      .signOut()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigate(['/home']);
        },
        error: (err) => {
          console.error('[Header] Signout Error:', err);
          this.router.navigate(['/home']);
        },
      });
  }

  signin(): void {
    if (this.authService.isLoggedIn()) {
      return;
    }

    this.dialogRef = this.dialogService.open(SigninComponent, {
      showHeader: false,
      closable: true,
      modal: true,
      contentStyle: { 'padding-bottom': '0' },
    });

    this.dialogRef?.onClose.subscribe((payload) => {});
  }
}
