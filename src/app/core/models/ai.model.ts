import { OrderSideEnum } from "./trades.model";

export interface ChatResponse {
  sender: string;
  message: string;
  timestamp: string;
  isSuggestion: boolean;
  isError: boolean;
  response?: AIResponse | null;
}

export interface AIResponse {
  status: string;
  message: string;
  data: AIResponseData | null;
}

export interface AIResponseData {
  symbol: string;
  timeframe: string;
  buy: AIResponseDataEntry[];
  sell: AIResponseDataEntry[];
}

export interface AIResponseDataEntry {
  indicators: string[];
  pattern: string[];
  leverage: number;
  sl: number;
  tp: number;
}

