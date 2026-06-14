import { Component, DestroyRef, inject, signal, ViewChild } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services
import { AIService } from '../../core/services/ai.service';
import { ChartService } from '../../core/services/chart/chart.service';

// Models
import { AIResponse, ChatResponse, ConversationHistoryMessage } from '../../core/models/ai.model';

// Data
import { SAMPLE_CONVERSATION, SAMPLE_SIGNALS } from '../../core/data/chat.data';

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

  readonly INITIAL_MESSAGE: ChatResponse = {
    sender: 'assistant',
    message:
      "Hi! I'm Bbot, your crypto trading AI. Ask me anything about markets, technical analysis, or trading strategies.",
    timestamp: new Date().toLocaleTimeString(),
  };

  chatOpen = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isAnalyzing = signal<boolean>(false);
  isClearingHistory = signal<boolean>(false);
  chatTabIndex: number = 0;
  message: string = '';
  conversation: ChatResponse[] = [{ ...this.INITIAL_MESSAGE }];
  analyzeSignals: AIResponse[] = [];

  ngOnInit(): void {
    this.loadHistory();
  }

  sampleSignals(): void {
    this.analyzeSignals = [...SAMPLE_SIGNALS];
  }

  sampleConversation(): void {
    this.conversation.push(...SAMPLE_CONVERSATION);
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
            response: null,
          });
          console.error(err);
          this.isAnalyzing.set(false);
          this.anaylzeScrollToBottom();
        },
      });
  }

  loadHistory(): void {
    this.aiService
      .getHistory()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (messages: ConversationHistoryMessage[]) => {
          if (messages.length > 0) {
            const history: ChatResponse[] = messages.map((m) => ({
              sender: m.role,
              message: m.content,
              timestamp: m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : '',
            }));
            this.conversation = [{ ...this.INITIAL_MESSAGE }, ...history];
            this.chatScrollToBottom();
          }
        },
        error: () => {},
      });
  }

  clearHistory(): void {
    if (this.isClearingHistory() || this.conversation.length <= 1) return;
    this.isClearingHistory.set(true);

    this.aiService
      .clearHistory()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.conversation = [{ ...this.INITIAL_MESSAGE }];
          this.isClearingHistory.set(false);
          this.chatScrollToBottom();
        },
        error: () => {
          this.isClearingHistory.set(false);
        },
      });
  }

  chatBot(): void {
    if (!this.message || this.message.length < 3 || this.isLoading()) return;
    this.isLoading.set(true);

    const userMessage = this.message;

    this.conversation.push({
      sender: 'user',
      message: userMessage,
      timestamp: new Date().toLocaleTimeString(),
    });

    this.aiService
      .chatBot(userMessage)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: AIResponse) => {
          this.conversation.push({
            sender: 'assistant',
            message: res.message,
            timestamp: new Date().toLocaleTimeString(),
          });
          this.reset();
        },
        error: (err: any) => {
          this.conversation.push({
            sender: 'assistant',
            message: 'Something went wrong. Please try again.',
            timestamp: new Date().toLocaleTimeString(),
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
