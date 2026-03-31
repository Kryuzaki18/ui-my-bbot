import { Component, computed, inject, input, OnInit, signal, DestroyRef } from '@angular/core';
import { NgClass, DecimalPipe, CurrencyPipe } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  FormsModule,
  Validators,
  FormArray,
  FormGroup,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services
import { BinanceService, BinanceWsPrice } from '../../core/services/binance.service';

// Models
import { FuturePosition, OpenOrder } from '../../core/models/trades.model';

// PrimeNG Modules
import { SliderModule } from 'primeng/slider';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';

@Component({
  selector: 'app-trades-terminal',
  imports: [
    NgClass,
    DecimalPipe,
    CurrencyPipe,
    ReactiveFormsModule,
    FormsModule,
    SliderModule,
    ButtonModule,
    FloatLabelModule,
    InputTextModule,
    IftaLabelModule,
    InputNumberModule,
    DialogModule,
    CheckboxModule,
    RadioButtonModule,
  ],
  templateUrl: './trades-terminal.html',
  styleUrl: './trades-terminal.scss',
})
export class TradesTerminal implements OnInit {
  formBuilder = inject(FormBuilder);
  binanceService = inject(BinanceService);

  readonly defaultAmount = 5;
  readonly defaultLeverage = 125;
  readonly defaultStopLoss = null;
  readonly defaultTakeProfit = null;
  readonly prices = input<Record<string, BinanceWsPrice[]>>({});

  isRiskDialogOpen = false;
  riskDialogType: 'STOP_LOSS' | 'TAKE_PROFIT' = 'STOP_LOSS';
  riskDialogSymbol = '';
  riskDialogPrice: number | null = null;
  riskDialogSide: 'BUY' | 'SELL' = 'BUY';
  riskDialogPercent: number = 50;
  riskDialogEntryPrice: number = 0;
  riskDialogPositionAmt: number = 0;
  riskDialogLeverage: number = 1;
  riskDialogEstimatedPnL: number = 0;
  riskDialogEstimatedPnLStr: string = '$0.00';

  futureSymbols = input<string[]>([]);
  futurePos = signal<FuturePosition[]>([]);
  openOrders = signal<OpenOrder[]>([]);

  tradesForm = this.formBuilder.group({
    trades: this.formBuilder.array<FormGroup>([]),
  });

  get tradesFormArray(): FormArray<FormGroup> {
    return this.tradesForm.get('trades') as FormArray<FormGroup>;
  }

  currentMarketPrice = computed(() => {
    return (symbol: string) => {
      const prices = this.prices();
      const symbolPrices = prices[symbol.toLowerCase()];

      return symbolPrices?.at(-1)?.price ?? 0;
    };
  });

  formatPnl = computed(() => {
    return (
      symbol: string,
      entryPrice: string | number,
      positionAmt: string | number,
      leverage: string | number,
    ) => {
      const currentPrice = this.currentMarketPrice()(symbol);
      const ep = parseFloat(entryPrice as string);
      const amt = parseFloat(positionAmt as string);
      const lev = parseFloat(leverage as string);

      const pnl = (currentPrice - ep) * amt;
      const notional = Math.abs(amt) * ep;
      const margin = notional / lev;
      const pct = margin > 0 ? (pnl / margin) * 100 : 0;

      const pnlPercentStr = (pct > 0 ? '+' : '') + pct.toFixed(2);
      const formattedPnl = (pnl > 0 ? '+' : '') + pnl.toFixed(2);

      return { pnl: formattedPnl, pnlPercent: pnlPercentStr };
    };
  });

