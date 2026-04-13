import { Component } from '@angular/core';

// Components
import { HeaderComponent } from '../../commons/header/header.component';
import { TradingChartComponent } from '../../components/trading-chart/trading-chart.component';

@Component({
  selector: 'app-home',
  imports: [HeaderComponent, TradingChartComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  standalone: true,
})
export class HomeComponent {}
