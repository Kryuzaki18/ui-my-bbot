import { OrderSideEnum } from "./trades.model";

export interface ChatResponse {
  sender: string;
  message: string;
  timestamp: string;
  isError: boolean;
  data?: AIResponse | null;
}

export interface AIResponse {
  status: string;
  message: string;
  response: AIResponseData | null;
}

interface AIResponseData {
  signal: AISignal;
  buy: AIResponseDataEntry[];
  sell: AIResponseDataEntry[];
}

interface AISignal {
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

interface AIResponseDataEntry {
  indicators: string[];
  pattern: string[];
  entryZone: number[];
  sl: number;
  tp: number;
  leverage: number;
  riskReward: number;
}