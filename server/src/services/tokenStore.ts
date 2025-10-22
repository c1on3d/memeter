// In-memory token storage (no database required)
export interface Token {
  mint: string;
  name: string;
  symbol: string;
  uri?: string;
  image?: string;
  description?: string;
  creator?: string;
  marketCapSol?: number;
  timestamp: Date;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
}

class TokenStore {
  private tokens: Map<string, Token> = new Map();
  private maxTokens = 500; // Keep last 500 tokens in memory

  addToken(token: Token) {
    this.tokens.set(token.mint, token);
    
    // Keep only the most recent tokens
    if (this.tokens.size > this.maxTokens) {
      const sortedTokens = Array.from(this.tokens.values())
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      this.tokens.clear();
      sortedTokens.slice(0, this.maxTokens).forEach(t => {
        this.tokens.set(t.mint, t);
      });
    }
  }

  getRecentTokens(limit: number = 50): Token[] {
    return Array.from(this.tokens.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getToken(mint: string): Token | undefined {
    return this.tokens.get(mint);
  }

  searchTokens(query: string, limit: number = 20): Token[] {
    const q = query.toLowerCase();
    return Array.from(this.tokens.values())
      .filter(t => 
        t.mint.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q)
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getCount(): number {
    return this.tokens.size;
  }
}

export const tokenStore = new TokenStore();
