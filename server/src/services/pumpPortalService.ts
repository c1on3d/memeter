import WebSocket from 'ws';
import type { DatabaseService } from '../database/service';

interface PumpPortalServiceOptions {
  publicBaseUrl: string;
  databaseService: DatabaseService | null;
  onToken: (token: any) => void;
  onMigration: (migration: any) => void;
}

interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  marketCapSol: number;
  marketCap?: number;
  price?: number;
  volume24h?: number;
  image: string | null;
  uri: string | null;
  pool: string;
  creator: string;
  createdAt: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  youtube?: string;
  instagram?: string;
  reddit?: string;
  tiktok?: string;
}

interface MigrationData {
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  migrationTime: string;
  marketCapAtMigration: number;
  volumeAtMigration: number;
}

export class PumpPortalService {
  private ws: WebSocket | null = null;
  private options: PumpPortalServiceOptions;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private isActive = false;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(options: PumpPortalServiceOptions) {
    this.options = options;
  }

  start() {
    this.isActive = true;
    this.connect();
  }

  // Fetch and parse token metadata from URI
  private async fetchTokenMetadata(uri: string): Promise<{
    image?: string;
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
    youtube?: string;
    instagram?: string;
    reddit?: string;
    tiktok?: string;
  }> {
    try {
      // IPFS gateways to try in order
      const ipfsGateways = [
        'https://gateway.pinata.cloud/ipfs/',
        'https://ipfs.io/ipfs/',
      ];

      // Handle IPFS URLs - extract hash and try multiple gateways
      let urlsToTry: string[] = [];
      if (uri.startsWith('ipfs://')) {
        const hash = uri.replace('ipfs://', '');
        urlsToTry = ipfsGateways.map(gateway => gateway + hash);
      } else if (uri.includes('/ipfs/')) {
        const match = uri.match(/\/ipfs\/([^/?]+)/);
        if (match) {
          urlsToTry = ipfsGateways.map(gateway => gateway + match[1]);
        } else {
          urlsToTry = [uri];
        }
      } else {
        urlsToTry = [uri];
      }

      let metadata: any = null;
      
      // Try each gateway
      for (const fetchUrl of urlsToTry) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout per attempt

          const response = await fetch(fetchUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json',
            },
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            metadata = await response.json();
            break; // Success, exit loop
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.warn(`Failed to fetch metadata from ${fetchUrl}:`, error.message);
          }
          // Continue to next gateway
        }
      }

      if (!metadata) {
        console.warn(`Failed to fetch metadata from all gateways for ${uri}`);
        return {};
      }

      // Extract image URL
      let image = metadata.image || metadata.imageUrl || metadata.logo || null;
      if (image && image.startsWith('ipfs://')) {
        image = image.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }

      // Extract social links - check multiple possible field names
      const result: any = { image };
      
      // Website
      if (metadata.external_url || metadata.website || metadata.externalUrl) {
        result.website = metadata.external_url || metadata.website || metadata.externalUrl;
      }

      // Twitter
      if (metadata.twitter || metadata.twitterUrl || metadata.extensions?.twitter) {
        let tw = metadata.twitter || metadata.twitterUrl || metadata.extensions?.twitter;
        if (tw && !tw.startsWith('http')) {
          tw = `https://twitter.com/${tw.replace('@', '')}`;
        }
        result.twitter = tw;
      }

      // Telegram
      if (metadata.telegram || metadata.telegramUrl || metadata.extensions?.telegram) {
        let tg = metadata.telegram || metadata.telegramUrl || metadata.extensions?.telegram;
        if (tg && !tg.startsWith('http')) {
          tg = `https://t.me/${tg.replace('@', '')}`;
        }
        result.telegram = tg;
      }

      // Discord
      if (metadata.discord || metadata.discordUrl || metadata.extensions?.discord) {
        result.discord = metadata.discord || metadata.discordUrl || metadata.extensions?.discord;
      }

      // YouTube
      if (metadata.youtube || metadata.youtubeUrl || metadata.extensions?.youtube) {
        result.youtube = metadata.youtube || metadata.youtubeUrl || metadata.extensions?.youtube;
      }

      // Instagram
      if (metadata.instagram || metadata.instagramUrl || metadata.extensions?.instagram) {
        result.instagram = metadata.instagram || metadata.instagramUrl || metadata.extensions?.instagram;
      }

      // Reddit
      if (metadata.reddit || metadata.redditUrl || metadata.extensions?.reddit) {
        result.reddit = metadata.reddit || metadata.redditUrl || metadata.extensions?.reddit;
      }

      // TikTok
      if (metadata.tiktok || metadata.tiktokUrl || metadata.extensions?.tiktok) {
        result.tiktok = metadata.tiktok || metadata.tiktokUrl || metadata.extensions?.tiktok;
      }

      return result;
    } catch (error) {
      if ((error as any)?.name !== 'AbortError') {
        console.warn(`Error fetching metadata from ${uri}:`, error instanceof Error ? error.message : error);
      }
      return {};
    }
  }

  private connect() {
    if (!this.isActive) return;

    try {
      console.log('🔌 Connecting to PumpPortal WebSocket...');
      this.ws = new WebSocket('wss://pumpportal.fun/api/data');

      this.ws.on('open', () => {
        console.log('✅ PumpPortal WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Subscribe to token creations and migrations
        const subscribeMessage = {
          method: 'subscribeNewToken',
        };
        this.ws?.send(JSON.stringify(subscribeMessage));
        console.log('📡 Subscribed to new token events');

        // Setup ping to keep connection alive
        this.setupPing();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ PumpPortal WebSocket error:', error.message);
      });

      this.ws.on('close', () => {
        console.log('🔌 PumpPortal WebSocket disconnected');
        this.clearPing();
        this.scheduleReconnect();
      });

    } catch (error) {
      console.error('❌ Failed to connect to PumpPortal:', error);
      this.scheduleReconnect();
    }
  }

  private setupPing() {
    this.clearPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  private clearPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (!this.isActive) return;
    if (this.reconnectTimeout) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5);
      
      console.log(`🔄 Reconnecting to PumpPortal in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect();
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached for PumpPortal');
    }
  }

  private handleMessage(message: any) {
    try {
      // Handle token creation events
      if (message.type === 'newToken' || message.txType === 'create') {
        const uri = message.uri || message.metadataUri || null;
        
        // Debug: Log raw message if name/symbol missing
        if (!message.name || !message.symbol) {
          console.log('⚠️ Token missing name/symbol. Raw message:', JSON.stringify(message).slice(0, 500));
        }
        
        // Initial token data
        const tokenData: TokenData = {
          mint: message.mint || message.signature,
          name: message.name || 'Unknown Token',
          symbol: message.symbol || 'UNK',
          marketCapSol: message.marketCapSol || message.marketCap || 0,
          marketCap: message.marketCap || message.marketCapSol || 0,
          price: message.price || message.initialBuy || 0,
          volume24h: message.volume24h || message.vTokensInBondingCurve || 0,
          image: message.image || message.imageUrl || null,
          uri,
          pool: message.pool || 'pump',
          creator: message.creator || message.traderPublicKey || '',
          createdAt: message.timestamp || new Date().toISOString(),
        };

        console.log('🆕 New token:', tokenData.symbol, '|', tokenData.name, `[${tokenData.pool}]`, uri ? '(has URI)' : '(no URI)', tokenData.image ? '(has image)' : '(no image)');
        
        // Add token immediately (fast response)
        this.options.onToken(tokenData);

        // Fetch metadata asynchronously in the background
        if (uri && !tokenData.image) {
          console.log('📡 Fetching metadata for', tokenData.symbol, 'from', uri);
          this.fetchTokenMetadata(uri).then(metadata => {
            const hasMetadata = !!(metadata.image || metadata.website || metadata.twitter || metadata.telegram);
            if (hasMetadata) {
              // Update token with metadata
              const updatedToken = { ...tokenData };
              if (metadata.image) updatedToken.image = metadata.image;
              if (metadata.website) updatedToken.website = metadata.website;
              if (metadata.twitter) updatedToken.twitter = metadata.twitter;
              if (metadata.telegram) updatedToken.telegram = metadata.telegram;
              if (metadata.discord) updatedToken.discord = metadata.discord;
              if (metadata.youtube) updatedToken.youtube = metadata.youtube;
              if (metadata.instagram) updatedToken.instagram = metadata.instagram;
              if (metadata.reddit) updatedToken.reddit = metadata.reddit;
              if (metadata.tiktok) updatedToken.tiktok = metadata.tiktok;

              console.log('✅ Metadata fetched for', tokenData.symbol, '- image:', !!metadata.image, 'links:', Object.keys(metadata).filter(k => k !== 'image' && metadata[k]).length);
              
              // Update in memory
              this.options.onToken(updatedToken);
              
              // Save updated version to database
              if (this.options.databaseService) {
                this.options.databaseService.saveToken(updatedToken).catch(err => {
                  console.error('Failed to save token metadata to database:', err);
                });
              }
            }
          }).catch(err => {
            console.warn(`Failed to fetch metadata for ${tokenData.symbol}:`, err.message);
          });
        } else {
          // Save to database immediately if no metadata to fetch
          if (this.options.databaseService) {
            this.options.databaseService.saveToken(tokenData).catch(err => {
              console.error('Failed to save token to database:', err);
            });
          }
        }
      }

      // Handle migration events (Raydium graduation)
      if (message.type === 'migration' || message.txType === 'migrate') {
        const migrationData: MigrationData = {
          tokenMint: message.mint || message.signature,
          tokenName: message.name || 'Unknown',
          tokenSymbol: message.symbol || 'UNK',
          migrationTime: message.timestamp || new Date().toISOString(),
          marketCapAtMigration: message.marketCapSol || message.marketCap || 0,
          volumeAtMigration: message.vTokensInBondingCurve || message.volume || 0,
        };

        console.log('🚀 Token migrated:', migrationData.tokenSymbol);
        this.options.onMigration(migrationData);

        // Save to database if available
        if (this.options.databaseService) {
          this.options.databaseService.saveMigration(migrationData).catch(err => {
            console.error('Failed to save migration to database:', err);
          });
        }
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  disconnect() {
    this.isActive = false;
    this.clearPing();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    console.log('🔌 PumpPortal service disconnected');
  }
}

export default PumpPortalService;
