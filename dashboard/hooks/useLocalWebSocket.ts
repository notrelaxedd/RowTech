"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// =============================================================================
// useLocalWebSocket — Direct WebSocket connection to the hub on the LAN.
//
// When connected, sensor frames arrive in ~5ms (ESP-NOW → hub → push → browser)
// with no internet dependency. Falls back gracefully to disconnected state so
// useRowTech can switch to the Supabase broadcast path.
//
// Hub advertises itself via mDNS as "rowtech.local" on port 81.
// The user can override the host via the HUB_HOST localStorage key.
// =============================================================================

export type LocalSensorFrame = {
  mac:            string;
  phase:          number;
  roll:           number;
  pitch:          number;
  featherAngle:   number;
  rushScore:      number;
  strokeRate:     number;
  catchSharpness: number;
  batteryVoltage: number;
  timestamp:      number;
};

type Options = {
  onFrame:       (frame: LocalSensorFrame) => void;
  onConnect?:    () => void;
  onDisconnect?: () => void;
};

const RECONNECT_DELAY_MS = 2000;
const PING_INTERVAL_MS   = 5000;   // keep-alive so router doesn't drop idle WS

export function useLocalWebSocket({ onFrame, onConnect, onDisconnect }: Options) {
  const [isConnected, setIsConnected] = useState(false);
  const [hubHost,     setHubHostState] = useState<string>(() => {
    if (typeof window === "undefined") return "rowtech.local";
    return localStorage.getItem("HUB_HOST") ?? "rowtech.local";
  });

  const wsRef         = useRef<WebSocket | null>(null);
  const reconnectRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef    = useRef(true);
  const onFrameRef    = useRef(onFrame);
  const onConnectRef  = useRef(onConnect);
  const onDisconnRef  = useRef(onDisconnect);

  // Keep callback refs current without re-triggering the connect effect
  useEffect(() => { onFrameRef.current    = onFrame;      }, [onFrame]);
  useEffect(() => { onConnectRef.current  = onConnect;    }, [onConnect]);
  useEffect(() => { onDisconnRef.current  = onDisconnect; }, [onDisconnect]);

  const disconnect = useCallback(() => {
    if (reconnectRef.current) { clearTimeout(reconnectRef.current);  reconnectRef.current = null; }
    if (pingRef.current)      { clearInterval(pingRef.current);      pingRef.current      = null; }
    if (wsRef.current) {
      wsRef.current.onclose   = null;   // prevent reconnect loop on intentional close
      wsRef.current.onerror   = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback((host: string) => {
    if (!mountedRef.current) return;
    disconnect();

    // Browsers block ws:// from https:// pages (mixed content).
    // When served over HTTPS, the user must run the dashboard locally (http://)
    // or use a local dev server. We try anyway and let the browser surface the error.
    const url = `ws://${host}:81`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      // WebSocket constructor can throw if the URL scheme is blocked
      reconnectRef.current = setTimeout(() => connect(host), RECONNECT_DELAY_MS);
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      setIsConnected(true);
      onConnectRef.current?.();

      // Keep-alive ping (hub ignores unknown messages, browser resets idle timer)
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (evt) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(evt.data as string) as Record<string, unknown>;
        // Skip the hello handshake message
        if (data.type === "hello") return;
        onFrameRef.current(data as unknown as LocalSensorFrame);
      } catch {
        // Ignore malformed frames
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
      setIsConnected(false);
      onDisconnRef.current?.();
      // Auto-reconnect
      reconnectRef.current = setTimeout(() => connect(host), RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      // onclose fires immediately after onerror — reconnect handled there
    };
  }, [disconnect]);

  // Connect on mount and whenever hubHost changes
  useEffect(() => {
    mountedRef.current = true;
    connect(hubHost);
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [hubHost, connect, disconnect]);

  // Persist + apply a new hub host
  const setHubHost = useCallback((host: string) => {
    const trimmed = host.trim();
    if (!trimmed) return;
    localStorage.setItem("HUB_HOST", trimmed);
    setHubHostState(trimmed);
  }, []);

  return { isConnected, hubHost, setHubHost };
}
