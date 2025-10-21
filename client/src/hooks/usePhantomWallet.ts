import { useState, useEffect } from 'react';

interface PhantomWallet {
  publicKey: string | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (transaction: any) => Promise<any>;
  isPhantomInstalled: boolean;
}

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      on: (event: string, callback: (args: any) => void) => void;
      request: (method: string, params?: any) => Promise<any>;
      publicKey?: { toString: () => string };
      isConnected?: boolean;
    };
  }
}

export function usePhantomWallet(): PhantomWallet {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false);

  useEffect(() => {
    const checkPhantom = () => {
      if (window.solana && window.solana.isPhantom) {
        setIsPhantomInstalled(true);
        
        // Check if already connected
        if (window.solana.isConnected && window.solana.publicKey) {
          setPublicKey(window.solana.publicKey.toString());
          setConnected(true);
        }

        // Listen for account changes
        window.solana.on('accountChanged', (publicKey: any) => {
          console.log('Account changed:', publicKey);
          if (publicKey) {
            setPublicKey(publicKey.toString());
            setConnected(true);
          } else {
            setPublicKey(null);
            setConnected(false);
          }
        });

        // Listen for disconnection
        window.solana.on('disconnect', () => {
          console.log('Wallet disconnected');
          setPublicKey(null);
          setConnected(false);
        });

        // Listen for connection
        window.solana.on('connect', (publicKey: any) => {
          console.log('Wallet connected:', publicKey);
          if (publicKey) {
            setPublicKey(publicKey.toString());
            setConnected(true);
          }
        });
      } else {
        setIsPhantomInstalled(false);
        setConnected(false);
        setPublicKey(null);
      }
    };

    // Check immediately
    checkPhantom();

    // Check again after a short delay in case Phantom loads later
    const timeout = setTimeout(checkPhantom, 1000);

    // Also check when window loads
    window.addEventListener('load', checkPhantom);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('load', checkPhantom);
    };
  }, []);

  const connect = async () => {
    if (!window.solana || !window.solana.isPhantom) {
      throw new Error('Phantom wallet not found! Please install Phantom.');
    }

    try {
      console.log('Attempting to connect to Phantom wallet...');
      const response = await window.solana.connect({ onlyIfTrusted: false });
      console.log('Phantom connection response:', response);
      
      if (response && response.publicKey) {
        const pubKey = response.publicKey.toString();
        console.log('Setting wallet state:', { publicKey: pubKey.slice(0, 8) + '...', connected: true });
        setPublicKey(pubKey);
        setConnected(true);
        console.log('Successfully connected to Phantom wallet');
      } else {
        throw new Error('No public key received from Phantom wallet');
      }
    } catch (error) {
      console.error('Failed to connect to Phantom wallet:', error);
      setConnected(false);
      setPublicKey(null);
      throw error;
    }
  };

  const disconnect = async () => {
    if (window.solana) {
      try {
        await window.solana.disconnect();
        setPublicKey(null);
        setConnected(false);
      } catch (error) {
        console.error('Failed to disconnect from Phantom wallet:', error);
      }
    }
  };

  const signTransaction = async (transaction: any) => {
    if (!window.solana || !connected) {
      throw new Error('Wallet not connected');
    }

    try {
      return await window.solana.request('signTransaction', { transaction });
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw error;
    }
  };

  return {
    publicKey,
    connected,
    connect,
    disconnect,
    signTransaction,
    isPhantomInstalled,
  };
}