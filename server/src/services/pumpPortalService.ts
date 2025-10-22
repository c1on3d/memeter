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
  txType?: string;
  marketCapSol?: number;
  vTokensInBondingCurve?: number;
  vSolInBondingCurve?: number;
  initialBuy?: number;
  completeMarketCapSol?: number;
  [key: string]: any; // Allow any other fields
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
      const subscribeNewToken = {
        method: 'subscribeNewToken',
      };
      this.ws?.send(JSON.stringify(subscribeNewToken));
      console.log('📡 Subscribed to new token events');
      
      // Subscribe to token trades (includes migration events)
      const subscribeTokenTrade = {
        method: 'subscribeTokenTrade',
        keys: ['pump'], // Subscribe to all pump.fun tokens
      };
      this.ws?.send(JSON.stringify(subscribeTokenTrade));
      console.log('📡 Subscribed to token trade events');
      
      // Subscribe to account trades (optional - for tracking specific wallets)
      // const subscribeAccountTrade = {
      //   method: 'subscribeAccountTrade',
      //   keys: ['WALLET_ADDRESS_HERE'], // Add wallet addresses to track
      // };
      // this.ws?.send(JSON.stringify(subscribeAccountTrade));
      // console.log('📡 Subscribed to account trade events');
    });

    this.ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Log all message types to see what we're receiving
        if (message.txType && message.txType !== 'buy' && message.txType !== 'sell') {
          console.log('📨 [PumpPortal] Event:', message.txType, message.symbol || message.mint || '');
        }
        
        if (message.txType === 'create') {
          await this.handleNewToken(message);
        } else if (message.txType === 'migrate' || message.txType === 'complete') {
          // PumpPortal uses 'complete' when bonding curve is sold out
          console.log('🚀 [PumpPortal] BONDING CURVE COMPLETED:', message.symbol, message.mint);
          await this.handleMigration(message);
        } else if (message.txType === 'buy' || message.txType === 'sell') {
          // Handle trade events
          await this.handleTrade(message);
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
      // Log the full data to see what PumpPortal sends
      console.log('📦 PumpPortal token data:', JSON.stringify(data, null, 2));
      
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

        // Use market cap from PumpPortal data if available
        let marketCapSol = data.marketCapSol || data.vSolInBondingCurve || 0;
        
        // If no market cap from PumpPortal, try DexScreener
        if (marketCapSol === 0) {
          try {
            const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${data.mint}`);
            if (dexResponse.ok) {
              const dexData = await dexResponse.json();
              const pairs = dexData?.pairs || [];
              if (pairs.length > 0) {
                // Get SOL price to convert USD market cap to SOL
                const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
                if (solPriceResponse.ok) {
                  const solPriceData = await solPriceResponse.json();
                  const solPrice = solPriceData?.solana?.usd || 185;
                  
                  pairs.sort((a: any, b: any) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0));
                  const marketCapUsd = Number(pairs[0]?.marketCap || 0);
                  marketCapSol = marketCapUsd / solPrice;
                }
              }
            }
          } catch (e) {
            // Ignore market cap fetch errors
          }
        }
        
        // If still 0, use a small default for new tokens (typical initial buy is ~0.01-0.1 SOL)
        if (marketCapSol === 0 && data.initialBuy) {
          marketCapSol = data.initialBuy;
        }

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
            marketCapSol,
            data.createdTimestamp ? new Date(data.createdTimestamp) : new Date(),
            socialLinks.website,
            socialLinks.twitter,
            socialLinks.telegram,
            socialLinks.discord,
          ]
        );

        console.log(`✅ Saved token: ${data.symbol} (${data.mint}) - MC: ${marketCapSol.toFixed(2)} SOL`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error saving token to database:', error);
    }
  }

  private async handleMigration(data: TokenData) {
    try {
      const client = await pool.connect();
      
      try {
        await client.query(
          `UPDATE tokens 
           SET raydium_pool = $1, 
               migrated_at = $2,
               market_cap_sol = COALESCE($3, market_cap_sol),
               updated_at = CURRENT_TIMESTAMP
           WHERE mint = $4`,
          [
            data.raydiumPool || 'completed',
            data.timestamp ? new Date(data.timestamp) : new Date(),
            data.marketCapSol || data.completeMarketCapSol || null,
            data.mint,
          ]
        );

        console.log(`🚀 Token completed bonding curve: ${data.symbol} (${data.mint}) - MC: ${data.marketCapSol?.toFixed(2) || 'N/A'} SOL`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error saving migration to database:', error);
    }
  }

  private async handleTrade(data: any) {
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
            data.mint,
            data.txType, // 'buy' or 'sell'
            data.signature,
            data.traderPublicKey || data.user,
            data.solAmount || 0,
            data.tokenAmount || 0,
            data.pricePerToken || 0,
            data.marketCapSol || 0,
            data.timestamp ? new Date(data.timestamp) : new Date(),
          ]
        );

        // Log significant trades (> 1 SOL)
        const solAmount = Number(data.solAmount || 0);
        if (solAmount > 1) {
          console.log(`💰 ${data.txType?.toUpperCase()}: ${solAmount.toFixed(2)} SOL of ${data.symbol || data.mint}`);
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error saving trade to database:', error);
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
