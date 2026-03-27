import { Component } from '@angular/core';

import { SplitButtonModule } from 'primeng/splitbutton';
@Component({
  selector: 'app-header',
  imports: [SplitButtonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  items = [
    {
      label: 'Binance',
      command: () => {this.connectWallet()},
    },
  ];

  connectWallet(): void {
    console.log('Connect Wallet button clicked');
  }
}
