import { Component, computed, inject, input, effect, OnInit, OnDestroy } from '@angular/core';
import { NgClass, DecimalPipe, NgIf } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  FormsModule,
  Validators,
  FormArray,
  FormGroup,
} from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';

// Services
import { BinanceService, BinanceWsPrice } from '../../core/services/binance.service';

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
    NgIf,
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
    RadioButtonModule
  ],
  templateUrl: './trades-terminal.html',
  styleUrl: './trades-terminal.scss',
})
export class TradesTerminal implements OnInit, OnDestroy {
  formBuilder = inject(FormBuilder);
  binanceService = inject(BinanceService);

  private destroy$ = new Subject<void>();
  private refresh$ = new Subject<void>();

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

  tradesForm = this.formBuilder.group({
    trades: this.formBuilder.array<FormGroup>([]),
  });

  get tradesArray(): FormArray<FormGroup> {
    return this.tradesForm.get('trades') as FormArray<FormGroup>;
  }

  currentMarketPrice = computed(() => {
    return (symbol: string) => {
      const prices = this.prices();
      const symbolPrices = prices[symbol.toLowerCase()];

      return symbolPrices?.at(-1)?.price ?? 0;
    };
  });

  currentPnL = computed(() => {
    return (symbol: string, entryPrice: string | number, positionAmt: string | number, leverage: string | number) => {
      const currentPrice = this.currentMarketPrice()(symbol);
      const ep = parseFloat(entryPrice as string) || 0;
      const amt = parseFloat(positionAmt as string) || 0;
      const lev = parseFloat(leverage as string) || 125;

      if (amt === 0 || ep === 0 || currentPrice === 0) {
        return { pnl: '$0.00', pnlPercent: '0.00%', isLoss: false };
      }

      // PnL formula handles both directions because amt is negative for shorts
      const pnl = (currentPrice - ep) * amt;
      const notional = Math.abs(amt) * ep;
      const margin = notional / lev;
      const pct = margin > 0 ? (pnl / margin) * 100 : 0;

      const pnlPercentStr = (pct > 0 ? '+' : '') + pct.toFixed(2) + '%';
      const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
      const formattedPnl = (pnl > 0 ? '+' : '') + formatter.format(pnl);

      return { pnl: formattedPnl, pnlPercent: pnlPercentStr, isLoss: pct < 0 };
    };
  });

