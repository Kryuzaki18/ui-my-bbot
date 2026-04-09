import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

// PrimeNG Modules
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ScrollPanelModule } from 'primeng/scrollpanel';

@Component({
  selector: 'app-root',
  imports: [RouterModule, ConfirmDialogModule, ToastModule, ScrollPanelModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
}
