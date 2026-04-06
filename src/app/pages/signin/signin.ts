import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';


// Services
import { AuthService } from '../../core/services/auth.service';

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
    DividerModule
  ],
  templateUrl: './signin.html',
  styleUrls: ['./signin.scss'],
})
export class SigninComponent implements OnInit {
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  
  binanceForm!: FormGroup;
  emailForm!: FormGroup;

  private dialogRef = inject(DynamicDialogRef);
  private destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/future']);
    }

     this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.minLength(10)]],
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

  onSubmit(): void {
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
          this.loading.set(false);
          this.router.navigate(['/future']);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.error || 'Could not verify API keys');
        },
      });
  }

   closeDialog(): void {
    this.dialogRef.close();
  }
}
