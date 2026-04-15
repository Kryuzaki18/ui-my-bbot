import { Component } from '@angular/core';

// Components
import { TradingChartComponent } from '../../components/trading-chart/trading-chart.component';

@Component({
  selector: 'app-home',
  imports: [TradingChartComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  standalone: true,
})
export class HomeComponent {}
