import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Since Vercel doesn't support WebSockets, we'll return a message indicating this
  return res.status(200).json({
    success: false,
    message: 'WebSocket connections are not supported on Vercel. Using polling instead.',
    alternative: '/api/pumpportal/new-tokens'
  });
}
