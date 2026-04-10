import { Component } from '@angular/core';

// Components
import { HeaderComponent } from '../../commons/header/header.component';
import { TradesTerminalComponent } from '../../components/trades-terminal/trades-terminal';
import { MiniInfoComponent } from '../../components/mini-info/mini-info';
import { PositionsAndOrdersComponent } from '../../components/positions-and-orders/positions-and-orders.component';
import { TradingChartComponent } from '../../components/trading-chart/trading-chart';

@Component({
  selector: 'app-dashboard',
  imports: [HeaderComponent, TradesTerminalComponent, MiniInfoComponent, PositionsAndOrdersComponent, TradingChartComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  standalone: true,
})
export class DashboardComponent {}
