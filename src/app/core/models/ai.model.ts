import { OrderSideEnum } from "./trades.model";

export interface ChatResponse {
  sender: string;
  message: string;
  timestamp: string;
  isError: boolean;
  response?: AIResponse | null;
}

export interface AIResponse {
  status: string;
  message: string;
  data: AIResponseData | null;
}

export interface AIResponseData {
  signal: AISignal;
  buy: AIResponseDataEntry[];
  sell: AIResponseDataEntry[];
}

export interface AISignal {
  type: OrderSideEnum;
  probability: string;
  entryZone: string;
  sl: number;
  tp: number;
  leverage: number;
  reasoning: string;
}

export interface AIResponseDataEntry {
  indicators: string[];
  pattern: string[];
  entry: number;
  sl: number;
  tp: number;
  leverage: number;
}

