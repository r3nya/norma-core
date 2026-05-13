import { useEffect, useRef } from 'react';
import webSocketManager from '@/api/websocket';

/**
 * Lifecycle hook that manages WebSocket connection start/stop.
 * Starts WebSocket on mount, disconnects on unmount.
 * Idempotent — safe to call in multiple components.
 */
export function useWebSocketLifecycle() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      console.log('WebSocket lifecycle: starting connection...');
      webSocketManager.start();
    }

    return () => {
      // Only disconnect if this was the component that started
      if (startedRef.current) {
        console.log('WebSocket lifecycle: disconnecting...');
        webSocketManager.disconnect();
        startedRef.current = false;
      }
    };
  }, []);
}
