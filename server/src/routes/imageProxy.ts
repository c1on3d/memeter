import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Image proxy to bypass CORS
router.get('/api/image-proxy', async (req, res) => {
  try {
    const imageUrl = req.query.url as string;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL parameter required' });
    }

    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 5000,
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }

    // Get content type
    const contentType = response.headers.get('content-type');
    
    // Set cache headers
    res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
    res.set('Content-Type', contentType || 'image/jpeg');
    
    // Pipe the image
    response.body?.pipe(res);
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

export default router;
