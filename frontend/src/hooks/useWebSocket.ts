import { useEffect, useRef, useState } from 'react';

export interface WebSocketMessage {
  type: 'DETECTION_CREATED' | 'ALERT_TRIGGERED' | 'WATCHLIST_UPDATED' | string;
  data: any;
}

export function useWebSocket(onMessage?: (msg: WebSocketMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Fallback to localhost:8000 for local dev
    const wsHost = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.hostname}:8000`;
    const wsUrl = `${wsHost}/ws/live`;

    let reconnectTimer: any = null;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (onMessage) {
              onMessage(parsed);
            }
          } catch (err) {
            console.error('WebSocket parse error:', err);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          // Try reconnecting in 3 seconds
          reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const send = (msg: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
    }
  };

  return { isConnected, send };
}
