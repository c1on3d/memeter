import WebSocket from 'ws';
import fetch from 'node-fetch';

export interface PumpPortalToken {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  uri?: string;
  description?: string;
  image?: string;
  attributes?: any[];
  properties?: any;
  collection?: string;
  creator?: string;
  createdAt: string;
  marketCap?: number;
  marketCapSol?: number;
  volume24h?: number;
  holderCount?: number;
  price?: number;
  pool?: string;
}

export interface PumpPortalMigration {
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  fromRaydium: boolean;
  toRaydium: boolean;
  migrationTime: string;
  marketCapAtMigration: number;
  volumeAtMigration: number;
}

export interface PumpPortalTrade {
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  tradeType: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: string;
  trader: string;
  signature: string;
}

class PumpPortalWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private subscriptions = new Set<string>();
  private dataStore = {
    newTokens: [] as PumpPortalToken[],
    migrations: [] as PumpPortalMigration[],
    trades: [] as PumpPortalTrade[],
  };

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    
    try {
      this.ws = new WebSocket('wss://pumpportal.fun/api/data');
      
      this.ws.on('open', () => {
        console.log('PumpPortal WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Subscribe to new token events
        this.sendSubscription('subscribeNewToken');
        this.sendSubscription('subscribeMigration');
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing PumpPortal message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('PumpPortal WebSocket disconnected');
        this.isConnecting = false;
        this.attemptReconnect();
      });

      this.ws.on('error', (error) => {
        console.error('PumpPortal WebSocket error:', error);
        this.isConnecting = false;
      });

    } catch (error) {
      console.error('Error connecting to PumpPortal WebSocket:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect to PumpPortal WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached for PumpPortal WebSocket');
    }
  }

  private sendSubscription(method: string, keys?: string[]) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = {
        method,
        ...(keys && { keys })
      };
      this.ws.send(JSON.stringify(payload));
      this.subscriptions.add(method);
    }
  }

  private async fetchTokenMetadata(mint: string): Promise<{name?: string, symbol?: string, image?: string, description?: string}> {
    try {
      // Try to fetch metadata from Solana RPC
      const rpcResponse = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getAccountInfo',
          params: [
            mint,
            {
              encoding: 'jsonParsed',
            },
          ],
        }),
      });

      if (rpcResponse.ok) {
        const rpcData = await rpcResponse.json() as any;
        if (rpcData.result?.value?.data?.parsed?.info) {
          const tokenInfo = rpcData.result.value.data.parsed.info;
          if (tokenInfo.metadata) {
            return {
              name: tokenInfo.metadata.name,
              symbol: tokenInfo.metadata.symbol,
              image: tokenInfo.metadata.image,
              description: tokenInfo.metadata.description
            };
          }
        }
      }

      // Fallback: Try to fetch from Metaplex metadata
      const metaplexResponse = await fetch(`https://api.metaplex.com/v1/tokens/${mint}`);
      if (metaplexResponse.ok) {
        const metaplexData = await metaplexResponse.json() as any;
        return {
          name: metaplexData.name,
          symbol: metaplexData.symbol,
          image: metaplexData.image,
          description: metaplexData.description
        };
      }
    } catch (error) {
      console.log('Failed to fetch metadata for mint:', mint, error);
    }
    
    return {};
  }

  private async handleMessage(data: any) {
    console.log('Received PumpPortal message:', data);
    
    // Handle new token creation events - PumpPortal sends data directly
    if (data.txType === 'create' && data.mint) {
      let imageUrl = data.image;
      let tokenName = data.name;
      let tokenSymbol = data.symbol;
      let description = data.description;
      
      // If no direct image but we have a URI, try to fetch from metadata
      if (!imageUrl && data.uri) {
        try {
          console.log('Fetching metadata from:', data.uri);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const metadataResponse = await fetch(data.uri, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json() as any;
            if (metadata.image) {
              imageUrl = metadata.image;
              // Use faster IPFS gateway
              if (imageUrl.includes('ipfs.io/ipfs/')) {
                imageUrl = imageUrl.replace('ipfs.io', 'cf-ipfs.com');
              }
              console.log('Got image from metadata:', imageUrl);
            }
            // Also extract name/symbol if available and missing
            if (!tokenName && metadata.name) tokenName = metadata.name;
            if (!tokenSymbol && metadata.symbol) tokenSymbol = metadata.symbol;
            if (!description && metadata.description) description = metadata.description;
          }
        } catch (error) {
          console.log('Failed to fetch metadata for token:', data.name, error instanceof Error ? error.message : error);
        }
      }
      
      // For bonk.fun tokens or any tokens missing name/symbol, fetch from blockchain
      if (!tokenName || !tokenSymbol) {
        console.log(`Fetching metadata for ${data.pool} token:`, data.mint);
        const metadata = await this.fetchTokenMetadata(data.mint);
        
        if (metadata.name) tokenName = metadata.name;
        if (metadata.symbol) tokenSymbol = metadata.symbol;
        if (metadata.image && !imageUrl) imageUrl = metadata.image;
        if (metadata.description && !description) description = metadata.description;
        
        console.log(`Fetched metadata for ${data.mint}:`, { tokenName, tokenSymbol });
      }
      
      // Final fallback if still no name/symbol
      if (!tokenName || !tokenSymbol) {
        if (data.pool === 'bonk') {
          const shortMint = data.mint.slice(0, 8);
          tokenName = tokenName || `Bonk Token ${shortMint}`;
          tokenSymbol = tokenSymbol || `BONK${shortMint.slice(0, 4).toUpperCase()}`;
        } else {
          tokenName = tokenName || 'Unknown Token';
          tokenSymbol = tokenSymbol || 'UNK';
        }
      }

      const token: PumpPortalToken = {
        mint: data.mint,
        name: tokenName,
        symbol: tokenSymbol,
        decimals: 6, // Default for PumpFun tokens
        uri: data.uri,
        description: description,
        image: imageUrl,
        creator: data.traderPublicKey,
        createdAt: new Date().toISOString(),
        marketCap: data.marketCapSol || 0,
        marketCapSol: data.marketCapSol || 0,
        price: data.marketCapSol ? data.marketCapSol / 1000000 : 0, // Rough price calculation
        volume24h: 0, // Will be updated with trade data
        pool: data.pool || 'unknown',
      };
      
      this.dataStore.newTokens.unshift(token);
      // Keep only the latest 100 tokens
      if (this.dataStore.newTokens.length > 100) {
        this.dataStore.newTokens = this.dataStore.newTokens.slice(0, 100);
      }
    }
    
    // Handle migration events
    if (data.method === 'subscribeMigration' || data.type === 'migration') {
      if (data.data) {
        this.dataStore.migrations.unshift(data.data);
        // Keep only the latest 100 migrations
        if (this.dataStore.migrations.length > 100) {
          this.dataStore.migrations = this.dataStore.migrations.slice(0, 100);
        }
      }
    }
    
    // Handle trade events
    if (data.method === 'subscribeTokenTrade' || data.type === 'tokenTrade') {
      if (data.data) {
        this.dataStore.trades.unshift(data.data);
        // Keep only the latest 100 trades
        if (this.dataStore.trades.length > 100) {
          this.dataStore.trades = this.dataStore.trades.slice(0, 100);
        }
      }
    }
  }

  // Get latest new tokens
  getNewTokens(limit: number = 10): PumpPortalToken[] {
    return this.dataStore.newTokens.slice(0, limit);
  }

  // Get latest migrations
  getMigrations(limit: number = 10): PumpPortalMigration[] {
    return this.dataStore.migrations.slice(0, limit);
  }

  // Get latest trades
  getTrades(limit: number = 10): PumpPortalTrade[] {
    return this.dataStore.trades.slice(0, limit);
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Get stats
  getStats() {
    return {
      totalTokens: this.dataStore.newTokens.length,
      totalMigrations: this.dataStore.migrations.length,
      totalTrades: this.dataStore.trades.length,
      isConnected: this.isConnected(),
    };
  }

  // Disconnect
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const pumpPortalWebSocketService = new PumpPortalWebSocketService();
