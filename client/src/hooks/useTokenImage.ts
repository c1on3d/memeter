import { useState, useEffect } from 'react';

export function useTokenImage(uri: string | null | undefined) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!uri) {
      setImageUrl(null);
      return;
    }

    const fetchImage = async () => {
      setIsLoading(true);
      try {
        // Fetch metadata from URI
        const response = await fetch(uri);
        if (response.ok) {
          const metadata = await response.json();
          
          // Extract image URL from metadata
          if (metadata.image) {
            // Replace slow IPFS gateways with faster ones
            let imgUrl = metadata.image;
            if (imgUrl.includes('ipfs.io')) {
              imgUrl = imgUrl.replace('ipfs.io', 'cf-ipfs.com');
            }
            setImageUrl(imgUrl);
          }
        }
      } catch (error) {
        console.log('Failed to fetch metadata:', error);
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [uri]);

  return { imageUrl, isLoading };
}

