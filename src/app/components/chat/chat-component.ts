import { Component, DestroyRef, inject } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop'; // Import this
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services
import { AIService } from '../../core/services/ai.service';

// Models
import { AIResponse, ChatResponse } from '../../core/models/ai.model';

// PrimeNG Modules
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { ChartService } from '../../core/services/chart/chart.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chart.component.html',
  imports: [
    DragDropModule,
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    ScrollPanelModule,
  ],
  standalone: true,
})
export class ChatComponent {
  private readonly aiService = inject(AIService);
  private readonly chartService = inject(ChartService);
  private readonly destroyRef = inject(DestroyRef);

  get selectedSymbol() {
    return this.chartService.selectedSymbol();
  }

  get selectedTimeframe() {
    return this.chartService.selectedTimeframe();
  }

  chatOpen: boolean = false;
  isLoading: boolean = false;
  message: string = '';
  conversation: ChatResponse[] = [];

  ngOnInit(): void {
    this.conversation.push({
      sender: 'bot',
      message: 'Hi! 👋 Thanks for reaching out. How can I help you with your trades today?',
      timestamp: new Date().toLocaleTimeString(),
      isSuggestion: false,
      isError: false,
    });

    this.conversation.push({
      sender: 'bot',
      message: 'Analyze now',
      timestamp: new Date().toLocaleTimeString(),
      isSuggestion: true,
      isError: false,
    });

    // this.conversation.push({ sender: 'user', message: 'I\'m looking for the futures market dashboard.', timestamp: new Date().toLocaleTimeString(), isSuggestion: false, isError: false });
    // this.conversation.push({ sender: 'bot', message: 'Here is the futures market dashboard:', timestamp: new Date().toLocaleTimeString(), isSuggestion: false, isError: false });
    // this.conversation.push({ sender: 'bot', message: '<a href="https://www.tradingview.com/symbols/ES-mini/overview/" target="_blank">https://www.tradingview.com/symbols/ES-mini/overview/</a>', timestamp: new Date().toLocaleTimeString(), isSuggestion: false, isError: false });
    // this.conversation.push({ sender: 'user', message: 'What is the current price of ES-mini?', timestamp: new Date().toLocaleTimeString(), isSuggestion: false, isError: false });
    // this.conversation.push({ sender: 'bot', message: 'The current price of ES-mini is 5200.', timestamp: new Date().toLocaleTimeString(), isSuggestion: false, isError: false });
    // this.conversation.push({ sender: 'bot', message: 'Something went wrong. Please try again.', timestamp: new Date().toLocaleTimeString(), isSuggestion: false, isError: true });
  }

  analyze(): void {
    const analyzeMessage = `${this.selectedSymbol}@${this.selectedTimeframe}`;
    this.generateResponse(analyzeMessage);
  }

  chatBot(): void {
    if (!this.message || this.message.length < 3) return;

    this.conversation.push({
      sender: 'user',
      message: this.message,
      timestamp: new Date().toLocaleTimeString(),
      isSuggestion: false,
      isError: false,
    });

    this.generateResponse(this.message);
  }

  generateResponse(message: string) {
    this.isLoading = true;

    this.aiService
      .chatBot(message)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: AIResponse) => {
          if (res.status === 'accepted') {
            if (res.data) {
              this.conversation.push({
                sender: 'bot',
                message: res.message,
                timestamp: new Date().toLocaleTimeString(),
                isSuggestion: false,
                isError: false,
                response: res,
              });
            } else {
              this.conversation.push({
                sender: 'bot',
                message: res.message,
                timestamp: new Date().toLocaleTimeString(),
                isSuggestion: false,
                isError: false,
              });
            }
          } else {
            this.conversation.push({
              sender: 'bot',
              message: res.message,
              timestamp: new Date().toLocaleTimeString(),
              isSuggestion: false,
              isError: true,
            });
          }

          this.message = '';
          this.isLoading = false;
        },

        error: (err: AIResponse) => {
          this.message = '';
          this.conversation.push({
            sender: 'bot',
            message: 'Something went wrong. Please try again.',
            timestamp: new Date().toLocaleTimeString(),
            isSuggestion: false,
            isError: true,
          });
          console.log(err);
          this.isLoading = false;
        },
      });
  }
}
