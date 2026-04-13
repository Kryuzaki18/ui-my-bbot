import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class ToastMessageService {
  constructor(private messageService: MessageService) {}

  success(summary: string = 'Success', detail?: string): void {
    this.messageService.add({ key: 'toaster', severity: 'success', summary, detail });
  }

  error(summary: string = 'Error', detail?: string): void {
    this.messageService.add({ key: 'toaster', severity: 'error', summary, detail });
  }

  info(summary: string = 'Info', detail?: string): void {
    this.messageService.add({ key: 'toaster', severity: 'info', summary, detail });
  }

  warn(summary: string = 'Warning', detail?: string): void {
    this.messageService.add({ key: 'toaster', severity: 'warn', summary, detail });
  }

  contrast(summary: string = 'Info', detail?: string): void {
    this.messageService.add({ key: 'toaster', severity: 'contrast', summary, detail });
  }

  secondary(summary: string = 'Warning', detail?: string): void {
    this.messageService.add({ key: 'toaster', severity: 'secondary', summary, detail });
  }

  clear(): void {
    this.messageService.clear();
  }
}
