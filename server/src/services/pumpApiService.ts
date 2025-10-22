import WebSocket from 'ws';
import { tokenStore } from './tokenStore.js';

interface PumpApiEvent {
  txType: string;
  mint?: string;
  name?: string;
  symbol?: string;
  uri?: string;
  description?: string;
  creator?: string;
  marketCapSol?: number;
  timestamp?: number;
  [key: string]: any;
}

export class PumpApiService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 5000;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket('wss://pumpportal.fun/api/data');

      this.ws.on('open', () => {
        console.log('✅ Connected to PumpPortal WebSocket');
        
        // Subscribe to new token events
        const subscribeMessage = {
          method: 'subscribeNewToken',
        };
        this.ws?.send(JSON.stringify(subscribeMessage));
        console.log('📡 Subscribed to new token events');
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message = data.toString();
          const parsed = JSON.parse(message);
          
          // Handle new token events (skip subscription confirmation messages)
          if (parsed && typeof parsed === 'object' && parsed.mint) {
            this.handleNewToken(parsed);
          }
        } catch (error) {
          console.error('Error parsing PumpPortal message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('❌ PumpPortal WebSocket closed, reconnecting...');
        this.scheduleReconnect();
      });

      this.ws.on('error', (error) => {
        console.error('❌ PumpPortal WebSocket error:', error.message);
      });

    } catch (error) {
      console.error('❌ Failed to connect to PumpPortal:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = setTimeout(() => {
      console.log('🔄 Reconnecting to PumpPortal...');
      this.connect();
    }, this.reconnectDelay);
  }

  private async handleNewToken(event: PumpApiEvent) {
    try {
      console.log('🆕 New token from PumpPortal:', event.symbol, event.mint);
      
      // Fetch metadata if uri is provided
      let metadata: any = {};
      if (event.uri) {
        try {
          const response = await fetch(event.uri);
          if (response.ok) {
            metadata = await response.json();
          }
        } catch (e) {
          console.log('Could not fetch metadata for', event.symbol);
        }
      }

      // Store token in memory
      tokenStore.addToken({
        mint: event.mint || '',
        name: event.name || metadata.name || 'Unknown',
        symbol: event.symbol || 'UNKNOWN',
        uri: event.uri,
        image: metadata.image || event.uri,
        description: event.description || metadata.description,
        creator: event.creator,
        marketCapSol: event.marketCapSol,
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
        website: metadata.website,
        twitter: metadata.twitter,
        telegram: metadata.telegram,
        discord: metadata.discord,
      });

      console.log('✅ Token stored:', event.symbol, '- Total tokens:', tokenStore.getCount());
    } catch (error) {
      console.error('❌ Error handling PumpPortal token:', error);
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}
