import { Component } from '@angular/core';

// Components
import { Header } from '../../commons/header/header';
import { TradesTerminalComponent } from '../../components/trades-terminal/trades-terminal';
import { MiniInfoComponent } from '../../components/mini-info/mini-info';
import { OpenOrders } from '../../components/open-orders/open-orders';
import { TradingChartComponent } from '../../components/trading-chart/trading-chart';

@Component({
  selector: 'app-dashboard',
  imports: [Header, TradesTerminalComponent, MiniInfoComponent, OpenOrders, TradingChartComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  standalone: true,
})
export class DashboardComponent {}
