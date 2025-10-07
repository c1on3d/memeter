// API configuration - Configure this to point to your backend on Render
const getApiBaseUrl = () => {
  // Set your backend URL here or via environment variable
  const envUrl = import.meta.env.VITE_API_URL;
  
  console.log('🔧 API Configuration:', {
    VITE_API_URL: envUrl,
    willUseUrl: envUrl || 'NONE - API calls will fail!',
  });
  
  if (envUrl) {
    return envUrl;
  }
  
  // Default: Leave empty if using VITE_API_URL environment variable
  // Example: 'https://your-backend-name.onrender.com'
  console.warn('⚠️ VITE_API_URL not set! API calls will fail.');
  return '';
};

export const API_BASE_URL = getApiBaseUrl();
console.log('✅ API_BASE_URL set to:', API_BASE_URL);

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = API_BASE_URL.replace(/\/+$/, ''); // Remove trailing slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  if (baseUrl) {
    // Handle empty endpoint case
    if (!endpoint || endpoint === '/') {
      return baseUrl;
    }
    return `${baseUrl}${cleanEndpoint}`;
  }
  
  return cleanEndpoint;
};

// API endpoints mapped to your Render backend
// Based on: https://memeter-backend.onrender.com/
export const API_ENDPOINTS = {
  // PumpPortal - New tokens from WebSocket
  NEW_TOKENS: '/api/new',
  
  // Token data
  TOKENS: '/api/tokens',
  
  // DexScreener endpoints
  DEXSCREENER_LATEST: '/api/dexscreener/latest',
  DEXSCREENER_SEARCH: '/api/dexscreener/search',
  DEXSCREENER_TOKEN: '/api/dexscreener/token',
  DEXSCREENER_PAIR: '/api/dexscreener/pair',
  
  // Social data
  SOCIAL_OVERVIEW: '/api/social/overview',
  SOCIAL_TOKEN: '/api/social/token',
  
  // Backend status
  STATUS: '/',
} as const;
