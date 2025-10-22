import { pool } from '../config/database.js';

export class MarketCapUpdater {
  private updateInterval: NodeJS.Timeout | null = null;
  private isUpdating = false;

  constructor() {
    // Start updating market caps every 30 seconds
    this.startUpdating();
  }

  private startUpdating() {
    console.log('📊 Starting market cap updater (30s interval)');
    
    // Update immediately on start
    this.updateMarketCaps();
    
    // Then update every 30 seconds
    this.updateInterval = setInterval(() => {
      this.updateMarketCaps();
    }, 30000);
  }

  private async updateMarketCaps() {
    if (this.isUpdating) {
      console.log('⏭️ Skipping market cap update (already in progress)');
      return;
    }

    this.isUpdating = true;

    try {
      // Get recent tokens (last 24 hours) that need market cap updates
      const result = await pool.query(
        `SELECT mint, symbol 
         FROM tokens 
         WHERE timestamp > NOW() - INTERVAL '24 hours'
         ORDER BY timestamp DESC
         LIMIT 100`
      );

      if (result.rows.length === 0) {
        console.log('📊 No recent tokens to update');
        this.isUpdating = false;
        return;
      }

      const mints = result.rows.map(row => row.mint);
      console.log(`📊 Updating market caps for ${mints.length} tokens...`);

      // Batch fetch from DexScreener (max 30 at a time due to API limits)
      const batchSize = 30;
      for (let i = 0; i < mints.length; i += batchSize) {
        const batch = mints.slice(i, i + batchSize);
        await this.updateBatch(batch);
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < mints.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`✅ Market cap update complete`);
    } catch (error) {
      console.error('❌ Error updating market caps:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  private async updateBatch(mints: string[]) {
    try {
      const mintsParam = mints.join(',');
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintsParam}`);
      
      if (!response.ok) {
        console.error(`❌ DexScreener API error: ${response.status}`);
        return;
      }

      const data: any = await response.json();
      const pairs = data?.pairs || [];

      if (pairs.length === 0) {
        return;
      }

      // Group pairs by mint and select best pair (highest liquidity)
      const bestPairs = new Map<string, any>();
      pairs.forEach((pair: any) => {
        const mint = pair?.baseToken?.address;
        if (!mint) return;

        const existing = bestPairs.get(mint);
        const liquidity = Number(pair?.liquidity?.usd || 0);
        
        if (!existing || liquidity > Number(existing?.liquidity?.usd || 0)) {
          bestPairs.set(mint, pair);
        }
      });

      // Update database with market data
      const client = await pool.connect();
      try {
        for (const [mint, pair] of bestPairs) {
          await client.query(
            `UPDATE tokens 
             SET 
               market_cap_usd = $1,
               price_usd = $2,
               volume_24h = $3,
               price_change_24h = $4,
               liquidity_usd = $5,
               pair_address = $6,
               updated_at = CURRENT_TIMESTAMP
             WHERE mint = $7`,
            [
              Number(pair.marketCap || 0),
              Number(pair.priceUsd || 0),
              Number(pair.volume?.h24 || 0),
              Number(pair.priceChange?.h24 || 0),
              Number(pair.liquidity?.usd || 0),
              pair.pairAddress,
              mint,
            ]
          );
        }
        
        console.log(`✅ Updated ${bestPairs.size} tokens with DexScreener data`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error updating batch:', error);
    }
  }

  public stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('📊 Market cap updater stopped');
    }
  }
}