  compFuturePos = computed(() => {
    const futureSymbols = this.futureSymbols();
    const positions: { [key: string]: FuturePosition } = {};

    futureSymbols.forEach((symbol) => {
      const sym = (symbol || '').toLowerCase();
      if (sym) {
        const position = this.futurePos().find((pos: any) => pos.symbol.toLowerCase() === sym);

        if (position) {
          const pnlData = this.formatPnl()(
            symbol,
            position.entryPrice,
            position.positionAmt,
            position.leverage,
          );
          position.pnl = pnlData.pnl;
          position.pnlPercent = pnlData.pnlPercent;

          const orders = this.openOrders();
          const tpOrder = orders?.find(
            (order) =>
              order.symbol.toLowerCase() === sym && order?.orderType === 'TAKE_PROFIT_MARKET',
          );
          const slOrder = orders?.find(
            (order) => order.symbol.toLowerCase() === sym && order?.orderType === 'STOP_MARKET',
          );

          if (tpOrder) {
            position.takeProfit = tpOrder.triggerPrice;
          }
          if (slOrder) {
            position.stopLoss = slOrder.triggerPrice;
          }
          positions[sym] = { ...position, symbol: sym };
        }
      }
    });

    return positions;
  });

  private destroyRef = inject(DestroyRef);

  constructor() {}

  ngOnInit(): void {
    this.createTradeForm();
    this.fetchPositions();
    this.fetchOpenOrders();
  }

  createTradeForm(): void {
    const arrayControls = this.tradesFormArray.controls as FormGroup[];
    const futureSymbols = this.futureSymbols();
    futureSymbols.forEach((symbol) => {
      const exists = arrayControls.some((ctrl) => ctrl.value.symbol === symbol);
      if (!exists) {
        const group = this.formBuilder.group({
          symbol: [symbol],
          leverage: [this.defaultLeverage, [Validators.required]],
          amount: [this.defaultAmount, [Validators.required, Validators.min(5)]],
          price: [null, Validators.required],
          hasTPSL: [false],
          takeProfit: [null],
          stopLoss: [null],
        });
        this.tradesFormArray.push(group);
      }
    });
  }