  readonly defaultPrice = 5;
  readonly defaultLeverage = 125;
  readonly defaultStopLoss =null;
  readonly defaultTakeProfit =null;
  readonly prices = input<Record<string, BinanceWsPrice[]>>({});

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
            amount: [this.defaultPrice, [Validators.required, Validators.min(5)]],
            leverage: [this.defaultLeverage, [Validators.required, Validators.min(1)]],
            entryPrice: ['0.00000'],
            pnl: ['$0.00'],
            pnlPercent: ['0.00%'],
            positionAmt: [0],
            stopLoss: ['-'],
            takeProfit: ['-'],
            isTPSL: [false],
            stopLossPrice: [this.defaultStopLoss],
            takeProfitPrice: [this.defaultTakeProfit],
          });
          this.tradesArray.push(group);

          // Whenever a new symbol is added, attempt to refresh positions and orders
          this.fetchPositions();
          this.fetchOpenOrders();
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

  ngOnInit() {
    this.fetchPositions();
    this.fetchOpenOrders();

    this.refresh$
      .pipe(takeUntil(this.destroy$), debounceTime(1500))
      .subscribe(() => {
        this.fetchOpenOrders();
      });

    this.binanceService
      .getUserDataStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.e === 'ACCOUNT_UPDATE' && data.a && data.a.P) {
          const positions = data.a.P;
          positions.forEach((p: any) => {
            this.updatePositionInForm(p.s, p.ep, p.up, p.pa);
          });
        } else if (data && data.e === 'ORDER_TRADE_UPDATE') {
          this.refresh$.next();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchPositions() {
    this.binanceService.getUserInfo().subscribe({
      next: (res) => {
        if (res && res.positions) {
          res.positions.forEach((pos: any) => {
            this.updatePositionInForm(
              pos.symbol,
              pos.entryPrice,
              pos.unrealizedProfit,
              pos.positionAmt,
            );
          });
        }
      },
      error: (err) => console.error(err),
    });
  }

  fetchOpenOrders():void {
    this.binanceService.getOpenOrders().subscribe({
      next: (orders) => {
        this.updateOpenOrdersInForm(orders);
      },
      error: (err) => console.error(err),
    });
  }

  addToCurrentPrice(symbol: string, price: number): void {
    const symLower = (symbol || '').toLowerCase();

    this.tradesArray.controls.forEach((c) => {
      if ((c.value.symbol || '').toLowerCase() === symLower) {
        c.patchValue(
          {
            price: price,
          },
          { emitEvent: false },
        );
      }
    });
  }

  updateOpenOrdersInForm(orders: any[]) {
    const ordersBySymbol: Record<string, any[]> = {};
    orders.forEach((o) => {
      const symLower = o.symbol.toLowerCase();
      if (!ordersBySymbol[symLower]) ordersBySymbol[symLower] = [];
      ordersBySymbol[symLower].push(o);
    });

    this.tradesArray.controls.forEach((ctrl) => {
      const symbol = (ctrl.value.symbol || '').toLowerCase();
      const symbolOrders = ordersBySymbol[symbol] || [];

      // Find STOP_MARKET and TAKE_PROFIT_MARKET orders
      const slOrder = symbolOrders.find((o) => o.orderType === 'STOP_MARKET' || o.orderType === 'STOP');
      const tpOrder = symbolOrders.find((o) => o.orderType === 'TAKE_PROFIT_MARKET' || o.orderType === 'TAKE_PROFIT');

      let slStr = '-';
      let tpStr = '-';

      const ep = parseFloat(ctrl.value.entryPrice) || 0;
      const lev = parseFloat(ctrl.value.leverage) || 125;
      const amt = parseFloat(ctrl.value.positionAmt) || 0;
      const sign = amt > 0 ? 1 : amt < 0 ? -1 : 0;

      if (slOrder) {
        const slPrice = parseFloat(slOrder.triggerPrice);
        slStr = slPrice.toLocaleString('en-US', { maximumFractionDigits: 7 });
        if (ep > 0 && sign !== 0) {
          const roePercent = ((slPrice - ep) / ep) * sign * lev * 100;
          const formattedPct = parseFloat(roePercent.toFixed(2));
          slStr += `/${formattedPct > 0 ? '+' : ''}${formattedPct}%`;
        }
      }

      if (tpOrder) {
        const tpPrice = parseFloat(tpOrder.triggerPrice);
        tpStr = tpPrice.toLocaleString('en-US', { maximumFractionDigits: 7 });
        if (ep > 0 && sign !== 0) {
          const roePercent = ((tpPrice - ep) / ep) * sign * lev * 100;
          const formattedPct = parseFloat(roePercent.toFixed(2));
          tpStr += `/${formattedPct > 0 ? '+' : ''}${formattedPct}%`;
        }
      }

      ctrl.patchValue(
        {
          stopLoss: slStr,
          takeProfit: tpStr,
        },
        { emitEvent: false },
      );
    });
  }

  updatePositionInForm(
    symbol: string,
    ep: string | number,
    up: string | number,
    pa: string | number,
  ) {
    const symLower = (symbol || '').toLowerCase();
    const ctrl = this.tradesArray.controls.find(
      (c) => (c.value.symbol || '').toLowerCase() === symLower,
    );

    if (ctrl) {
      const pnlNum = parseFloat(up as string) || 0;
      const entryPriceNum = parseFloat(ep as string) || 0;
      const rawPosAmt = parseFloat(pa as string) || 0;
      const posAmtNum = Math.abs(rawPosAmt);

      const leverage = ctrl.value.leverage || this.defaultLeverage;
      let pnlPercentStr = '';

      let formattedPnl = '';
      if (posAmtNum > 0) {
        const notional = posAmtNum * entryPriceNum;
        const margin = notional / leverage;
        const pct = margin > 0 ? (pnlNum / margin) * 100 : 0;
        pnlPercentStr = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';

        const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
        formattedPnl = (pnlNum >= 0 ? '+' : '') + formatter.format(pnlNum);
      } else {
        pnlPercentStr = '0.00%';
        formattedPnl = '$0.00';
      }

      ctrl.patchValue(
        {
          entryPrice: posAmtNum > 0 ? entryPriceNum.toString() : '0.00000',
          pnl: formattedPnl,
          pnlPercent: pnlPercentStr,
          positionAmt: rawPosAmt,
        },
        { emitEvent: false },
      );
    }
  }

  buy(data: FormGroup): void {
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
        side: 'BUY',
        type: price ? 'LIMIT' : 'MARKET',
        quantity: quantity,
        price: price,
      })
      .subscribe({
        next: (res) => console.log(res),
        error: (err) => console.error(err),
      });
  }

  sell(data: FormGroup): void {
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
        side: 'SELL',
        type: price ? 'LIMIT' : 'MARKET',
        quantity: quantity,
        price: price,
      })
      .subscribe({
        next: (res) => console.log(res),
        error: (err) => console.error(err),
      });
  }

  openRiskDialog(tradeGroup: FormGroup, type: 'STOP_LOSS' | 'TAKE_PROFIT') {
    const amt = tradeGroup.value.positionAmt;
    if (!amt || amt === 0) {
      alert('No active position to protect.');
      return;
    }

    this.riskDialogSymbol = tradeGroup.value.symbol;
    this.riskDialogType = type;
    this.riskDialogPrice = null;
    this.riskDialogSide = amt > 0 ? 'SELL' : 'BUY';
    this.isRiskDialogOpen = true;

    // Retrieve live position stats from the form
    this.riskDialogPositionAmt = amt;
    this.riskDialogEntryPrice = parseFloat(tradeGroup.value.entryPrice) || 0;
    this.riskDialogLeverage = tradeGroup.value.leverage || this.defaultLeverage;

    // Set default slider value and instantly compute target price and PnL
    this.riskDialogPercent = 50;

    this.updatePriceFromPercent();
  }

  updatePriceFromPercent():void {
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

  updateFromPrice():void {
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

  submitRiskOrder():void {
    if (!this.riskDialogPrice) return;

    const payload = {
      symbol: this.riskDialogSymbol.toUpperCase(),
      side: this.riskDialogSide,
      stopPrice: this.riskDialogPrice,
      closePosition: true,
    };

    const request$ =
      this.riskDialogType === 'STOP_LOSS'
        ? this.binanceService.stopLoss(payload)
        : this.binanceService.takeProfit(payload);

    request$.subscribe({
      next: (res) => {
        this.isRiskDialogOpen = false;
        this.fetchOpenOrders();
      },
      error: (err) => console.error(err),
    });
  }

  closePosition(tradeGroup: FormGroup): void {
    console.log(1);
  }

  startBot(index: number): void {
    const tradeData = this.tradesArray.at(index).value;
  }
}
