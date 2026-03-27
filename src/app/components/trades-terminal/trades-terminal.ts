import { Component, computed, inject, input, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';

// Services
import { BinanceService, BinanceWsPrice } from '../../core/services/binance.service';

// PrimeNG Modules
import { SliderModule } from 'primeng/slider';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-trades-terminal',
  imports: [
    ReactiveFormsModule,
    SliderModule,
    ButtonModule,
    FloatLabelModule,
    InputTextModule,
    IftaLabelModule,
    InputNumberModule
  ],
  templateUrl: './trades-terminal.html',
  styleUrl: './trades-terminal.scss',
})
export class TradesTerminal {
  formBuilder = inject(FormBuilder);
  binanceService = inject(BinanceService);

  readonly prices = input<Record<string, BinanceWsPrice[]>>({});

  tradesForm = this.formBuilder.group({
    trades: this.formBuilder.array<FormGroup>([]),
  });

  get tradesArray(): FormArray {
    return this.tradesForm.get('trades') as FormArray;
  }

  currentMarketPrice = computed(() => {
    return (symbol: string) => {
      const prices = this.prices();
      const symbolPrices = prices[symbol.toLowerCase()];

      return symbolPrices?.at(-1)?.price ?? 0;
    };
  });

  constructor() {
    effect(() => {
      const currentSymbols = Object.keys(this.prices());
      const arrayControls = this.tradesArray.controls as FormGroup[];

      currentSymbols.forEach((symbol) => {
        const exists = arrayControls.some((ctrl) => ctrl.value.symbol === symbol);
        if (!exists) {
          const group = this.formBuilder.group({
            symbol: [symbol],
            price: [null, Validators.required],
            amount: [null, [Validators.required]],
            leverage: [125, [Validators.required, Validators.min(1)]],
          });
          this.tradesArray.push(group);
        }
      });

      for (let i = this.tradesArray.length - 1; i >= 0; i--) {
        const symbolAtI = this.tradesArray.at(i).value.symbol;
        if (!currentSymbols.includes(symbolAtI)) {
          this.tradesArray.removeAt(i);
        }
      }
    });
  }

  buy(data: FormGroup): void {
    const { symbol, amount, price } = data.value;
    this.binanceService.placeOrder({
      symbol: symbol.toUpperCase(),
      side: 'BUY',
      type: price ? 'LIMIT' : 'MARKET',
      quantity: amount,
      price: price
    }).subscribe({
      next: (res) => console.log('Buy Success:', res),
      error: (err) => console.error('Buy Failed:', err)
    });
  }

  sell(data: FormGroup): void {
    const { symbol, amount, price } = data.value;
    this.binanceService.placeOrder({
      symbol: symbol.toUpperCase(),
      side: 'SELL',
      type: price ? 'LIMIT' : 'MARKET',
      quantity: amount,
      price: price
    }).subscribe({
      next: (res) => console.log('Sell Success:', res),
      error: (err) => console.error('Sell Failed:', err)
    });
  }

  startBot(index: number): void {
    const tradeData = this.tradesArray.at(index).value;
    console.log('Starting bot with trade:', tradeData);
  }
}
