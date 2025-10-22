import WebSocket from 'ws';
import { pool } from '../config/database.js';

interface PumpApiEvent {
  txType: string;
  pool: string;
  mint?: string;
  name?: string;
  symbol?: string;
  uri?: string;
  description?: string;
  image?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  discord?: string;
  creator?: string;
  signature?: string;
  traderPublicKey?: string;
  user?: string;
  solAmount?: number;
  tokenAmount?: number;
  pricePerToken?: number;
  marketCapSol?: number;
  timestamp?: number;
  raydiumPool?: string;
  [key: string]: any;
}

export class PumpApiService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    const wsUrl = process.env.PUMPAPI_WS_URL || 'wss://stream.pumpapi.io/';
    console.log('🔌 Connecting to PumpAPI.io WebSocket:', wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('✅ Connected to PumpAPI.io WebSocket');
      this.isConnecting = false;
    });

    this.ws.on('message', async (data: WebSocket.Data) => {
      try {
        const event: PumpApiEvent = JSON.parse(data.toString());
        
        // Log event types for debugging
        if (event.txType && event.txType !== 'buy' && event.txType !== 'sell') {
          console.log('📨 [PumpAPI] Event:', event.txType, event.symbol || event.mint || '');
        }
        
        // Handle different event types
        if (event.txType === 'create') {
          await this.handleNewToken(event);
        } else if (event.txType === 'buy' || event.txType === 'sell') {
          await this.handleTrade(event);
        } else if (event.txType === 'complete' || event.txType === 'migrate') {
          // Token bonding curve is fully sold out
          console.log('🚀 [PumpAPI] BONDING CURVE COMPLETED:', event.symbol, event.mint);
          await this.handleMigration(event);
        }
      } catch (error) {
        console.error('❌ Error processing PumpAPI message:', error);
      }
    });

    this.ws.on('error', (error) => {
      console.error('❌ PumpAPI WebSocket error:', error);
      this.isConnecting = false;
    });

    this.ws.on('close', () => {
      console.log('🔌 PumpAPI WebSocket connection closed, reconnecting in 5s...');
      this.isConnecting = false;
      this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    });
  }

  private async handleNewToken(event: PumpApiEvent) {
    try {
      console.log('📦 PumpAPI new token:', event.symbol, event.mint);
      
      const client = await pool.connect();
      
      try {
        // Fetch metadata from URI if available
        let metadata: any = {};
        let imageUrl = event.image;
        
        if (event.uri && !event.uri.endsWith('.json')) {
          try {
            const metadataResponse = await fetch(event.uri);
            if (metadataResponse.ok) {
              metadata = await metadataResponse.json();
              imageUrl = imageUrl || metadata.image;
            }
          } catch (e) {
            // Ignore metadata fetch errors
          }
        }

        // Extract social links
        const socialLinks = {
          website: event.website || metadata.website || metadata.external_url || null,
          twitter: event.twitter || metadata.twitter || null,
          telegram: event.telegram || metadata.telegram || null,
          discord: event.discord || metadata.discord || null,
        };

        const marketCapSol = event.marketCapSol || 0;

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
            event.mint,
            event.name || event.symbol || 'Unknown',
            event.symbol || 'UNKNOWN',
            event.uri,
            imageUrl,
            event.description || metadata.description,
            event.creator,
            event.pool || 'pump',
            marketCapSol,
            event.timestamp ? new Date(event.timestamp) : new Date(),
            socialLinks.website,
            socialLinks.twitter,
            socialLinks.telegram,
            socialLinks.discord,
          ]
        );

        console.log(`✅ [PumpAPI] Saved token: ${event.symbol} (${event.mint}) - MC: ${marketCapSol.toFixed(2)} SOL`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error saving PumpAPI token to database:', error);
    }
  }

  private async handleTrade(event: PumpApiEvent) {
    try {
      const client = await pool.connect();
      
      try {
        // Store trade in database
        await client.query(
          `INSERT INTO trades (
            mint, tx_type, signature, trader, sol_amount, token_amount, 
            price_sol, market_cap_sol, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (signature) DO NOTHING`,
          [
            event.mint,
            event.txType, // 'buy' or 'sell'
            event.signature,
            event.traderPublicKey || event.user,
            event.solAmount || 0,
            event.tokenAmount || 0,
            event.pricePerToken || 0,
            event.marketCapSol || 0,
            event.timestamp ? new Date(event.timestamp) : new Date(),
          ]
        );

        // Log significant trades (> 1 SOL)
        const solAmount = Number(event.solAmount || 0);
        if (solAmount > 1) {
          console.log(`💰 [PumpAPI] ${event.txType?.toUpperCase()}: ${solAmount.toFixed(2)} SOL of ${event.symbol || event.mint}`);
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error saving PumpAPI trade to database:', error);
    }
  }

  private async handleMigration(event: PumpApiEvent) {
    try {
      const client = await pool.connect();
      
      try {
        // Update token with migration info and final market cap
        await client.query(
          `UPDATE tokens 
           SET raydium_pool = $1, 
               migrated_at = $2,
               market_cap_sol = COALESCE($3, market_cap_sol),
               updated_at = CURRENT_TIMESTAMP
           WHERE mint = $4`,
          [
            event.raydiumPool || 'completed',
            event.timestamp ? new Date(event.timestamp) : new Date(),
            event.marketCapSol || null,
            event.mint,
          ]
        );

        console.log(`🚀 [PumpAPI] Token completed bonding curve: ${event.symbol} (${event.mint}) - MC: ${event.marketCapSol?.toFixed(2) || 'N/A'} SOL`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error saving PumpAPI migration to database:', error);
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
