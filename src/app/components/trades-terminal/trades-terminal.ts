import { Component, computed, inject, input, OnInit, signal, DestroyRef } from '@angular/core';
import { NgClass, DecimalPipe, CurrencyPipe } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  FormsModule,
  Validators,
  FormArray,
  FormGroup,
  AbstractControl,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services
import { UtilsService } from '../../core/services/utils.service';
import { BinanceService } from '../../core/services/binance.service';
import { FutureTradeService } from '../../core/services/future-trade.service';
import { UserService } from '../../core/services/user.service';

// Models
import {
  BinanceWsPrice,
  Bracket,
  FuturePosition,
  LeverageBracket,
  OrderSideEnum,
  OrderTypeEnum,
  PositionSideEnum,
  TPSLOrder,
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
import { ConfirmationService } from 'primeng/api';
import { DialogService, DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';

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
  confirmationService = inject(ConfirmationService);
  utilsService = inject(UtilsService);
  binanceService = inject(BinanceService);
  futureTradeService = inject(FutureTradeService);
  userService = inject(UserService);

  private dialogService = inject(DialogService);
  private destroyRef = inject(DestroyRef);
  private dialogRef: DynamicDialogRef | null = null;

  readonly defaultAmount = 5;
  readonly defaultLeverage = 20;
  readonly prices = input<Record<string, BinanceWsPrice[]>>({});

  futureSymbols = input<string[]>([]);
  futurePos = signal<FuturePosition[]>([]);
  // openOrders = signal<OpenOrder[]>([]);
  tpslOrders = signal<TPSLOrder[]>([]);
  leverageBracket = signal<LeverageBracket[]>([]);

  PositionSideEnum = PositionSideEnum;
  orderTypeEnum = OrderTypeEnum;
  orderSideEnum = OrderSideEnum;

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

  compFuturePos = computed(() => {
    const futureSymbols = this.futureSymbols();
    const positions: { [key: string]: FuturePosition } = {};

    futureSymbols.forEach((symbol) => {
      const sym = (symbol || '').toLowerCase();
      if (sym) {
        const position = this.futurePos().find((pos: any) => pos.symbol.toLowerCase() === sym);

        if (position) {
          const margin = this.utilsService.calculateMargin(
            Number(position.positionAmt),
            Number(position.entryPrice),
            Number(position.leverage),
          );
          position.margin = Math.abs(margin);

          const data = this.utilsService.calculatePnl(
            Number(position.entryPrice),
            this.currentMarketPrice()(symbol),
            Number(position.positionAmt),
            Number(position.leverage),
          );

          position.position =
            Number(position.positionAmt) > 0 ? PositionSideEnum.LONG : PositionSideEnum.SHORT;
          position.pnl = data.pnl;
          position.pnlPercent = data.pnlPercent;

          const orders = this.tpslOrders();
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
          let positionAmt = parseFloat(position.positionAmt as string);

          if (tpOrder) {
            position.takeProfit = tpOrder.triggerPrice;
            const formatTriggerPrice = parseFloat(tpOrder?.triggerPrice as string) || 0;
            const { pnlStr, pnlPercent } = this.utilsService.calculateEstimatedPnL(
              formatEntryPrice,
              formatTriggerPrice,
              positionAmt,
              position.leverage,
            );

            position.takeProfitPnl = pnlStr;
            position.takeProfitPnlPercent = pnlPercent;
          }
          if (slOrder) {
            position.stopLoss = slOrder.triggerPrice;
            const formatTriggerPrice = parseFloat(slOrder?.triggerPrice as string) || 0;
            const { pnlStr, pnlPercent } = this.utilsService.calculateEstimatedPnL(
              formatEntryPrice,
              formatTriggerPrice,
              positionAmt,
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

  compFutureLeverageBracket = computed(() => {
    const futureSymbols = this.futureSymbols();
    const leverageBracket: { [key: string]: Bracket } = {};

    futureSymbols.forEach((symbol) => {
      const ctrl = this.tradesFormArray.controls.find(
        (c) => c.value.symbol.toLowerCase() === symbol.toLowerCase(),
      );

      if (ctrl) {
        const bracket = this.leverageBracket().find(
          (bracket: any) => bracket.symbol.toLowerCase() === symbol.toLowerCase(),
        );
        if (bracket) {
          const brackets = bracket.brackets[0];
          leverageBracket[symbol] = brackets;
        }
      }
    });

    return leverageBracket;
  });

  ngOnInit(): void {
    this.fetchLeverageBracket();
    this.getFuturesPositions();
    this.fetchPendingTpSl();

    // this.fetchOpenOrders();
  }

  createTradeForm(leverageBracket: LeverageBracket[]): void {
    const arrayControls = this.tradesFormArray.controls as FormGroup[];
    const futureSymbols = this.futureSymbols();
    futureSymbols.forEach((symbol) => {
      const exists = arrayControls.some((ctrl) => ctrl.value.symbol === symbol);
      if (!exists) {
        const bracket = leverageBracket.find(
          (bracket: any) => bracket.symbol.toLowerCase() === symbol.toLowerCase(),
        );
        const maxLeverage = bracket?.brackets[0].initialLeverage || 125;

        const group = this.formBuilder.group({
          symbol: [symbol, [Validators.required]],
          leverage: [
            maxLeverage,
            [Validators.required, Validators.min(1), Validators.max(maxLeverage)],
          ],
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

  fetchLeverageBracket(): void {
    this.binanceService
      .getLeverageBracket()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const futureSymbols = this.futureSymbols().map((symbol) => symbol.toUpperCase());
          const leverageBracket = res.filter((bracket: any) =>
            futureSymbols.includes(bracket.symbol),
          );
          if (leverageBracket.length > 0) {
            this.leverageBracket.set(leverageBracket);
          }
          this.createTradeForm(leverageBracket);
        },
        error: (err) => console.error(err),
      });
  }

  // fetchOpenOrders(): void {
  //   this.futureTradeService
  //     .getOpenOrders()
  //     .pipe(takeUntilDestroyed(this.destroyRef))
  //     .subscribe({
  //       next: (res) => {
  //         if (res) {
  //           this.openOrders.set(res);
  //         }
  //       },
  //       error: (err) => console.error(err),
  //     });
  // }

  private getFuturesPositions(): void {
    this.futureTradeService
      .getFuturesPositions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        const newPositions = res.filter((pos) => Number(pos.positionAmt) !== 0);
        if (newPositions.length > 0) {
          this.futurePos.set(newPositions);
          this.updateForm();
        }
      });
  }

  private fetchPendingTpSl(): void {
    this.futureTradeService
      .getPendingTpSl()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.tpslOrders.set(res || []);
        },
        error: (err) => console.error(err),
      });
  }

  private updateForm(): void {
    const futureSymbols = this.futureSymbols();
    futureSymbols.forEach((symbol) => {
      const ctrl = this.tradesFormArray.controls.find(
        (c) => c.value.symbol.toLowerCase() === symbol.toLowerCase(),
      );
      if (ctrl) {
        const pos = this.compFuturePos()[symbol];
        const toggleControls = ['leverage', 'amount', 'price', 'hasTPSL', 'takeProfit', 'stopLoss'];
        if (pos?.margin) {
          toggleControls.forEach((name) => ctrl.get(name)?.disable({ emitEvent: false }));
        } else {
          toggleControls.forEach((name) => ctrl.get(name)?.enable({ emitEvent: false }));
        }
      }
    });
  }

  addToFormPrice(symbol: string, price: number): void {
    const pos = this.compFuturePos()[symbol];
    if (pos?.margin) {
      return;
    }

    this.tradesFormArray.controls.forEach((c) => {
      if ((c.value.symbol || '').toLowerCase() === symbol.toLowerCase()) {
        c.patchValue({ price }, { emitEvent: false });
      }
    });
  }

  placeOrder(data: FormGroup, side: OrderSideEnum): void {
    if (data.invalid) {
      return;
    }

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
      type: price ? OrderTypeEnum.LIMIT : OrderTypeEnum.MARKET,
      quantity,
      price,
      leverage,
    };

    this.futureTradeService
      .placeOrder(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.getFuturesPositions();
          this.fetchPendingTpSl();
          // this.fetchOpenOrders();
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
    const symbol = pos.symbol;

    this.confirmationService.confirm({
      message: `Are you sure you want to close your ${side === OrderSideEnum.SELL ? PositionSideEnum.LONG : PositionSideEnum.SHORT} position of ${symbol}?`,
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
        severity: 'success',
        outlined: true,
      },

      accept: () => {
        this.futureTradeService
          .closePosition({
            symbol: symbol.toUpperCase(),
            side,
          })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              this.getFuturesPositions();
              this.fetchPendingTpSl();
            },
            error: (err) => console.error(err),
          });
      },
      reject: () => {},
    });
  }

  openTPSLDialog(symbol: string, type: OrderTypeEnum): void {
    const pos = this.compFuturePos()[symbol];
    if (pos?.margin?.toString() === '0') {
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
      if (!payload) {
        return;
      }

      const newPayload: any = {
        symbol,
        triggerPrice: payload.triggerPrice,
        closePosition: true,
      };

      if (payload?.type === OrderTypeEnum.STOP_MARKET) {
        const side = Number(pos.positionAmt) > 0 ? OrderSideEnum.SELL : OrderSideEnum.BUY;
        newPayload.side = side;

        this.futureTradeService
          .stopLoss(newPayload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              this.getFuturesPositions();
              this.fetchPendingTpSl();
            },
            error: (err) => console.error(err),
          });
      } else if (payload?.type === OrderTypeEnum.TAKE_PROFIT_MARKET) {
        const side = Number(pos.positionAmt) > 0 ? OrderSideEnum.BUY : OrderSideEnum.SELL;
        newPayload.side = side;

        this.futureTradeService
          .takeProfit(newPayload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              this.getFuturesPositions();
              this.fetchPendingTpSl();
            },
            error: (err) => console.error(err),
          });
      }
    });
  }

  startBot(index: number): void {
    const tradeData = this.tradesFormArray.at(index).value;
  }

  getFormControl(symbol: string, name: string) {
    return this.tradesFormArray.controls
      .find((c) => c.value.symbol.toLowerCase() === symbol.toLowerCase())
      ?.get(name);
  }
}
