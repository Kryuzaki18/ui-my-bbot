import { Component, DestroyRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Components
import { SigninComponent } from '../../pages/signin/signin';

//PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { DialogService, DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-header',
  imports: [ButtonModule, DynamicDialogModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  standalone: true,
})
export class Header {
  readonly authService = inject(AuthService);

  private router = inject(Router);
  private userService = inject(UserService);
  private dialogService = inject(DialogService);
  private destroyRef = inject(DestroyRef);
  private dialogRef: DynamicDialogRef | null = null;

  signout(): void {
    if (this.authService.isLoggedIn()) {
      this.authService
        .signOut()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.userService.stopUserDataStream();
            this.router.navigate(['/home']);
          },
          error: (err) => {
            console.error(err);
          },
        });
    }
  }

  signin(): void {
    this.dialogRef = this.dialogService.open(SigninComponent, {
      showHeader: false,
      closable: true,
      modal: true,
      contentStyle: { 'padding-bottom': '0' }
    });

    this.dialogRef?.onClose.subscribe((payload) => {
    });
  }
}
