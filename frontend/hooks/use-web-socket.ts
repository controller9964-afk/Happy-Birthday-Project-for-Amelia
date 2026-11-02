"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SocketStatus = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

type UseWebSocketOptions<T> = {
  url: string;
  parseMessage: (value: unknown) => T | null;
  onOpen?: (socket: WebSocket) => void;
  onMessage: (message: T, socket: WebSocket) => void;
  onError?: () => void;
  onDisconnect?: (event: CloseEvent) => void;
  shouldReconnect?: (event: CloseEvent) => boolean;
  onReconnectExhausted?: () => void;
  maximumReconnectAttempts?: number;
};

const reconnectDelay = (attempt: number) => Math.min(1000 * 2 ** (attempt - 1), 30_000);

export function useWebSocket<T>({
  url,
  parseMessage,
  onOpen,
  onMessage,
  onError,
  onDisconnect,
  shouldReconnect = (event) => event.code !== 1000 && event.code !== 1008,
  onReconnectExhausted,
  maximumReconnectAttempts = Number.POSITIVE_INFINITY,
}: UseWebSocketOptions<T>) {
  const [status, setStatus] = useState<SocketStatus>("idle");
  const [error, setError] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef({ parseMessage, onOpen, onMessage, onError, onDisconnect, shouldReconnect, onReconnectExhausted });
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const requestedRef = useRef(false);
  const mountedRef = useRef(true);
  const connectRef = useRef<() => void>(() => {});

  useEffect(() => {
    callbacksRef.current = { parseMessage, onOpen, onMessage, onError, onDisconnect, shouldReconnect, onReconnectExhausted };
  }, [onDisconnect, onError, onMessage, onOpen, onReconnectExhausted, parseMessage, shouldReconnect]);

  const clearTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    requestedRef.current = true;
    clearTimer();
    const activeSocket = socketRef.current;
    if (
      activeSocket &&
      (activeSocket.readyState === WebSocket.CONNECTING || activeSocket.readyState === WebSocket.OPEN)
    ) return;

    setStatus(reconnectAttemptRef.current ? "reconnecting" : "connecting");
    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        if (socketRef.current !== socket) return;
        setError("");
        callbacksRef.current.onOpen?.(socket);
      };
      socket.onmessage = (event) => {
        if (socketRef.current !== socket) return;
        try {
          const parsed = callbacksRef.current.parseMessage(JSON.parse(event.data) as unknown);
          if (parsed === null) throw new Error("Unrecognized chat event");
          callbacksRef.current.onMessage(parsed, socket);
        } catch {
          setError("A chat update could not be read. Reconnecting…");
          socket.close();
        }
      };
      socket.onerror = () => {
        if (socketRef.current !== socket) return;
        setError("The chat connection had a little hiccup. Reconnecting…");
        callbacksRef.current.onError?.();
      };
      socket.onclose = (event) => {
        if (socketRef.current !== socket) return;
        socketRef.current = null;
        if (!requestedRef.current || !mountedRef.current) {
          setStatus("idle");
          return;
        }
        if (!callbacksRef.current.shouldReconnect(event)) {
          requestedRef.current = false;
          setStatus("disconnected");
          callbacksRef.current.onDisconnect?.(event);
          return;
        }

        reconnectAttemptRef.current += 1;
        if (reconnectAttemptRef.current > maximumReconnectAttempts) {
          requestedRef.current = false;
          setStatus("disconnected");
          callbacksRef.current.onReconnectExhausted?.();
          return;
        }
        setStatus("reconnecting");
        reconnectTimerRef.current = setTimeout(
          () => connectRef.current(),
          reconnectDelay(reconnectAttemptRef.current),
        );
      };
    } catch {
      setError("The chat connection could not be started. Please try again.");
      setStatus("disconnected");
    }
  }, [clearTimer, maximumReconnectAttempts, url]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const send = useCallback((payload: unknown) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
      socket.send(JSON.stringify(payload));
      return true;
    } catch {
      setError("Your message could not be sent. It will be retried after reconnecting.");
      socket.close();
      return false;
    }
  }, []);

  const close = useCallback((code = 1000, reason = "Leaving chat") => {
    requestedRef.current = false;
    reconnectAttemptRef.current = 0;
    clearTimer();
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close(code, reason);
    setStatus("idle");
  }, [clearTimer]);

  const markConnected = useCallback(() => {
    reconnectAttemptRef.current = 0;
    setStatus("connected");
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestedRef.current = false;
      clearTimer();
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, "Leaving chat");
    };
  }, [clearTimer]);

  return { status, error, setError, connect, send, close, markConnected };
}
