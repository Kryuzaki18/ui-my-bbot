import { Component, computed, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { NgClass, DecimalPipe, CurrencyPipe } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  FormsModule,
  Validators,
  FormGroup,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Models
import {
  Bracket,
  FuturePosition,
  LeverageBracket,
  OrderSideEnum,
  OrderTypeEnum,
  PositionSideEnum,
  TPSLOrder,
} from '../../core/models/trades.model';
import { MarkPriceData } from '../../core/models/chart.model';

// Components
import { TpSlDialogComponent } from '../dialogs/tp-sl-dialog/tp-sl-dialog';

// Services
import { UtilsService } from '../../core/services/utils.service';
import { FutureTradeService } from '../../core/services/future-trade.service';
import { BinanceRestService } from '../../core/services/binance-rest.service';
import { BinanceWsService } from '../../core/services/binance-ws.service';
import { ChartService } from '../../core/services/chart/chart.service';

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
export class TradesTerminalComponent implements OnInit {
  private readonly utilsService = inject(UtilsService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly binanceWsService = inject(BinanceWsService);
  private readonly binanceRestService = inject(BinanceRestService);
  private readonly futureTradeService = inject(FutureTradeService);
  private readonly chartService = inject(ChartService);
  private readonly dialogService = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private dialogRef: DynamicDialogRef | null = null;

  readonly defaultAmount = 5;
  readonly defaultLeverage = 20;
  readonly futurePos = signal<FuturePosition[]>([]);
  readonly tpslOrders = signal<TPSLOrder[]>([]);
  readonly leverageBracket = signal<LeverageBracket | null>(null);
  readonly markPriceData = signal<MarkPriceData | null>(null);
  readonly PositionSideEnum = PositionSideEnum;
  readonly orderTypeEnum = OrderTypeEnum;
  readonly orderSideEnum = OrderSideEnum;

  tradeForm!: FormGroup;

  readonly compFuturePos = computed(() => {
    const sym = this.chartService.selectedSymbol();
    const position = this.futurePos().find((pos: any) => pos.symbol.toLowerCase() === sym);

    if (position) {
      const margin = this.utilsService.calculateMargin(
        Number(position.positionAmt),
        Number(position.entryPrice),
        Number(position.leverage),
      );
      position.margin = Math.abs(margin);
      position.position =
        Number(position.positionAmt) > 0 ? PositionSideEnum.LONG : PositionSideEnum.SHORT;

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
    }
    return position;
  });

  readonly compLeverageBracket = computed(() => {
    const bracket = this.leverageBracket();
    if (!bracket) return null;
    const maxLeverage = bracket.brackets[0].initialLeverage;
    return { ...bracket, maxLeverage };
  });

  ngOnInit(): void {
    this.createTradeForm();
    this.subscribeWsMarkPrice();
    this.fetchLeverageBracket();
    this.fetchPendingTpSl();
    this.getFuturesPositions();
  }

  createTradeForm(): void {
    const sym = this.chartService.selectedSymbol();
    this.tradeForm = this.fb.group({
      symbol: [sym, [Validators.required]],
      leverage: [this.defaultLeverage, [Validators.required]],
      amount: [this.defaultAmount, [Validators.required, Validators.min(5)]],
      price: [null, Validators.required],
      hasTPSL: [true],
      takeProfit: [null],
      stopLoss: [null],
    });
  }

  fetchLeverageBracket(): void {
    this.binanceRestService
      .getLeverageBracket()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const sym = this.chartService.selectedSymbol();
          const bracket = res.find((bracket: any) => bracket.symbol.toLowerCase() === sym);
          if (bracket) {
            this.leverageBracket.set(bracket);
            const leverage = bracket.brackets[0]?.initialLeverage || this.defaultLeverage;
            this.tradeForm.get('leverage')?.patchValue(leverage, { emitEvent: false });
            this.tradeForm.get('leverage')?.addValidators([Validators.max(leverage)]);
            this.tradeForm.get('leverage')?.updateValueAndValidity({ emitEvent: false });
          }
        },
        error: (err) => console.error(err),
      });
  }

  private getFuturesPositions(): void {
    this.futureTradeService
      .getFuturesPositions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        const newPositions = res.filter((pos) => Number(pos.positionAmt) !== 0);
        if (newPositions.length > 0) {
          this.futurePos.set(newPositions);
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

  placeOrder(side: OrderSideEnum): void {
    if (this.tradeForm.invalid) {
      return;
    }

    const { symbol, amount, price, leverage, stopLoss, takeProfit } = this.tradeForm.value;
    const executionPrice = Number(price || this.markPriceData()?.markPrice);

    if (!executionPrice) {
      console.error('Price is zero, cannot calculate quantity');
      return;
    }

    const quantity = Number(((amount * leverage) / executionPrice).toFixed(5));

    const params = {
      symbol,
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
          this.tradeForm.reset({
            symbol: this.chartService.selectedSymbol(),
            leverage: this.compLeverageBracket()?.maxLeverage,
            amount: this.defaultAmount,
            price: null,
            hasTPSL: true,
            takeProfit: null,
            stopLoss: null,
          });
          this.fetchPendingTpSl();
          this.getFuturesPositions();
        },
        error: (err) => console.error(err),
      });
  }

  closePosition(): void {
    const pos = this.compFuturePos();
    if (!pos) {
      console.error('No active position to close.');
      return;
    }

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
              this.fetchPendingTpSl();
              this.getFuturesPositions();
            },
            error: (err) => console.error(err),
          });
      },
      reject: () => {},
    });
  }

  openTPSLDialog(type: OrderTypeEnum): void {
    const pos = this.compFuturePos();
    if (pos?.margin?.toString() === '0') {
      return;
    }

    this.dialogRef = this.dialogService.open(TpSlDialogComponent, {
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

      if (payload.isRemove) {
        const tpslOrder = this.tpslOrders().find(
          (order) =>
            order.symbol.toLowerCase() === this.chartService.selectedSymbol() &&
            order.orderType === type,
        );

        if (!tpslOrder) {
          return;
        }

        this.futureTradeService
          .cancelTpSl({
            algoId: tpslOrder?.algoId,
            clientAlgoId: tpslOrder?.clientAlgoId,
          })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              const updateTpSlOrders = this.tpslOrders().filter(
                (order) => order.algoId !== tpslOrder?.algoId,
              );
              this.tpslOrders.set(updateTpSlOrders);
              this.getFuturesPositions();
            },
            error: (err) => console.error(err),
          });
        return;
      }

      const newPayload: any = {
        symbol: this.chartService.selectedSymbol(),
        triggerPrice: payload.triggerPrice,
        closePosition: true,
      };

      if (payload?.type === OrderTypeEnum.STOP_MARKET) {
        const side = Number(pos?.positionAmt) > 0 ? OrderSideEnum.SELL : OrderSideEnum.BUY;
        newPayload.side = side;

        this.futureTradeService
          .stopLoss(newPayload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              this.fetchPendingTpSl();
              this.getFuturesPositions();
            },
            error: (err) => console.error(err),
          });
      } else if (payload?.type === OrderTypeEnum.TAKE_PROFIT_MARKET) {
        const side = Number(pos?.positionAmt) > 0 ? OrderSideEnum.BUY : OrderSideEnum.SELL;
        newPayload.side = side;

        this.futureTradeService
          .takeProfit(newPayload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              this.fetchPendingTpSl();
              this.getFuturesPositions();
            },
            error: (err) => console.error(err),
          });
      }
    });
  }

  startBot(index: number): void {}

  getPnL(): { pnl: string; pnlPercent: string } {
    const pos = this.compFuturePos();
    if (!pos) {
      return { pnl: '', pnlPercent: '' };
    }

    const data = this.utilsService.calculatePnl(
      Number(pos.entryPrice),
      Number(this.markPriceData()?.markPrice),
      Number(pos.positionAmt),
      Number(pos.leverage),
    );

    const pnl = data.pnl.toFixed(2);
    const pnlPercent = data.pnlPercent.toFixed(2);

    return {
      pnl: data.pnl > 0 ? '+' + pnl : pnl,
      pnlPercent: data.pnlPercent > 0 ? '+' + pnlPercent : pnlPercent,
    };
  }

  private subscribeWsMarkPrice(): void {
    this.binanceWsService.markPrice$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((d) => {
      this.markPriceData.set({
        markPrice: parseFloat(d.p),
        indexPrice: parseFloat(d.i),
        lastFundingRate: parseFloat(d.r),
        nextFundingTime: d.T,
      });
    });
  }
}