  fetchPositions(): void {
    this.binanceService
      .getUserInfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res && res.positions) {
            this.futurePos.set(res.positions);
            this.updateEnabledDisabledForm();
          }
        },
        error: (err) => console.error(err),
      });
  }

  fetchOpenOrders(): void {
    this.binanceService
      .getOpenOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res) {
            this.openOrders.set(res);
          }
        },
        error: (err) => console.error(err),
      });
  }

  updateEnabledDisabledForm(): void {
    const futureSymbols = this.futureSymbols();
    futureSymbols.forEach((symbol) => {
      const ctrl = this.tradesFormArray.controls.find(
        (c) => c.value.symbol.toLowerCase() === symbol.toLowerCase(),
      );
      if (ctrl) {
        const pos = this.compFuturePos()[symbol];
        const toggleControls = ['leverage', 'amount', 'price', 'hasTPSL', 'takeProfit', 'stopLoss'];
        if (pos?.initialMargin?.toString() !== '0') {
          toggleControls.forEach((name) => ctrl.get(name)?.disable({ emitEvent: false }));
        } else {
          toggleControls.forEach((name) => ctrl.get(name)?.enable({ emitEvent: false }));
        }
      }
    });
  }

  addToFormPrice(symbol: string, price: number): void {
    const pos = this.compFuturePos()[symbol];
    if (pos?.initialMargin?.toString() !== '0') {
      return;
    }

    this.tradesFormArray.controls.forEach((c) => {
      if ((c.value.symbol || '').toLowerCase() === symbol.toLowerCase()) {
        c.patchValue({ price }, { emitEvent: false });
      }
    });
  }

  placeOrder(data: FormGroup, side: 'BUY' | 'SELL'): void {
    const { symbol, amount, price, leverage } = data.value;
    const executionPrice = price || this.currentMarketPrice()(symbol);

    if (!executionPrice) {
      console.error('Price is zero, cannot calculate quantity');
      return;
    }

    const quantity = Number(((amount * leverage) / executionPrice).toFixed(5));

    this.binanceService
      .placeOrder({
        symbol: symbol.toUpperCase(),
        side: side,
        type: price ? 'LIMIT' : 'MARKET',
        quantity: quantity,
        price: price,
        // leverage: leverage,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.fetchPositions();
          this.fetchOpenOrders();
        },
        error: (err) => console.error(err),
      });
  }

  closePosition(pos: FuturePosition): void {
    const amt = parseFloat(pos.positionAmt) || 0;
    if (amt === 0) {
      console.error('No active position to close.');
      return;
    }

    const side = amt > 0 ? 'SELL' : 'BUY';
    const quantity = Math.abs(amt);
    const symbol = pos.symbol;

    if (
      confirm(
        `Are you sure you want to close your ${side === 'SELL' ? 'Long' : 'Short'} position of ${quantity} ${symbol} at MARKET price?`,
      )
    ) {
      this.binanceService
        .placeOrder({
          symbol: symbol.toUpperCase(),
          side: side,
          type: 'MARKET',
          quantity: quantity,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.fetchPositions();
            this.fetchOpenOrders();
          },
          error: (err) => console.error(err),
        });
    }
  }

  openRiskDialog(symbol: string, type: 'STOP_LOSS' | 'TAKE_PROFIT') {
    const pos = this.compFuturePos()[symbol];
    if (pos?.initialMargin?.toString() === '0') {
      alert('No active position to protect.');
      return;
    }

    const ep = parseFloat(pos.entryPrice as string);
    const amt = parseFloat(pos.positionAmt as string);
    const lev = pos.leverage;

    this.riskDialogSymbol = symbol;
    this.riskDialogType = type;
    this.riskDialogPrice = null;
    this.riskDialogSide = amt > 0 ? 'SELL' : 'BUY';
    this.isRiskDialogOpen = true;

    this.riskDialogPositionAmt = amt;
    this.riskDialogEntryPrice = ep;
    this.riskDialogLeverage = lev;
    this.riskDialogPercent = 50;

    this.updatePriceFromPercent();
  }

  updatePriceFromPercent(): void {
    const roePercent =
      this.riskDialogType === 'STOP_LOSS'
        ? -Math.abs(this.riskDialogPercent)
        : Math.abs(this.riskDialogPercent);
    const roeFraction = roePercent / 100;

    const ep = this.riskDialogEntryPrice;
    const lev = this.riskDialogLeverage;
    const amt = this.riskDialogPositionAmt;
    const sign = amt > 0 ? 1 : -1;

    // Target Price = Entry + ROE * (Entry / Leverage) * sign
    const targetPrice = ep + roeFraction * (ep / lev) * sign;

    // Safety check for absolute 0
    this.riskDialogPrice = Math.max(Number(targetPrice.toFixed(5)), 0);
    this.calculateEstimatedPnL(this.riskDialogPrice);
  }

  updateFromPrice(): void {
    if (!this.riskDialogPrice) {
      this.riskDialogEstimatedPnL = 0;
      this.riskDialogEstimatedPnLStr = '$0.00';
      return;
    }
    const price = this.riskDialogPrice;
    const ep = this.riskDialogEntryPrice;
    const lev = this.riskDialogLeverage;
    const amt = this.riskDialogPositionAmt;

    this.calculateEstimatedPnL(price);

    const margin = (Math.abs(amt) * ep) / lev;
    if (margin > 0) {
      const roeFraction = this.riskDialogEstimatedPnL / margin;
      const absPercent = Math.abs(roeFraction * 100);
      this.riskDialogPercent = Math.max(Math.round(absPercent), 1);
    }
  }

  calculateEstimatedPnL(targetPrice: number): void {
    const ep = this.riskDialogEntryPrice;
    const amt = this.riskDialogPositionAmt;
    this.riskDialogEstimatedPnL = (targetPrice - ep) * amt;

    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    this.riskDialogEstimatedPnLStr = formatter.format(Math.abs(this.riskDialogEstimatedPnL));
  }

  submitRiskOrder(): void {
    if (!this.riskDialogPrice) return;

    const payload = {
      symbol: this.riskDialogSymbol.toUpperCase(),
      side: this.riskDialogSide,
      stopPrice: this.riskDialogPrice,
      closePosition: true,
    };

    if (this.riskDialogType === 'STOP_LOSS') {
      this.binanceService
        .stopLoss(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.isRiskDialogOpen = false;
            this.fetchOpenOrders();
          },
          error: (err) => console.error(err),
        });
    } else {
      this.binanceService
        .takeProfit(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.isRiskDialogOpen = false;
            this.fetchOpenOrders();
          },
          error: (err) => console.error(err),
        });
    }
  }

  startBot(index: number): void {
    const tradeData = this.tradesFormArray.at(index).value;
  }
}
