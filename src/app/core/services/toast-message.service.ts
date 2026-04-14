import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class ToastMessageService {
  constructor(private messageService: MessageService) {}

  success(summary: string = 'Success', detail?: string): void {
    this.messageService.add({ key: 'toaster', severity: 'success', summary, detail, life: 3000 });
  }

  error(summary: string = 'Error', detail?: string): void {
    this.messageService.add({ key: 'toaster', severity: 'error', summary, detail, life: 3000 });
  }

  info(summary: string = 'Info', detail?: string): void {
    this.messageService.add({ key: 'toaster', severity: 'info', summary, detail, life: 3000 });
  }

  warn(summary: string = 'Warning', detail?: string): void {
    this.messageService.add({ key: 'toaster', severity: 'warn', summary, detail, life: 3000 });
  }

  contrast(summary: string = 'Info', detail?: string): void {
    this.messageService.add({ key: 'toaster', severity: 'contrast', summary, detail, life: 3000 });
  }

  secondary(summary: string = 'Warning', detail?: string): void {
    this.messageService.add({ key: 'toaster', severity: 'secondary', summary, detail, life: 3000 });
  }

  clear(): void {
    this.messageService.clear('toaster');
  }
}
