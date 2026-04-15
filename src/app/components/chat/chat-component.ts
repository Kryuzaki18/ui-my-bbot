import { Component } from "@angular/core";
import { DragDropModule } from '@angular/cdk/drag-drop'; // Import this
import { CommonModule } from '@angular/common';

// PrimeNG Modules
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-chat',
    templateUrl: './chart.component.html',
    imports: [DragDropModule, CommonModule, InputTextModule, ButtonModule],
    standalone: true
})
export class ChatComponent {
    chatOpen: boolean = false;
}