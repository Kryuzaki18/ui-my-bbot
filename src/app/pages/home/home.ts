import { Component } from '@angular/core';

// Commons
import { Header } from '../../commons/header/header';
import { TradingChartComponent } from '../../components/trading-chart/trading-chart';

@Component({
  selector: 'app-home',
  imports: [Header, TradingChartComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  standalone: true,
})
export class HomeComponent {}
