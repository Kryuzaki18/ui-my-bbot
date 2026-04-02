import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

// PrimeNG Modules
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  imports: [RouterModule, ConfirmDialogModule, ToastModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
}
