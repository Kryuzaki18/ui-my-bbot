import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// Services
import { BinanceService } from '../../core/services/binance.service';

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
  loading: boolean = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private binanceService: BinanceService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (this.binanceService.token) {
      this.router.navigate(['/binance/future/order']);
    }

    this.loginForm = this.fb.group({
      apiKey: ['', [Validators.required, Validators.minLength(10)]],
      apiSecret: ['', [Validators.required, Validators.minLength(10)]],
      useTestnet: [true],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = null;

    const { apiKey, apiSecret, useTestnet } = this.loginForm.value;

    this.binanceService.signIn(apiKey, apiSecret, useTestnet).subscribe({
      next: (res) => {
        this.binanceService.token = res.token;
        this.loading = false;
        this.router.navigate(['/binance/future/order']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Could not verify API keys';
      },
    });
  }
}
