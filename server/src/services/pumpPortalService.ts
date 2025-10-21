import WebSocket from 'ws';
import { pool } from '../config/database.js';

interface TokenData {
  mint: string;
  name?: string;
  symbol?: string;
  uri?: string;
  description?: string;
  image?: string;
  showName?: boolean;
  createdTimestamp?: number;
  raydiumPool?: string;
  twitter?: string;
  telegram?: string;
  bonding_curve?: string;
  associated_bonding_curve?: string;
  creator?: string;
  metadata_uri?: string;
  website?: string;
  discord?: string;
}

export class PumpPortalService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    const wsUrl = process.env.PUMPPORTAL_WS_URL || 'wss://pumpportal.fun/api/data';
    console.log('🔌 Connecting to PumpPortal WebSocket:', wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('✅ Connected to PumpPortal WebSocket');
      this.isConnecting = false;
      
      // Subscribe to new token events
      const subscribeMessage = {
        method: 'subscribeNewToken',
      };
      this.ws?.send(JSON.stringify(subscribeMessage));
      console.log('📡 Subscribed to new token events');
    });

    this.ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.txType === 'create') {
          await this.handleNewToken(message);
        }
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error);
      }
    });

    this.ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.isConnecting = false;
    });

    this.ws.on('close', () => {
      console.log('🔌 WebSocket connection closed, reconnecting in 5s...');
      this.isConnecting = false;
      this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    });
  }

  private async handleNewToken(data: TokenData) {
    try {
      const client = await pool.connect();
      
      try {
        // Fetch metadata from URI if available
        let metadata: any = {};
        let imageUrl = data.image;
        
        if (data.uri && !data.uri.endsWith('.json')) {
          try {
            const metadataResponse = await fetch(data.uri);
            if (metadataResponse.ok) {
              metadata = await metadataResponse.json();
              imageUrl = imageUrl || metadata.image;
            }
          } catch (e) {
            // Ignore metadata fetch errors
          }
        }

        // Extract social links from metadata or direct fields
        const socialLinks = {
          website: data.website || metadata.website || metadata.external_url || null,
          twitter: data.twitter || metadata.twitter || null,
          telegram: data.telegram || metadata.telegram || null,
          discord: data.discord || metadata.discord || null,
        };

        await client.query(
          `INSERT INTO tokens (
            mint, name, symbol, uri, image, description, creator, pool,
            market_cap_sol, timestamp, website, twitter, telegram, discord
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (mint) DO UPDATE SET
            name = EXCLUDED.name,
            symbol = EXCLUDED.symbol,
            uri = EXCLUDED.uri,
            image = EXCLUDED.image,
            description = EXCLUDED.description,
            market_cap_sol = EXCLUDED.market_cap_sol,
            website = EXCLUDED.website,
            twitter = EXCLUDED.twitter,
            telegram = EXCLUDED.telegram,
            discord = EXCLUDED.discord,
            updated_at = CURRENT_TIMESTAMP`,
          [
            data.mint,
            data.name || data.symbol || 'Unknown',
            data.symbol || 'UNKNOWN',
            data.uri || data.metadata_uri,
            imageUrl,
            data.description || metadata.description,
            data.creator,
            'pump',
            0, // Initial market cap
            data.createdTimestamp ? new Date(data.createdTimestamp) : new Date(),
            socialLinks.website,
            socialLinks.twitter,
            socialLinks.telegram,
            socialLinks.discord,
          ]
        );

        console.log(`✅ Saved token: ${data.symbol} (${data.mint})`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error saving token to database:', error);
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}
