import { useState, useEffect, useRef } from 'react';

export interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket(url: string) {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const connect = () => {
    if (!mountedRef.current) return;
    
    setConnectionStatus('connecting');
    setError(null);

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      
      // Check if we're on Vercel (vercel.app domain)
      const isVercel = host.includes('.vercel.app') || host.includes('vercel.com');
      
      let wsUrl: string;
      if (isVercel) {
        // Vercel doesn't support WebSockets, so we'll simulate a connection
        console.log('Vercel environment detected - WebSocket not supported, using polling instead');
        setConnectionStatus('disconnected');
        setError('WebSocket not supported on Vercel. Using API polling for real-time data.');
        return;
      } else if (window.location.protocol === "https:" || host.includes('.replit.dev')) {
        wsUrl = `${protocol}//${host}${url}`;
      } else {
        const port = window.location.port || '5000';
        wsUrl = `${protocol}//${host}:${port}${url}`;
      }
      
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        setError(null);
        
        // Subscribe to updates
        ws.send(JSON.stringify({ method: 'subscribe' }));
        
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        
        console.log('WebSocket connection closed', event.code, event.reason);
        setConnectionStatus('disconnected');
        wsRef.current = null;
        
        // Attempt to reconnect after a delay (unless intentionally closed)
        if (event.code !== 1000 && event.code !== 1001) {
          setError('Connection lost. Attempting to reconnect...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, 3000);
        }
      };

      ws.onerror = (event) => {
        if (!mountedRef.current) return;
        
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        setConnectionStatus('disconnected');
      };

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setError('Failed to create WebSocket connection');
      setConnectionStatus('disconnected');
    }
  };

  const disconnect = () => {
    mountedRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
    
    setConnectionStatus('disconnected');
  };

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      disconnect();
    };
  }, [url]);

  return {
    connectionStatus,
    lastMessage,
    error,
    sendMessage,
    reconnect: connect,
  };
}