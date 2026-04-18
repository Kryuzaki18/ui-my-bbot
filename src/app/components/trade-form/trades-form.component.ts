import { Component, computed, inject, OnInit, signal, DestroyRef, Injector } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  FormsModule,
  Validators,
  FormGroup,
} from '@angular/forms';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, startWith, take } from 'rxjs';

// Models
import {
  LeverageBracket,
  OrderSideEnum,
  OrderTypeEnum,
  PositionSideEnum,
} from '../../core/models/trades.model';
import { MarkPriceData } from '../../core/models/chart.model';

// Services
import { ChartService } from '../../core/services/chart/chart.service';
import { FutureTradeService } from '../../core/services/future-trade.service';
import { BinanceWsService } from '../../core/services/binance-ws.service';
import { UserService } from '../../core/services/user.service';
import { ToastMessageService } from '../../core/services/toast-message.service';
import { AppSettingsService } from '../../core/services/app-settings.service';

// PrimeNG Modules
import { SliderModule } from 'primeng/slider';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

interface TPSLOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-trade-form',
  imports: [
    NgClass,
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
    SelectButtonModule,
    InputGroupModule,
    InputGroupAddonModule,
    MenuModule,
    TooltipModule,
  ],
  templateUrl: './trade-form.component.html',
  styleUrl: './trade-form.component.scss',
})
export class TradeFormComponent implements OnInit {
  private readonly injector = inject(Injector);
  private readonly chartService = inject(ChartService);
  private readonly userService = inject(UserService);
  private readonly binanceWsService = inject(BinanceWsService);
  private readonly futureTradeService = inject(FutureTradeService);
  private readonly toastMessageService = inject(ToastMessageService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private dialogRef = inject(DynamicDialogRef, { optional: true });
  readonly dynamicDialogConfig = inject(DynamicDialogConfig, { optional: true });

  tradeForm!: FormGroup;
  defaultLeverage = 20;

  readonly defaultAmount = 5;
  readonly leverageBracket = signal<LeverageBracket | null>(null);
  readonly markPriceData = signal<MarkPriceData | null>(null);

  readonly PositionSideEnum = PositionSideEnum;
  readonly orderTypeEnum = OrderTypeEnum;
  readonly orderSideEnum = OrderSideEnum;

  readonly orderTypes = [
    { label: 'Limit', value: OrderTypeEnum.LIMIT },
    { label: 'Market', value: OrderTypeEnum.MARKET },
  ];

  readonly tpslOptions = [
    { label: 'Price', value: '$' },
    { label: 'Pnl', value: '%' },
    { label: 'ROI', value: 'R' },
  ];
  readonly selectedTpType = signal<TPSLOption>(this.tpslOptions[0]);
  readonly selectedSlType = signal<TPSLOption>(this.tpslOptions[0]);

  readonly optionTpItems = [
    {
      label: 'TP Settings',
      items: [
        {
          label: 'Price',
          command: () => {
            this.selectedTpType.set(this.tpslOptions[0]);
          },
        },
        {
          label: 'Pnl',
          command: () => {
            this.selectedTpType.set(this.tpslOptions[1]);
          },
        },
        {
          label: 'ROI',
          command: () => {
            this.selectedTpType.set(this.tpslOptions[2]);
          },
        },
      ],
    },
  ];

  readonly optionSlItems = [
    {
      label: 'SL Settings',
      items: [
        {
          label: 'Price',
          command: () => {
            this.selectedSlType.set(this.tpslOptions[0]);
          },
        },
        {
          label: 'Pnl',
          command: () => {
            this.selectedSlType.set(this.tpslOptions[1]);
          },
        },
        {
          label: 'ROI',
          command: () => {
            this.selectedSlType.set(this.tpslOptions[2]);
          },
        },
      ],
    },
  ];

  readonly compLeverageBracket = computed(() => {
    const bracket = this.leverageBracket();
    if (!bracket) return null;
    const maxLeverage = bracket.brackets[0].initialLeverage;
    return { ...bracket, maxLeverage };
  });

  ngOnInit(): void {
    this.subscribeWsMarkPrice();
    this.createTradeForm();
    this.fetchLeverageBracket();

    toObservable(this.markPriceData, { injector: this.injector })
      .pipe(
        startWith(this.markPriceData()),
        filter((data) => !!data?.markPrice),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.onOrderTypeChange();
      });

    toObservable(this.leverageBracket, { injector: this.injector })
      .pipe(
        startWith(this.leverageBracket()),
        filter((data) => !!data),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (bracket) => {
          const leverage = bracket.brackets[0]?.initialLeverage;
          this.defaultLeverage = leverage;
          this.tradeForm.get('leverage')?.patchValue(leverage, { emitEvent: false });
          this.tradeForm.get('leverage')?.addValidators([Validators.max(leverage)]);
        },
        error: () => {},
      });
  }

  placeOrder(side: OrderSideEnum): void {
    if (this.tradeForm.invalid) {
      this.toastMessageService.error('Please fill all the required fields.');
      return;
    }

    const { symbol, amount, price, leverage, orderType, stopLoss, takeProfit } =
      this.tradeForm.value;
    const executionPrice =
      orderType === OrderTypeEnum.MARKET ? Number(this.markPriceData()?.markPrice) : Number(price);

    if (!executionPrice) {
      this.toastMessageService.error('Price is zero, cannot calculate quantity.');
      return;
    }

    const quantity = Number(((amount * leverage) / executionPrice).toFixed(5));

    const params = {
      symbol,
      side,
      type: orderType,
      quantity,
      price,
      leverage,
    };

    this.futureTradeService
      .placeOrder(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.appSettingsService.setIsLoadingOpenOrders(true);
          this.appSettingsService.setIsLoadingPositions(true);

          this.toastMessageService.success('Order placed successfully.');
          this.tradeForm.reset({
            symbol: this.chartService.selectedSymbol(),
            leverage: this.compLeverageBracket()?.maxLeverage,
            amount: this.defaultAmount,
            price: null,
            hasTPSL: true,
            takeProfit: null,
            stopLoss: null,
          });
        },
        error: (err) => console.error(err),
      });
  }

  onOrderTypeChange(): void {
    this.tradeForm
      .get('price')
      ?.setValue(this.markPriceData()?.markPrice.toFixed(2), { emitEvent: false });
  }

  updateLeverage(val: number): void {
    const currentLeverage = this.tradeForm.get('leverage')?.value;
    if (val > 0 && currentLeverage + val > this.defaultLeverage) {
      return;
    }
    if (val < 0 && currentLeverage + val < 1) {
      return;
    }
    const newLeverage = currentLeverage + val;
    this.tradeForm.get('leverage')?.setValue(newLeverage, { emitEvent: false });
  }

  close(): void {
    this.dialogRef?.close();
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

  private createTradeForm(): void {
    const sym = this.chartService.selectedSymbol();
    this.tradeForm = this.fb.group({
      orderType: [OrderTypeEnum.LIMIT, [Validators.required]],
      symbol: [sym, [Validators.required]],
      leverage: [this.defaultLeverage, [Validators.required]],
      amount: [this.defaultAmount, [Validators.required, Validators.min(5)]],
      price: [null, Validators.required],
      hasTPSL: [true],
      takeProfit: [null],
      stopLoss: [null],
    });
  }

  private fetchLeverageBracket(): void {
    this.userService
      .getLeverageBracket()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const sym = this.chartService.selectedSymbol();
          const bracket = res.find(
            (bracket: LeverageBracket) => bracket.symbol.toLowerCase() === sym.toLowerCase(),
          );
          if (bracket) {
            this.leverageBracket.set(bracket);
          }
        },
        error: (err) => console.error(err),
      });
  }
}
