/**
 * useWebSocket Hook
 * Manages WebSocket connection for real-time AI Moderation Queue
 * Features: Auto-reconnect, connection status indicator
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WebSocketStatus, WSMessage, AdminIncident } from '@/types/admin';

interface UseWebSocketOptions {
  onIncident?: (incident: AdminIncident) => void;
  onModerationUpdate?: (incidentId: number, outcome: 'approved' | 'rejected') => void;
  onBacklog?: (incidents: AdminIncident[]) => void;
  reconnectInterval?: number;
  pingInterval?: number;
}

interface UseWebSocketReturn {
  status: WebSocketStatus;
  adminCount: number;
  sendModeration: (incidentId: number, outcome: 'approved' | 'rejected') => void;
  reconnect: () => void;
}

// Build WebSocket URL from API URL
const getWebSocketUrl = (): string => {
  const apiUrl =
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.REACT_APP_BACKEND_URL ||
    '';
  
  // If it's a full URL, use that; otherwise use window.location.origin
  const httpBase = apiUrl.startsWith('http')
    ? apiUrl.replace(/\/$/, '')
    : window.location.origin;
  
  // Convert https -> wss, http -> ws
  return httpBase.replace(/^https/, 'wss').replace(/^http:\/\//, 'ws://');
};

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    onIncident,
    onModerationUpdate,
    onBacklog,
    reconnectInterval = 5000,
    pingInterval = 30000,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>('connecting');
  const [adminCount, setAdminCount] = useState(1);
  
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (pingRef.current) {
      clearInterval(pingRef.current);
      pingRef.current = null;
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    
    cleanup();
    setStatus('connecting');

    try {
      const token = localStorage.getItem('snaproad_admin_token');
      const wsUrl = `${getWebSocketUrl()}/api/ws/admin/moderation${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setStatus('live');
        
        // Start ping interval to keep connection alive
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, pingInterval);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const msg: WSMessage = JSON.parse(event.data);
          
          switch (msg.type) {
            case 'pong':
              setAdminCount(msg.admin_count || 1);
              break;
              
            case 'backlog':
              if (msg.incidents && onBacklog) {
                onBacklog(msg.incidents);
              }
              break;
              
            case 'new_incident':
              if (msg.incident && onIncident) {
                onIncident(msg.incident);
              }
              break;
              
            case 'moderation_update':
              if (msg.incident_id !== undefined && msg.outcome && onModerationUpdate) {
                onModerationUpdate(msg.incident_id, msg.outcome);
              }
              break;
          }
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setStatus('offline');
        cleanup();
        
        // Auto-reconnect
        reconnectRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connect();
          }
        }, reconnectInterval);
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setStatus('offline');
        ws.close();
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      setStatus('offline');
      
      // Retry connection
      reconnectRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, reconnectInterval);
    }
  }, [cleanup, onBacklog, onIncident, onModerationUpdate, pingInterval, reconnectInterval]);

  const sendModeration = useCallback(
    (incidentId: number, outcome: 'approved' | 'rejected') => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'moderate',
            incident_id: incidentId,
            outcome,
          })
        );
      }
    },
    []
  );

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      cleanup();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, cleanup]);

  return {
    status,
    adminCount,
    sendModeration,
    reconnect,
  };
}

export default useWebSocket;
