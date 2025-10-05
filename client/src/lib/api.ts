// API configuration for different environments
const getApiBaseUrl = () => {
  // Use Render backend for both development and production
  // This ensures live token data is available everywhere
  if (process.env.NODE_ENV === 'production') {
    return 'https://memeter-backend.onrender.com'; // Render backend
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
  MIGRATIONS: '/api/migrations',
  SOLANA_STATS: '/api/solana/network-stats',
  TRENDING_TOKENS: '/api/tokens/trending',
  TOKENS: '/api/tokens',
  SEARCH_TOKENS: '/api/tokens/search',
  TOKEN_IMAGE: '/api/tokens',
  TOKEN_ANALYSIS: '/api/tokens',
} as const;
