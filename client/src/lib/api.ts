// API configuration for different environments
const getApiBaseUrl = () => {
  // In production (Vercel), use relative URLs that point to Vercel API routes
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  
  // In development, use localhost
  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = API_BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  if (baseUrl) {
    return `${baseUrl}${cleanEndpoint}`;
  }
  
  return cleanEndpoint;
};

// API endpoints - different for local vs production
export const API_ENDPOINTS = {
  NEW_TOKENS: '/api/pumpportal/new-tokens',
  MIGRATIONS: process.env.NODE_ENV === 'production' ? '/api/migrations' : '/api/migrations/recent',
  SOLANA_STATS: process.env.NODE_ENV === 'production' ? '/api/solana/network-stats' : '/api/analytics/solana-network',
  TRENDING_TOKENS: process.env.NODE_ENV === 'production' ? '/api/tokens/trending' : '/api/tokens',
  TOKENS: '/api/tokens',
  SEARCH_TOKENS: '/api/tokens/search',
  TOKEN_IMAGE: '/api/tokens',
  TOKEN_ANALYSIS: '/api/tokens',
} as const;
