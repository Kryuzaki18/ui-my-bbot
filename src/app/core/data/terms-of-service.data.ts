export const TERMS_META = {
  effectiveDate: 'June 12, 2025',
  version: '1.0',
} as const;

export interface LegalTocItem {
  id: string;
  label: string;
}

export const TERMS_SECTIONS: LegalTocItem[] = [
  { id: 'acceptance',  label: '1. Acceptance of Terms'     },
  { id: 'eligibility', label: '2. Eligibility'              },
  { id: 'service',     label: '3. Use of Service'           },
  { id: 'risks',       label: '4. Trading Risks'            },
  { id: 'api-keys',    label: '5. API Key Security'         },
  { id: 'conduct',     label: '6. Prohibited Conduct'       },
  { id: 'ip',          label: '7. Intellectual Property'    },
  { id: 'disclaimer',  label: '8. Disclaimer of Warranties' },
  { id: 'liability',   label: '9. Limitation of Liability'  },
  { id: 'termination', label: '10. Termination'             },
  { id: 'changes',     label: '11. Changes to Terms'        },
  { id: 'contact',     label: '12. Contact Us'              },
];

export const TERMS_ELIGIBILITY_ITEMS: string[] = [
  'Be at least 18 years of age or the legal age of majority in your jurisdiction',
  'Have the legal capacity to enter into a binding agreement',
  'Not be prohibited by applicable law from using cryptocurrency trading services',
  'Comply with all applicable local, national, and international laws and regulations',
  'Not be located in a jurisdiction where cryptocurrency trading is restricted or prohibited',
];

export const TERMS_RISK_ITEMS: string[] = [
  'Cryptocurrency markets are highly volatile and prices can change dramatically',
  'Leveraged trading amplifies both gains and losses',
  'AI-generated signals and analysis are not guarantees of profit',
  'Past performance of signals does not indicate future results',
  'You are solely responsible for your trading decisions and outcomes',
  'You should never trade with funds you cannot afford to lose',
];

export const TERMS_API_KEY_ITEMS: string[] = [
  'Keeping your API keys confidential and secure',
  'Restricting API key permissions to only what is necessary',
  'Enabling IP whitelisting on your Binance API keys where possible',
  'Immediately revoking compromised API keys via Binance',
  'All trades and actions executed using your API keys',
];

export const TERMS_CONDUCT_ITEMS: string[] = [
  'Reverse engineer, decompile, or disassemble any part of the Service',
  'Use the Service for any unlawful purpose or in violation of any regulations',
  'Attempt to gain unauthorized access to any part of the Service or its servers',
  'Use automated bots or scripts to abuse the Service beyond its intended use',
  'Transmit viruses, malware, or any other harmful code',
  'Use the Service to manipulate cryptocurrency markets',
  'Resell, sublicense, or commercially exploit the Service without written consent',
  'Interfere with or disrupt the integrity or performance of the Service',
];

export const TERMS_LIABILITY_ITEMS: string[] = [
  'Trading losses or missed opportunities arising from use of the Service',
  'Loss of data, revenue, profits, or business opportunities',
  'Damages resulting from unauthorized access to your account or API keys',
  'Service interruptions, system failures, or API connectivity issues',
  'Errors or inaccuracies in AI-generated analysis or market data',
];
