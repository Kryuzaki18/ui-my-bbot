import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

// Models
import { FuturePosition, OrderSideEnum, OrderTypeEnum } from '../../core/models/trades.model';

// Services
import { UtilsService } from '../../core/services/utils.service';

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
  templateUrl: './tp-sl.component.html',
  styleUrl: './tp-sl.component.scss',
})
export class TpSlComponent implements OnInit {
  private readonly utilsService = inject(UtilsService);
  private config = inject(DynamicDialogConfig);
  private dialogRef = inject(DynamicDialogRef);

  private readonly defaultPntStr: string = '$0.00';
  private tpslData!: FuturePosition;

  riskDialogSymbol = '';
  riskDialogPrice!: number;
  riskDialogType: OrderTypeEnum = OrderTypeEnum.STOP_MARKET;
  riskDialogSide: OrderSideEnum = OrderSideEnum.BUY;
  riskDialogPercent!: number;
  riskDialogEntryPrice: number = 0;
  riskDialogPositionAmt: number = 0;
  riskDialogLeverage: number = 1;
  riskDialogEstimatedPnLStr: string = this.defaultPntStr;

  ngOnInit(): void {
    this.tpslData = this.config.data;
    this.riskDialogSymbol = this.tpslData?.symbol;
    this.riskDialogType = this.config.data?.type;
    this.riskDialogEntryPrice = parseFloat(this.tpslData?.entryPrice);
    this.riskDialogPositionAmt = parseFloat(this.tpslData?.positionAmt);
    this.riskDialogLeverage = this.tpslData?.leverage;
    this.riskDialogSide =
      this.config.data?.type === OrderTypeEnum.STOP_MARKET ? OrderSideEnum.SELL : OrderSideEnum.BUY;

    if (this.isStopLoss()) {
      if (this.tpslData?.stopLoss?.pnlPercent !== null) {
        this.riskDialogPrice = parseFloat(this.tpslData?.stopLoss?.triggerPrice as string);
        this.riskDialogPercent = Math.round(Math.abs(this.tpslData?.stopLoss?.pnlPercent ?? 0));
      } else {
        this.riskDialogPercent = 50;
      }
    } else {
      if (this.tpslData?.takeProfit?.pnlPercent !== null) {
        this.riskDialogPrice = parseFloat(this.tpslData?.takeProfit?.triggerPrice as string);
        this.riskDialogPercent = Math.round(Math.abs(this.tpslData?.takeProfit?.pnlPercent ?? 0));
      } else {
        this.riskDialogPercent = 50;
      }
    }

    this.updatePriceFromPercent();
  }

  updatePriceFromPercent(): void {
    const entryPrice = this.riskDialogEntryPrice;
    const leverage = this.riskDialogLeverage;
    const amount = this.riskDialogPositionAmt;

    const roePercent = this.isStopLoss()
      ? -Math.abs(this.riskDialogPercent)
      : Math.abs(this.riskDialogPercent);

    const targetPrice = this.utilsService.calculateTargetPrice(
      entryPrice,
      leverage,
      roePercent,
      amount > 0,
    );

    this.riskDialogPrice = Math.max(Number(targetPrice.toFixed(2)), 0);

    const { pnlStr, pnlPercent } = this.utilsService.calculateEstimatedPnL(
      entryPrice,
      this.riskDialogPrice,
      amount,
      leverage,
    );

    this.riskDialogEstimatedPnLStr = pnlStr;
    this.riskDialogPercent = pnlPercent || 0;
  }

  updatePercentage(isAdd: boolean): void {
    this.riskDialogPercent = isAdd ? this.riskDialogPercent + 1 : this.riskDialogPercent - 1;
    this.updatePriceFromPercent();
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
    this.riskDialogPercent = pnlPercent || 0;
  }

  isValidTriggerPrice(): boolean {
    if (!this.riskDialogPrice) return false;

    if (this.isStopLoss()) {
      if (this.isOrderSell() && this.riskDialogEntryPrice <= Number(this.riskDialogPrice)) {
        return false;
      }

      if (!this.isOrderSell() && this.riskDialogEntryPrice >= Number(this.riskDialogPrice)) {
        return false;
      }
    } else {
      if (this.isOrderSell() && this.riskDialogEntryPrice <= Number(this.riskDialogPrice)) {
        return false;
      }

      if (!this.isOrderSell() && this.riskDialogEntryPrice >= Number(this.riskDialogPrice)) {
        return false;
      }
    }

    return true;
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
      ((this.tpslData?.stopLoss?.triggerPrice && this.isStopLoss()) ||
        (this.tpslData?.takeProfit?.triggerPrice && !this.isStopLoss()))
    );
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
