import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Services
import { AuthService } from '../../core/services/auth.service';

// Constants
import { EMAIL_PATTERN } from '../../core/constants/regex.constant';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { FloatLabelModule } from 'primeng/floatlabel';
import { DividerModule } from 'primeng/divider';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { PasswordModule } from 'primeng/password';

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
    TabsModule,
    FloatLabelModule,
    DividerModule,
    PasswordModule,
  ],
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.scss',
})
export class SigninComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  binanceForm!: FormGroup;
  emailForm!: FormGroup;

  private dialogRef = inject(DynamicDialogRef);

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/future']);
    }

    this.emailForm = this.fb.group({
      email: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(100),
          Validators.email,
          Validators.pattern(EMAIL_PATTERN),
        ],
      ],
      password: ['', [Validators.required, Validators.minLength(7)]],
      rememberMe: [false],
      useTestnet: [true],
    });

    this.binanceForm = this.fb.group({
      apiKey: ['', [Validators.required, Validators.minLength(10)]],
      apiSecret: ['', [Validators.required, Validators.minLength(10)]],
      useTestnet: [true],
    });
  }

  signInBinanceKey(): void {
    if (this.binanceForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const { apiKey, apiSecret, useTestnet } = this.binanceForm.value;

    this.authService
      .signIn(apiKey, apiSecret, useTestnet)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.dialogRef.close();
          this.router.navigate(['/future']);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.error);
        },
      });
  }

  signInWithEmail(): void {
    if (this.emailForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password, useTestnet } = this.emailForm.value;

    this.authService
      .signInWithEmail(email, password, useTestnet)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.dialogRef.close();
          this.router.navigate(['/future']);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.error);
        },
      });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
