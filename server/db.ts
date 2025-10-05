import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket constructor for Neon
neonConfig.webSocketConstructor = ws;

// Check if we have a valid database URL
const hasValidDatabaseUrl = process.env.DATABASE_URL && 
  !process.env.DATABASE_URL.includes('placeholder') && 
  process.env.DATABASE_URL.startsWith('postgresql://');

let pool: Pool | null = null;
let db: any = null;

if (hasValidDatabaseUrl) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.warn('⚠️ Database connection failed:', error.message);
    pool = null;
    db = null;
  }
} else {
  console.warn('⚠️ No valid database URL provided, running in database-free mode');
}

export { pool, db };