import { AIResponse, ChatResponse } from '../models/ai.model';
import { OrderSideEnum } from '../models/trades.model';

export const SAMPLE_SIGNALS: AIResponse[] = [
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

export const SAMPLE_CONVERSATION: ChatResponse[] = [
  {
    sender: 'user',
    message: 'What is the current price of BTC?',
    timestamp: new Date().toLocaleTimeString(),
  },
  {
    sender: 'assistant',
    message: 'The current price of BTC is 100000.',
    timestamp: new Date().toLocaleTimeString(),
  },
  {
    sender: 'user',
    message: 'What is the current price of ETH',
    timestamp: new Date().toLocaleTimeString(),
  },
  {
    sender: 'assistant',
    message: 'The current price of ETH is 3000.',
    timestamp: new Date().toLocaleTimeString(),
  },
  {
    sender: 'user',
    message: 'Any coming event that affects BTC?',
    timestamp: new Date().toLocaleTimeString(),
  },
  {
    sender: 'assistant',
    message:
      'Yes, there is an event coming up that may affect BTC. It is a news event that is scheduled to happen in 2 hours.',
    timestamp: new Date().toLocaleTimeString(),
  },
];
