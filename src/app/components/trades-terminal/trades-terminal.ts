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
import { TradeService } from '../../core/services/trade-service';

// Models
import {
  FuturePosition,
  OpenOrder,
  OrderSideEnum,
  OrderTypeEnum,
} from '../../core/models/trades.model';

// Components
import { TpSlDialog } from '../dialogs/tp-sl-dialog/tp-sl-dialog';

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
import { DialogService, DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ConfirmationService } from 'primeng/api';

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
    DynamicDialogModule,
  ],
  templateUrl: './trades-terminal.html',
  styleUrl: './trades-terminal.scss',
})
export class TradesTerminal implements OnInit {
  formBuilder = inject(FormBuilder);
  binanceService = inject(BinanceService);
  confirmationService = inject(ConfirmationService);
  tradeService = inject(TradeService);

  private dialogService = inject(DialogService);
  private destroyRef = inject(DestroyRef);
  private dialogRef: DynamicDialogRef | null = null;

  readonly defaultAmount = 5;
  readonly defaultLeverage = 125;
  readonly prices = input<Record<string, BinanceWsPrice[]>>({});

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

      const pnlPercentStr = pct.toFixed(2);
      const formattedPnl = pnl.toFixed(2);

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
              order.symbol.toLowerCase() === sym &&
              order?.orderType === OrderTypeEnum.TAKE_PROFIT_MARKET,
          );
          const slOrder = orders?.find(
            (order) =>
              order.symbol.toLowerCase() === sym && order?.orderType === OrderTypeEnum.STOP_MARKET,
          );

          let formatEntryPrice = parseFloat(position.entryPrice as string);
          let formatAmount = parseFloat(position.positionAmt as string);

          if (tpOrder) {
            position.takeProfit = tpOrder.triggerPrice;
            const formatTriggerPrice = parseFloat(tpOrder?.triggerPrice as string) || 0;
            const { pnlStr, pnlPercent } = this.tradeService.calculateEstimatedPnL(
              formatEntryPrice,
              formatTriggerPrice,
              formatAmount,
              position.leverage,
            );

            position.takeProfitPnl = pnlStr;
            position.takeProfitPnlPercent = pnlPercent;
          }
          if (slOrder) {
            position.stopLoss = slOrder.triggerPrice;
            const formatTriggerPrice = parseFloat(slOrder?.triggerPrice as string) || 0;
            const { pnlStr, pnlPercent } = this.tradeService.calculateEstimatedPnL(
              formatEntryPrice,
              formatTriggerPrice,
              formatAmount,
              position.leverage,
            );

            position.stopLossPnl = pnlStr;
            position.stopLossPnlPercent = pnlPercent;
          }
          positions[sym] = { ...position, symbol: sym };
        }
      }
    });

    return positions;
  });

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

  placeOrder(data: FormGroup, side: OrderSideEnum): void {
    const { symbol, amount, price, leverage, stopLoss, takeProfit } = data.value;
    const executionPrice = price || this.currentMarketPrice()(symbol);

    if (!executionPrice) {
      console.error('Price is zero, cannot calculate quantity');
      return;
    }

    const quantity = Number(((amount * leverage) / executionPrice).toFixed(5));

    const params = {
      symbol: symbol.toUpperCase(),
      side,
      type: price ? 'LIMIT' : 'MARKET',
      quantity,
      price,
      leverage,
    };

    this.binanceService
      .placeOrder(params)
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

    const side = amt > 0 ? OrderSideEnum.SELL : OrderSideEnum.BUY;
    const quantity = Math.abs(amt);
    const symbol = pos.symbol;

    this.confirmationService.confirm({
      message: `Are you sure you want to close your ${side === OrderSideEnum.SELL ? 'Long' : 'Short'} position of ${symbol}?`,
      header: 'Close Position?',
      icon: 'pi pi-info-circle',
      rejectLabel: 'Cancel',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Confirm',
        severity: side === OrderSideEnum.SELL ? 'success' : 'danger',
        outlined: true,
      },

      accept: () => {
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
      },
      reject: () => {},
    });
  }

  openTPSLDialog(symbol: string, type: OrderTypeEnum) {
    const pos = this.compFuturePos()[symbol];
    if (pos?.initialMargin?.toString() === '0') {
      return;
    }

    this.dialogRef = this.dialogService.open(TpSlDialog, {
      header: type === OrderTypeEnum.STOP_MARKET ? 'Set Stop Loss' : 'Set Take Profit',
      data: { ...pos, type },
      width: '500px',
      modal: true,
      breakpoints: {
        '425px': '90%',
      },
    });

    this.dialogRef?.onClose.subscribe((payload) => {
      if (payload?.side === OrderSideEnum.SELL) {
        this.binanceService
          .stopLoss(payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              this.fetchOpenOrders();
            },
            error: (err) => console.error(err),
          });
      } else if (payload?.side === OrderSideEnum.BUY) {
        this.binanceService
          .takeProfit(payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              this.fetchOpenOrders();
            },
            error: (err) => console.error(err),
          });
      }
    });
  }

  startBot(index: number): void {
    const tradeData = this.tradesFormArray.at(index).value;
  }
}
