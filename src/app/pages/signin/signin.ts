import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services
import { StorageService } from '../../core/services/storage.service';
import { AuthService } from '../../core/services/auth.service';

// Constants
import { STORAGE } from '../../core/constants/binance.constant';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    CardModule,
    CheckboxModule,
    SelectModule,
  ],
  templateUrl: './signin.html',
  styleUrls: ['./signin.scss'],
})
export class SigninComponent implements OnInit {
  loginForm!: FormGroup;
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  
  private destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private storageService: StorageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (this.storageService.getLocal(STORAGE.lToken)) {
      this.router.navigate(['/future']);
    }

    this.loginForm = this.fb.group({
      apiKey: ['', [Validators.required, Validators.minLength(10)]],
      apiSecret: ['', [Validators.required, Validators.minLength(10)]],
      useTestnet: [true],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const { apiKey, apiSecret, useTestnet } = this.loginForm.value;

    this.authService
      .signIn(apiKey, apiSecret, useTestnet)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.storageService.setLocal(STORAGE.lToken, res.token);
          this.loading.set(false);
          this.router.navigate(['/binance/future/order']);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.error || 'Could not verify API keys');
        },
      });
  }
}
