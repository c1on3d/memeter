// API configuration for different environments
const getApiBaseUrl = () => {
  // In production (Vercel), use your Render backend
  if (process.env.NODE_ENV === 'production') {
    return 'https://memeter-backend.onrender.com'; // You'll get this URL from Render
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
  MIGRATIONS: process.env.NODE_ENV === 'production' ? '/api/migrations/recent' : '/api/migrations/recent',
  SOLANA_STATS: process.env.NODE_ENV === 'production' ? '/api/analytics/solana-network' : '/api/analytics/solana-network',
  TRENDING_TOKENS: process.env.NODE_ENV === 'production' ? '/api/tokens' : '/api/tokens',
  TOKENS: '/api/tokens',
  SEARCH_TOKENS: '/api/tokens/search',
  TOKEN_IMAGE: '/api/tokens',
  TOKEN_ANALYSIS: '/api/tokens',
} as const;
