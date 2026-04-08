import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

// Models
import { FuturePosition, OrderSideEnum, OrderTypeEnum } from '../../../core/models/trades.model';

// Services
import { UtilsService } from '../../../core/services/utils.service';

// PrimeNG Modules
import { SliderModule } from 'primeng/slider';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { RadioButtonModule } from 'primeng/radiobutton';
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
    RadioButtonModule,
    ButtonModule,
  ],
  templateUrl: './tp-sl-dialog.html',
  styleUrl: './tp-sl-dialog.scss',
})
export class TpSlDialogComponent implements OnInit {
  private utilsService = inject(UtilsService);
  private config = inject(DynamicDialogConfig);
  private dialogRef = inject(DynamicDialogRef);

  private readonly defaultPntStr = '$0.00';
  private readonly defaultPntPercent = 50;

  OrderTypeEnum = OrderTypeEnum;
  tpslData: FuturePosition | null = null;
  riskDialogSymbol = '';
  riskDialogPrice: number | null = null;
  riskDialogType: OrderTypeEnum = OrderTypeEnum.STOP_MARKET;
  riskDialogSide: OrderSideEnum = OrderSideEnum.BUY;
  riskDialogPercent: number = this.defaultPntPercent;
  riskDialogEntryPrice: number = 0;
  riskDialogPositionAmt: number = 0;
  riskDialogLeverage: number = 1;
  riskDialogEstimatedPnLStr: string = this.defaultPntStr;

  ngOnInit(): void {
    this.tpslData = this.config.data;
    this.riskDialogSymbol = this.tpslData?.symbol.toUpperCase() || '';
    this.riskDialogType = this.config.data?.type || OrderTypeEnum.STOP_MARKET;
    this.riskDialogEntryPrice = parseFloat(this.tpslData?.entryPrice as string);
    this.riskDialogPositionAmt = parseFloat(this.tpslData?.positionAmt as string);
    this.riskDialogLeverage = this.tpslData?.leverage || 0;
    this.riskDialogSide =
      this.config.data?.type === OrderTypeEnum.STOP_MARKET ? OrderSideEnum.SELL : OrderSideEnum.BUY;

    const stoploss = parseFloat(this.tpslData?.stopLoss as string) || 0;
    const takeprofit = parseFloat(this.tpslData?.takeProfit as string) || 0;

    if (this.isOrderSell()) {
      this.riskDialogPrice = stoploss || null;
      this.riskDialogPercent = this.tpslData?.stopLossPnlPercent || this.defaultPntPercent;
      this.riskDialogEstimatedPnLStr = this.tpslData?.stopLossPnl || this.defaultPntStr;
    } else {
      this.riskDialogPrice = takeprofit || null;
      this.riskDialogPercent = this.tpslData?.takeProfitPnlPercent || this.defaultPntPercent;
      this.riskDialogEstimatedPnLStr = this.tpslData?.takeProfitPnl || this.defaultPntStr;
    }

    if (!this.riskDialogPrice) {
      this.updatePriceFromPercent();
    }
  }

  updatePriceFromPercent(): void {
    const entryPrice = this.riskDialogEntryPrice;
    const leverage = this.riskDialogLeverage;
    const amount = this.riskDialogPositionAmt;

    const roePercent =
      this.riskDialogType === OrderTypeEnum.STOP_MARKET
        ? -Math.abs(this.riskDialogPercent)
        : Math.abs(this.riskDialogPercent);

    const targetPrice = this.utilsService.calculateTargetPrice(
      entryPrice,
      leverage,
      roePercent,
      amount > 0,
    );

    // Safety check for absolute 0
    this.riskDialogPrice = Math.max(Number(targetPrice.toFixed(2)), 0);

    const { pnlStr, pnlPercent } = this.utilsService.calculateEstimatedPnL(
      entryPrice,
      this.riskDialogPrice,
      amount,
      leverage,
    );

    this.riskDialogEstimatedPnLStr = pnlStr;
    this.riskDialogPercent = pnlPercent || this.defaultPntPercent;
  }

  updateFromPrice(): void {
    if (!this.riskDialogPrice) {
      this.riskDialogEstimatedPnLStr = this.defaultPntStr;
      this.riskDialogPercent = 0;
      return;
    }

    const price = this.riskDialogPrice;
    const entryPrice = this.riskDialogEntryPrice;
    const leverage = this.riskDialogLeverage;
    const amount = this.riskDialogPositionAmt;

    const { pnlStr, pnlPercent } = this.utilsService.calculateEstimatedPnL(
      entryPrice,
      price,
      amount,
      leverage,
    );
    this.riskDialogEstimatedPnLStr = pnlStr;
    this.riskDialogPercent = pnlPercent || this.defaultPntPercent;
  }

  confirmOrder(): void {
    if (!this.riskDialogPrice) return;

    const payload = {
      side: this.riskDialogSide,
      triggerPrice: this.riskDialogPrice,
      type: this.riskDialogType,
      isRemove: false,
    };

    this.dialogRef.close(payload);
  }

  removeOrder(): void {
    this.dialogRef.close({
      isRemove: true,
    });
  }

  isOrderSell(): boolean {
    return this.riskDialogSide === OrderSideEnum.SELL;
  }

  isStopLoss(): boolean {
    return this.riskDialogType === OrderTypeEnum.STOP_MARKET;
  }

  hasTpSl(): boolean {
    return !!(
      this.tpslData?.margin &&
      ((this.tpslData?.stopLoss && this.riskDialogType === OrderTypeEnum.STOP_MARKET) ||
        (this.tpslData?.takeProfit && this.riskDialogType === OrderTypeEnum.TAKE_PROFIT_MARKET))
    );
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
