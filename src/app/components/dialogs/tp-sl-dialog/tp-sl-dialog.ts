import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

// Models
import { FuturePosition, OrderSideEnum, OrderTypeEnum } from '../../../core/models/trades.model';

// Services
import { FutureTradeService } from '../../../core/services/future-trade.service';
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
export class TpSlDialog implements OnInit {
  private utilsService = inject(UtilsService);
  private futureTradeService = inject(FutureTradeService);
  private config = inject(DynamicDialogConfig);
  private ref = inject(DynamicDialogRef);

  private readonly defaultPntStr = '$0.00';
  private readonly defaultPntPercent = 50;

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
      this.riskDialogEstimatedPnLStr   = this.tpslData?.stopLossPnl || this.defaultPntStr;
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
    const sign = amount > 0 ? 1 : -1;

    const roePercent =
      this.riskDialogType === OrderTypeEnum.STOP_MARKET
        ? -Math.abs(this.riskDialogPercent)
        : Math.abs(this.riskDialogPercent);
    const roeFraction = roePercent / 100;

    // Target Price = Entry + ROE * (Entry / Leverage) * sign
    const targetPrice = entryPrice + roeFraction * (entryPrice / leverage) * sign;

    // Safety check for absolute 0
    this.riskDialogPrice = Math.max(Number(targetPrice.toFixed(5)), 0);

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
      symbol: this.tpslData?.symbol.toUpperCase(),
      side: this.riskDialogSide,
      stopPrice: this.riskDialogPrice,
      closePosition: true,
    };

    this.ref.close(payload);
  }

  isOrderSell(): boolean {
    return this.riskDialogSide === OrderSideEnum.SELL;
  }

  closeDialog(): void {
    this.ref.close();
  }
}
