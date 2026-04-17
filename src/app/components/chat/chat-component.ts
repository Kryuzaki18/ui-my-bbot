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
    this.sampleConversation();
    this.scrollToBottom();
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
        message:
          'BTCUSDT exhibits strong bullish momentum on the daily timeframe, maintaining price discovery above the $75,000 threshold. The 15m timeframe shows an impulsive expansion to $76,350 followed by a healthy corrective consolidation. Market structure remains bullish as price forms higher lows above previous resistance turned support. Confluence is established through the 20-period EMA providing dynamic support and the RSI cooling from overbought levels, suggesting a trend continuation. Key liquidity resides at $75,400. A break above $76,350 targets Fibonacci extension levels near $77,500.',
        timestamp: new Date().toLocaleTimeString(),
        isError: false,
        data: {
          status: 'accepted',
          message:
            'BTCUSDT exhibits strong bullish momentum on the daily timeframe, maintaining price discovery above the $75,000 threshold. The 15m timeframe shows an impulsive expansion to $76,350 followed by a healthy corrective consolidation. Market structure remains bullish as price forms higher lows above previous resistance turned support. Confluence is established through the 20-period EMA providing dynamic support and the RSI cooling from overbought levels, suggesting a trend continuation. Key liquidity resides at $75,400. A break above $76,350 targets Fibonacci extension levels near $77,500.',
          response: {
            signal: {
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
            buy: [
              {
                indicators: ['EMA 50', 'RSI'],
                pattern: ['Bullish Flag'],
                leverage: 5,
                entryZone: [75200, 75500],
                sl: 74200,
                tp: 77500,
                riskReward: 2.3,
              },
              {
                indicators: ['EMA 20', 'VWAP'],
                pattern: ['Break of Structure'],
                leverage: 15,
                entryZone: [75500, 75700],
                sl: 74950,
                tp: 77200,
                riskReward: 2.46,
              },
              {
                indicators: ['Stochastic RSI', 'Bollinger Bands'],
                pattern: ['Bullish Engulfing'],
                leverage: 35,
                entryZone: [75650, 75750],
                sl: 75300,
                tp: 76800,
                riskReward: 2.56,
              },
            ],
            sell: [
              {
                indicators: ['RSI Divergence', 'EMA 20'],
                pattern: ['Double Top'],
                leverage: 5,
                entryZone: [76200, 76350],
                sl: 76850,
                tp: 75200,
                riskReward: 1.54,
              },
              {
                indicators: ['MACD Histogram', 'Volume Profile'],
                pattern: ['Rising Wedge'],
                leverage: 15,
                entryZone: [76100, 76250],
                sl: 76600,
                tp: 74800,
                riskReward: 2.88,
              },
              {
                indicators: ['Bollinger Bands', 'RSI Overbought'],
                pattern: ['M-Top'],
                leverage: 35,
                entryZone: [76300, 76350],
                sl: 76550,
                tp: 75800,
                riskReward: 2.2,
              },
            ],
          },
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
              data: res,
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
    const container = this.chatScrollPanel?.contentViewChild?.nativeElement;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }
}
