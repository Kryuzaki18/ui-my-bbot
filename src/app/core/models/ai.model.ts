import { OrderSideEnum } from "./trades.model";

export interface ChatResponse {
  sender: string;
  message: string;
  timestamp: string;
  isError: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationHistoryMessage {
  role: 'user' | 'assistant';
  status: 'accepted' | 'rejected';
  content: string;
  createdAt: string;
}

export interface AIResponse {
  status: string;
  message: string;
  timestamp: string;
  response: AISignal | null;
}

interface AISignal {
  indicators: string[];
  pattern: string[];
  type: OrderSideEnum;
  entryZone: number[];
  sl: number;
  tp: number;
  leverage: number;
  riskReward: number;
  reasoning: string;
  confidence: AIConfidence;
}

interface AIConfidence {
  score: number;
  components: {
    trend: number;
    momentum: number;
    volume: number;
    structure: number;
  };
}