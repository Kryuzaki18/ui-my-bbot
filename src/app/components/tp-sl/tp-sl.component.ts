import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DecimalPipe, NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Models
import { FuturePosition, OrderSideEnum, OrderTypeEnum } from '../../core/models/trades.model';

// Services
import { UtilsService } from '../../core/services/utils.service';
import { BinanceRestService } from '../../core/services/binance-rest.service';

// PrimeNG Modules
import { SliderModule } from 'primeng/slider';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-tp-sl-dialog',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    NgClass,
    SliderModule,
    FloatLabelModule,
    InputNumberModule,
    ButtonModule,
    DecimalPipe,
  ],
  templateUrl: './tp-sl.component.html',
  styleUrl: './tp-sl.component.scss',
})
export class TpSlComponent implements OnInit {
  private config = inject(DynamicDialogConfig);
  private dialogRef = inject(DynamicDialogRef);
  private readonly utilsService = inject(UtilsService);
  private readonly binanceRestService = inject(BinanceRestService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly defaultPntStr: string = '$0.00';
  private tpslData!: FuturePosition;

  tickSize = signal<number>(0);
  symbol = '';
  price!: number;
  type: OrderTypeEnum = OrderTypeEnum.STOP_MARKET;
  side: OrderSideEnum = OrderSideEnum.BUY;
  percent: number = 50;
  entryPrice: number = 0;
  positionAmt: number = 0;
  estPnl: string = this.defaultPntStr;
  margin: number = 0;
  leverage: number = 1;

  ngOnInit(): void {
    this.tpslData = this.config.data;

    this.binanceRestService.exchangeInfo$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        const exchangeSymbol = res.symbols.find(
          (s) => s.symbol.toLowerCase() === this.tpslData.symbol.toLowerCase(),
        );
        const tickSize = this.utilsService.getTickSize(exchangeSymbol?.filters);
        this.tickSize.set(tickSize);
      });

    this.margin = parseFloat(this.tpslData?.margin.toFixed(2));
    this.leverage = this.tpslData?.leverage;
    this.symbol = this.tpslData?.symbol;
    this.type = this.config.data?.type;
    this.entryPrice = parseFloat(this.tpslData?.entryPrice);
    this.positionAmt = parseFloat(this.tpslData?.positionAmt);
    this.side = this.config.data?.notional > 0 ? OrderSideEnum.BUY : OrderSideEnum.SELL;

    if (this.isStopLoss()) {
      if (this.tpslData?.stopLoss?.pnlPercent !== null) {
        this.price = parseFloat(this.tpslData?.stopLoss?.triggerPrice as string);
        this.percent = Math.round(Math.abs(this.tpslData?.stopLoss?.pnlPercent ?? 0));
      }
    } else {
      if (this.tpslData?.takeProfit?.pnlPercent !== null) {
        this.price = parseFloat(this.tpslData?.takeProfit?.triggerPrice as string);
        this.percent = Math.round(Math.abs(this.tpslData?.takeProfit?.pnlPercent ?? 0));
      }
    }

    this.updateFromPrice();
  }

  updatePriceFromPercent(percent: number): void {
    const entryPrice = this.entryPrice;
    const leverage = this.leverage;
    const amount = this.positionAmt;
    this.percent = percent;

    const targetPrice = this.utilsService.calculateTargetPrice(
      entryPrice,
      leverage,
      percent,
      amount > 0,
      this.isStopLoss() ? false : true,
      this.tickSize(),
    );

    this.price = targetPrice;

    const pnl = (this.price - entryPrice) * amount;
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

    this.estPnl = formatter.format(Math.abs(pnl));
  }

  updatePercentage(isAdd: boolean): void {
    if (this.percent >= 999 && isAdd) return;
    if (this.percent <= 1 && !isAdd) return;

    this.percent = isAdd ? this.percent + 1 : this.percent - 1;
    this.updatePriceFromPercent(this.percent);
  }

  updateFromPrice(): void {
    if (!this.isValidTriggerPrice()) {
      this.estPnl = this.defaultPntStr;
      this.percent = 0;
      return;
    }

    const price = this.price;
    const entryPrice = this.entryPrice;
    const leverage = this.leverage;
    const amount = this.positionAmt;

    const { pnlStr, pnlPercent } = this.utilsService.calculateEstimatedPnL(
      entryPrice,
      price,
      amount,
      leverage,
      this.tickSize(),
    );

    this.estPnl = pnlStr;
    this.percent = pnlPercent;
  }

  // Long Stop Loss: Must be below entry price.
  // Long Take Profit: Must be above entry price.
  // Short Stop Loss: Must be above entry price.
  // Short Take Profit: Must be below entry price.
  isValidTriggerPrice(): boolean {
    if (this.percent <= 0) return false;

    const entry = Number(this.entryPrice);
    const trigger = Number(this.price);

    if (this.isStopLoss()) {
      // Long SL must be < Entry | Short SL must be > Entry
      if (this.isOrderLong()) {
        return trigger < entry;
      } else {
        return trigger > entry;
      }
    }

    // Long TP must be > Entry | Short TP must be < Entry
    if (this.isOrderLong()) {
      return trigger > entry;
    } else {
      return trigger < entry;
    }
  }

  confirmOrder(): void {
    if (!this.isValidTriggerPrice()) return;

    const payload = {
      side: this.side,
      triggerPrice: this.price,
      type: this.type,
      isRemove: false,
    };

    this.dialogRef.close(payload);
  }

  removeOrder(): void {
    this.dialogRef.close({
      isRemove: true,
    });
  }

  isOrderLong(): boolean {
    return this.config.data?.notional > 0;
  }

  isStopLoss(): boolean {
    return this.type === OrderTypeEnum.STOP_MARKET;
  }

  hasTpSl(): boolean {
    return !!(
      this.tpslData?.margin &&
      ((this.tpslData?.stopLoss?.triggerPrice && this.isStopLoss()) ||
        (this.tpslData?.takeProfit?.triggerPrice && !this.isStopLoss()))
    );
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
