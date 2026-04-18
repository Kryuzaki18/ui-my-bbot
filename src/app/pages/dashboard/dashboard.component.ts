import { Component, inject } from '@angular/core';

// Services
import { UserWsService } from '../../core/services/user-ws.service';

// Components
import { TradeFormComponent } from '../../components/trade-form/trades-form.component';
import { AccountBalanceComponent } from '../../components/account-balance/account-balance.component';
import { PositionsAndOrdersComponent } from '../../components/positions-and-orders/positions-and-orders.component';
import { TradingChartComponent } from '../../components/trading-chart/trading-chart.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    TradeFormComponent,
    AccountBalanceComponent,
    PositionsAndOrdersComponent,
    TradingChartComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  standalone: true,
})
export class DashboardComponent {
  private userWsService = inject(UserWsService);

  constructor() {
    this.userWsService.startUserDataStream();
  }
}
