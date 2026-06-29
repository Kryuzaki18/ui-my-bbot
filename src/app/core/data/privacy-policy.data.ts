export const PRIVACY_META = {
  effectiveDate: 'June 12, 2025',
  version: '1.0',
} as const;

export interface LegalTocItem {
  id: string;
  label: string;
}

export const PRIVACY_SECTIONS: LegalTocItem[] = [
  { id: 'collect', label: '1. Information We Collect' },
  { id: 'use', label: '2. How We Use Your Data' },
  { id: 'storage', label: '3. Data Storage & Security' },
  { id: 'third-party', label: '4. Third-Party Services' },
  { id: 'cookies', label: '5. Cookies & Sessions' },
  { id: 'retention', label: '6. Data Retention' },
  { id: 'rights', label: '7. Your Rights' },
  { id: 'children', label: "8. Children's Privacy" },
  { id: 'changes', label: '9. Changes to Policy' },
  { id: 'contact', label: '10. Contact Us' },
];

export interface CollectItem {
  icon: string;
  label: string;
  color: string;
}

export const PRIVACY_COLLECT_ITEMS: CollectItem[] = [
  { icon: 'pi-envelope', label: 'Email', color: 'text-blue-400' },
  { icon: 'pi-key', label: 'API Keys', color: 'text-purple-400' },
  { icon: 'pi-comments', label: 'Chat History', color: 'text-emerald-500' },
  { icon: 'pi-user', label: 'Session ID', color: 'text-yellow-500' },
];

export const PRIVACY_ACCOUNT_ITEMS: string[] = [
  'Email address (for registered accounts)',
  'Hashed password (never stored in plaintext)',
  'Binance API key and API secret (stored encrypted)',
];

export const PRIVACY_USAGE_ITEMS: string[] = [
  'AI chat conversation history (keyed to your session or account)',
  'Anonymous session UUID (auto-generated for visitors without accounts)',
  'Session authentication tokens (stored as httpOnly cookies)',
  'General usage patterns to improve the Service',
];

export interface UseCard {
  icon: string;
  label: string;
  desc: string;
  color: string;
  bg: string;
}

export const PRIVACY_USE_CARDS: UseCard[] = [
  {
    icon: 'pi-user-plus',
    label: 'Account Management',
    desc: 'Create and maintain your account',
    color: 'text-blue-400',
    bg: 'bg-blue-500/5 border-blue-500/20',
  },
  {
    icon: 'pi-chart-line',
    label: 'Trading Execution',
    desc: 'Process orders via Binance API',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/5 border-yellow-500/20',
  },
  {
    icon: 'pi-comments',
    label: 'AI Chat History',
    desc: 'Load and save your conversations',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/5 border-emerald-500/20',
  },
  {
    icon: 'pi-shield',
    label: 'Security',
    desc: 'Detect and prevent unauthorized access',
    color: 'text-red-400',
    bg: 'bg-red-500/5 border-red-500/20',
  },
];

export const PRIVACY_STORAGE_ITEMS: string[] = [
  'Passwords are hashed using bcrypt with 12 salt rounds — never stored in plaintext',
  'Session tokens are signed JWTs transmitted only via httpOnly, Secure, SameSite cookies',
  'All communication between client and server uses HTTPS/TLS encryption',
  'API keys are stored with encryption at rest on MongoDB Atlas',
  'Rate limiting is applied to authentication endpoints to prevent brute-force attacks',
];

export interface TechStackItem {
  label: string;
  desc: string;
}

export const PRIVACY_TECH_STACK: TechStackItem[] = [
  { label: 'bcrypt', desc: 'Password hashing' },
  { label: 'JWT', desc: 'Session tokens' },
  { label: 'HTTPS', desc: 'Transport security' },
  { label: 'Atlas', desc: 'Cloud database' },
];

export interface ThirdPartyService {
  name: string;
  role: string;
  desc: string;
  color: string;
  bg: string;
  icon: string;
}

export const PRIVACY_THIRD_PARTY: ThirdPartyService[] = [
  {
    name: 'Binance',
    role: 'Exchange Integration',
    desc: "Your API keys are used to authenticate with Binance to retrieve account data and execute trades. Subject to Binance's own Privacy Policy.",
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/5 border-yellow-500/20',
    icon: 'pi-chart-bar',
  },
  {
    name: 'Anthropic Claude',
    role: 'AI Analysis Engine',
    desc: "Chat messages and market data are sent to Claude's API to generate analysis and responses. Conversation context may be included. Subject to Anthropic's Privacy Policy.",
    color: 'text-purple-400',
    bg: 'bg-purple-500/5 border-purple-500/20',
    icon: 'pi-sparkles',
  },
  {
    name: 'MongoDB Atlas',
    role: 'Database Provider',
    desc: "User accounts, API keys, and chat history are stored in MongoDB Atlas cloud infrastructure. Subject to MongoDB's Privacy Policy.",
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/5 border-emerald-500/20',
    icon: 'pi-database',
  },
];

export interface CookieRow {
  name: string;
  purpose: string;
  duration: string;
}

export const PRIVACY_COOKIES: CookieRow[] = [
  { name: 'session', purpose: 'Authenticated user session JWT', duration: '7 days' },
  { name: 'anon_session', purpose: 'Anonymous visitor session UUID', duration: '30 days' },
];

export const PRIVACY_RETENTION_ITEMS: string[] = [
  'Account data is retained for as long as your account is active',
  'Chat history is capped at the last 100 messages per session',
  'Anonymous session data expires after 30 days of inactivity',
  'Session cookies expire after 7 days (authenticated) or 30 days (anonymous)',
  'You may request deletion of your account and all associated data at any time',
];

export interface RightsCard {
  icon: string;
  label: string;
  desc: string;
}

export const PRIVACY_RIGHTS_CARDS: RightsCard[] = [
  { icon: 'pi-eye', label: 'Access', desc: 'Request a copy of the data we hold about you' },
  { icon: 'pi-pencil', label: 'Rectification', desc: 'Request correction of inaccurate data' },
  { icon: 'pi-trash', label: 'Deletion', desc: 'Request deletion of your account and data' },
  { icon: 'pi-ban', label: 'Restriction', desc: 'Request restriction of data processing' },
];
