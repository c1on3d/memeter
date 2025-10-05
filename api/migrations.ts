import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Return demo migration data since we don't have a database on Vercel
    const demoMigrations = Array.from({ length: 15 }, (_, i) => ({
      id: `migration_${i + 1}`,
      tokenAddress: `migrated_token_${i + 1}`,
      tokenName: `Migrated Token ${i + 1}`,
      tokenSymbol: `MIG${i + 1}`,
      fromPool: 'pump',
      toPool: 'raydium',
      migrationTime: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(), // Last 7 days
      migrationThreshold: Math.floor(Math.random() * 100) + 30,
      success: Math.random() > 0.1, // 90% success rate
      volume: Math.floor(Math.random() * 1000000) + 10000,
    }));

    res.status(200).json({
      success: true,
      migrations: demoMigrations,
      total: demoMigrations.length,
      note: 'Using demo migration data',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in migrations API:', error);
    
    // Return empty migrations on error
    res.status(200).json({
      success: true,
      migrations: [],
      total: 0,
      note: 'No migration data available',
      timestamp: new Date().toISOString()
    });
  }
}
