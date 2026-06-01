import { Component, DestroyRef, inject, signal, ViewChild } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services
import { AIService } from '../../core/services/ai.service';
import { ChartService } from '../../core/services/chart/chart.service';

// Models
import { AIResponse, ChatResponse } from '../../core/models/ai.model';
import { OrderSideEnum } from '../../core/models/trades.model';

// PrimeNG Modules
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ScrollPanel, ScrollPanelModule } from 'primeng/scrollpanel';
import { TabsModule } from 'primeng/tabs';

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
    TabsModule,
  ],
  standalone: true,
})
export class ChatComponent {
  @ViewChild('chatScrollPanel') chatScrollPanel!: ScrollPanel;
  @ViewChild('analyzeScrollPanel') analyzeScrollPanel!: ScrollPanel;

  private readonly aiService = inject(AIService);
  private readonly chartService = inject(ChartService);
  private readonly destroyRef = inject(DestroyRef);

  get selectedSymbol() {
    return this.chartService.selectedSymbol();
  }

  get selectedTimeframe() {
    return this.chartService.selectedTimeframe();
  }

  chatOpen = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isAnalyzing = signal<boolean>(false);
  chatTabIndex: number = 0;
  message: string = '';
  conversation: ChatResponse[] = [
    {
      sender: 'bot',
      message: 'Hi! 👋 Thanks for reaching out. How can I help you?',
      timestamp: new Date().toLocaleTimeString(),
      isError: false,
    },
  ];

  analyzeSignals: AIResponse[] = [];

  ngOnInit(): void {
    // this.sampleConversation();
    // this.sampleSignals();
  }

  sampleSignals(): void {
    this.analyzeSignals = [
      {
        status: 'accepted',
        message:
          'BTCUSDT exhibits strong bullish momentum on the daily timeframe, maintaining price discovery above the $75,000 threshold. The 15m timeframe shows an impulsive expansion to $76,350 followed by a healthy corrective consolidation. Market structure remains bullish as price forms higher lows above previous resistance turned support. Confluence is established through the 20-period EMA providing dynamic support and the RSI cooling from overbought levels, suggesting a trend continuation. Key liquidity resides at $75,400. A break above $76,350 targets Fibonacci extension levels near $77,500.',
        timestamp: new Date().toLocaleTimeString(),
        response: {
          indicators: ['EMA 50', 'RSI'],
          pattern: ['Bullish Flag'],
          type: OrderSideEnum.BUY,
          entryZone: [75500, 75700],
          sl: 74950,
          tp: 77200,
          leverage: 35,
          riskReward: 2.46,
          reasoning:
            'Strong bullish expansion past $76k followed by high-volume consolidation. Retest of the breakout zone coincides with the 15m 50-EMA and structural support. Confidence is high due to the alignment of daily and intraday trends.',
          confidence: {
            score: 86,
            components: {
              trend: 92,
              momentum: 85,
              volume: 80,
              structure: 88,
            },
          },
        },
      },
      {
        status: 'accepted',
        message:
          'BTCUSDT exhibits strong bullish momentum on the daily timeframe, maintaining price discovery above the $75,000 threshold. The 15m timeframe shows an impulsive expansion to $76,350 followed by a healthy corrective consolidation. Market structure remains bullish as price forms higher lows above previous resistance turned support. Confluence is established through the 20-period EMA providing dynamic support and the RSI cooling from overbought levels, suggesting a trend continuation. Key liquidity resides at $75,400. A break above $76,350 targets Fibonacci extension levels near $77,500.',
        timestamp: new Date().toLocaleTimeString(),
        response: {
          indicators: ['EMA 50', 'RSI'],
          pattern: ['Bullish Flag'],
          type: OrderSideEnum.BUY,
          entryZone: [75500, 75700],
          sl: 74950,
          tp: 77200,
          leverage: 35,
          riskReward: 2.46,
          reasoning:
            'Strong bullish expansion past $76k followed by high-volume consolidation. Retest of the breakout zone coincides with the 15m 50-EMA and structural support. Confidence is high due to the alignment of daily and intraday trends.',
          confidence: {
            score: 86,
            components: {
              trend: 92,
              momentum: 85,
              volume: 80,
              structure: 88,
            },
          },
        },
      },
      {
        status: 'accepted',
        message:
          'BTCUSDT exhibits strong bullish momentum on the daily timeframe, maintaining price discovery above the $75,000 threshold. The 15m timeframe shows an impulsive expansion to $76,350 followed by a healthy corrective consolidation. Market structure remains bullish as price forms higher lows above previous resistance turned support. Confluence is established through the 20-period EMA providing dynamic support and the RSI cooling from overbought levels, suggesting a trend continuation. Key liquidity resides at $75,400. A break above $76,350 targets Fibonacci extension levels near $77,500.',
        timestamp: new Date().toLocaleTimeString(),
        response: {
          indicators: ['EMA 50', 'RSI'],
          pattern: ['Bullish Flag'],
          type: OrderSideEnum.BUY,
          entryZone: [75500, 75700],
          sl: 74950,
          tp: 77200,
          leverage: 35,
          riskReward: 2.46,
          reasoning:
            'Strong bullish expansion past $76k followed by high-volume consolidation. Retest of the breakout zone coincides with the 15m 50-EMA and structural support. Confidence is high due to the alignment of daily and intraday trends.',
          confidence: {
            score: 86,
            components: {
              trend: 92,
              momentum: 85,
              volume: 80,
              structure: 88,
            },
          },
        },
      },
    ];
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
    ];
    this.conversation.push(...convo);

    this.reset();
  }

  openChat(): void {
    this.chatOpen.set(!this.chatOpen());
    this.chatScrollToBottom();
  }

  closeChat(): void {
    this.chatOpen.set(false);
  }

  analyze(): void {
    if (this.isAnalyzing()) return;
    
    this.isAnalyzing.set(true);

    this.aiService
      .analyzeMarket(this.selectedSymbol, this.selectedTimeframe)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: AIResponse) => {
          this.analyzeSignals.push({
            ...res,
            timestamp: new Date().toLocaleTimeString(),
          });

          this.isAnalyzing.set(false);
          this.anaylzeScrollToBottom();
        },
        error: (err: any) => {
          this.analyzeSignals.push({
            status: 'rejected',
            message: 'Something went wrong. Please try again.',
            timestamp: new Date().toLocaleTimeString(),
            response: null
          });
          console.error(err);
          this.isAnalyzing.set(false);
          this.anaylzeScrollToBottom();
        },
      });
  }

  chatBot(): void {
    if (!this.message || this.message.length < 3 || this.isLoading()) return;
    this.isLoading.set(true);

    this.conversation.push({
      sender: 'user',
      message: this.message,
      timestamp: new Date().toLocaleTimeString(),
      isError: false,
    });

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
    this.isLoading.set(false);
    this.isAnalyzing.set(false);
    this.chatScrollToBottom();
  }

  chatScrollToBottom(): void {
    setTimeout(() => {
      const container = this.chatScrollPanel?.contentViewChild?.nativeElement;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 0);
  }

  anaylzeScrollToBottom(): void {
    setTimeout(() => {
      const container = this.analyzeScrollPanel?.contentViewChild?.nativeElement;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 0);
  }

  onTabChange(event: any): void {
    if (event === 0) {
      this.chatScrollToBottom();
    } else {
      this.anaylzeScrollToBottom();
    }
  }
}
