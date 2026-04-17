import { Component, DestroyRef, inject, signal, ViewChild } from '@angular/core';
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
import { ScrollPanel, ScrollPanelModule } from 'primeng/scrollpanel';
import { ChartService } from '../../core/services/chart/chart.service';
import { OrderSideEnum } from '../../core/models/trades.model';

@Component({
  selector: 'app-chat',
  templateUrl: './chart.component.html',
  styleUrl: './chat.component.scss',
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
  @ViewChild('chatScrollPanel') chatScrollPanel!: ScrollPanel;

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
  isAnalyzing: boolean = false;
  message: string = '';
  conversation: ChatResponse[] = [
    {
      sender: 'bot',
      message: 'Hi! 👋 Thanks for reaching out. How can I help you with your trades today?',
      timestamp: new Date().toLocaleTimeString(),
      isError: false,
    },
  ];

  ngOnInit(): void {
    // this.sampleConversation();
  }

  sampleConversation(): void {
    const convo = [
      {
        sender: 'user',
        message: 'What is the current price of BTC?',
        timestamp: new Date().toLocaleTimeString(),
        isError: false,
      },
      {
        sender: 'bot',
        message: 'The current price of BTC is 100000.',
        timestamp: new Date().toLocaleTimeString(),
        isError: false,
      },
      {
        sender: 'user',
        message: 'What is the current price of ETH',
        timestamp: new Date().toLocaleTimeString(),
        isSuggestion: false,
        isError: false,
      },
      {
        sender: 'bot',
        message: 'The current price of ETH is 3000.',
        timestamp: new Date().toLocaleTimeString(),
        isError: false,
      },
      {
        sender: 'user',
        message: 'Any coming event that affects BTC?',
        timestamp: new Date().toLocaleTimeString(),
        isError: false,
      },
      {
        sender: 'bot',
        message:
          'Yes, there is an event coming up that may affect BTC. It is a news event that is scheduled to happen in 2 hours.',
        timestamp: new Date().toLocaleTimeString(),
        isError: false,
      },
      {
        sender: 'bot',
        message: '',
        timestamp: new Date().toLocaleTimeString(),
        isError: false,
        response: {
          data: {
            status: 'accepted',
            message:
              'The BTC is currently at 100000 and it is expected to go up by 10% in the next 2 hours.',
            signal: {
              type: OrderSideEnum.BUY,
              probability: '10%',
              entryZone: '100000-110000',
              sl: 100000,
              tp: 110000,
              leverage: 10,
              reasoning:
                'The BTC is currently at 100000 and it is expected to go up by 10% in the next 2 hours.',
            },
            buy: [
              {
                indicators: ['RSI', 'MACD'],
                pattern: ['Bullish Engulfing'],
                entry: 100000,
                sl: 100000,
                tp: 110000,
                leverage: 10,
              },
            ],
            sell: [
              {
                indicators: ['RSI', 'MACD'],
                pattern: ['Bullish Engulfing'],
                entry: 100000,
                sl: 100000,
                tp: 110000,
                leverage: 10,
              },
            ],
          },
          status: 'accepted',
          message:
            'The BTC is currently at 100000 and it is expected to go up by 10% in the next 2 hours.',
        },
      },
    ];
    this.conversation.push(...convo);
    // this.conversation.push({
    //   sender: 'bot',
    //   message: 'Something went wrong. Please try again.',
    //   timestamp: new Date().toLocaleTimeString(),
    //   isError: true,
    // });

    this.reset();
  }

  openChat(): void {
    this.chatOpen = !this.chatOpen;
    this.scrollToBottom();
  }

  analyze(): void {
    this.isAnalyzing = true;

    this.aiService
      .analyzeMarket(this.selectedSymbol, this.selectedTimeframe)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: AIResponse) => {
          if (res.status === 'accepted') {
            this.conversation.push({
              sender: 'bot',
              message: res.message,
              timestamp: new Date().toLocaleTimeString(),
              isError: false,
              response: res,
            });
          } else {
            this.conversation.push({
              sender: 'bot',
              message: res.message,
              timestamp: new Date().toLocaleTimeString(),
              isError: true,
            });
          }

          this.message = '';
          this.isLoading = false;
          this.isAnalyzing = false;
          this.scrollToBottom();
        },

        error: (err: any) => {
          this.message = '';
          this.conversation.push({
            sender: 'bot',
            message: 'Something went wrong. Please try again.',
            timestamp: new Date().toLocaleTimeString(),
            isError: true,
          });
          console.error(err);
          this.isLoading = false;
          this.isAnalyzing = false;
          this.scrollToBottom();
        },
      });
  }

  chatBot(): void {
    if (!this.message || this.message.length < 3) return;
    this.isLoading = true;

    this.conversation.push({
      sender: 'user',
      message: this.message,
      timestamp: new Date().toLocaleTimeString(),
      isError: false,
    });

    this.message = '';
    this.scrollToBottom();

    this.aiService
      .chatBot(this.message)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: AIResponse) => {
          if (res.status === 'accepted') {
            this.conversation.push({
              sender: 'bot',
              message: res.message,
              timestamp: new Date().toLocaleTimeString(),
              isError: false,
            });
          } else {
            this.conversation.push({
              sender: 'bot',
              message: res.message,
              timestamp: new Date().toLocaleTimeString(),
              isError: true,
            });
          }

          this.reset();
        },

        error: (err: any) => {
          this.conversation.push({
            sender: 'bot',
            message: 'Something went wrong. Please try again.',
            timestamp: new Date().toLocaleTimeString(),
            isError: true,
          });
          console.error(err);
          this.reset();
        },
      });
  }

  reset(): void {
    this.message = '';
    this.isLoading = false;
    this.isAnalyzing = false;
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatScrollPanel) {
        const container = this.chatScrollPanel?.contentViewChild?.nativeElement;
        container.scrollTop = container.scrollHeight;
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 1000);
  }
}
