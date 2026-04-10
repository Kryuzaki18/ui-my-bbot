import { Component } from '@angular/core';

// Commons
import { HeaderComponent } from '../../commons/header/header.component';
import { TradingChartComponent } from '../../components/trading-chart/trading-chart';

@Component({
  selector: 'app-home',
  imports: [HeaderComponent, TradingChartComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  standalone: true,
})
export class HomeComponent {}
