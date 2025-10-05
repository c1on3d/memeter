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
  volume24h?: number;
  holderCount?: number;
  price?: number;
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

export interface PumpPortalAccountTrade {
  account: string;
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  tradeType: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: string;
  signature: string;
}

class PumpPortalWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private subscriptions = new Set<string>();
  private listeners = new Map<string, Set<Function>>();

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
      
      this.ws.onopen = () => {
        console.log('PumpPortal WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Re-subscribe to all previous subscriptions
        this.subscriptions.forEach(method => {
          this.sendSubscription(method);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing PumpPortal message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('PumpPortal WebSocket disconnected');
        this.isConnecting = false;
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('PumpPortal WebSocket error:', error);
        this.isConnecting = false;
      };

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

  private handleMessage(data: any) {
    // Handle different types of messages based on the data structure
    if (data.type) {
      const listeners = this.listeners.get(data.type);
      if (listeners) {
        listeners.forEach(listener => {
          try {
            listener(data);
          } catch (error) {
            console.error('Error in PumpPortal listener:', error);
          }
        });
      }
    }
  }

  // Subscribe to new token creation events
  subscribeToNewTokens(callback: (token: PumpPortalToken) => void) {
    this.addListener('newToken', callback);
    this.sendSubscription('subscribeNewToken');
    
    return () => {
      this.removeListener('newToken', callback);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: 'unsubscribeNewToken' }));
      }
    };
  }

  // Subscribe to migration events
  subscribeToMigrations(callback: (migration: PumpPortalMigration) => void) {
    this.addListener('migration', callback);
    this.sendSubscription('subscribeMigration');
    
    return () => {
      this.removeListener('migration', callback);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: 'unsubscribeMigration' }));
      }
    };
  }

  // Subscribe to account trades
  subscribeToAccountTrades(accounts: string[], callback: (trade: PumpPortalAccountTrade) => void) {
    this.addListener('accountTrade', callback);
    this.sendSubscription('subscribeAccountTrade', accounts);
    
    return () => {
      this.removeListener('accountTrade', callback);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: 'unsubscribeAccountTrade' }));
      }
    };
  }

  // Subscribe to token trades
  subscribeToTokenTrades(tokens: string[], callback: (trade: PumpPortalTrade) => void) {
    this.addListener('tokenTrade', callback);
    this.sendSubscription('subscribeTokenTrade', tokens);
    
    return () => {
      this.removeListener('tokenTrade', callback);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: 'unsubscribeTokenTrade' }));
      }
    };
  }

  private addListener(type: string, callback: Function) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
  }

  private removeListener(type: string, callback: Function) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Disconnect
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const pumpPortalWebSocket = new PumpPortalWebSocketService();
