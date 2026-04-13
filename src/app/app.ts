import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

//Services
import { AuthService } from './core/services/auth.service';

// PrimeNG Modules
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ScrollPanelModule } from 'primeng/scrollpanel';

@Component({
  selector: 'app-root',
  imports: [RouterModule, ConfirmDialogModule, ToastModule, ScrollPanelModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.authService.checkAuth().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
}
