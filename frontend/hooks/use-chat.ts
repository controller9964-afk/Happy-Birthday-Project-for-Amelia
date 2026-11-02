"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient, getWebSocketUrl, validateText } from "@/lib/api-client";
import {
  parseServerChatEvent,
  type ChatMessage,
  type ClientChatEvent,
  type ServerChatEvent,
} from "@/lib/chat-protocol";
import { useWebSocket } from "@/hooks/use-web-socket";

const nicknameKey = "amelia-chat-nickname";
const maximumNicknameLength = 24;
const maximumMessageLength = 500;

export function useChat() {
  const [draftNickname, setDraftNickname] = useState("");
  const [nicknameReady, setNicknameReady] = useState(false);
  const [nickname, setNickname] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [online, setOnline] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const historyLoadedRef = useRef(false);
  const nicknameRef = useRef("");
  const pendingMessagesRef = useRef(new Map<string, string>());
  const initializedSocketsRef = useRef(new WeakSet<WebSocket>());
  const markConnectedRef = useRef<() => void>(() => {});

  const addOrUpdateMessage = useCallback((incoming: ChatMessage) => {
    setMessages((current) => {
      const existing = current.findIndex((message) => message.id === incoming.id);
      if (existing < 0) return [...current, incoming].slice(-100);
      const updated = [...current];
      updated[existing] = { ...updated[existing], ...incoming };
      return updated;
    });
  }, []);

  const handleServerEvent = useCallback((data: ServerChatEvent, socket: WebSocket) => {
    if (data.type === "message_history") {
      const history = data.messages.slice(-100);
      historyLoadedRef.current = true;
      for (const message of history) {
        if (message.client_message_id) pendingMessagesRef.current.delete(message.client_message_id);
      }
      setMessages(history.map((message) => ({ ...message, is_self: Boolean(message.is_self) })));
    } else if (data.type === "online_count") {
      setOnline(typeof data.count === "number" ? data.count : 0);
      if (historyLoadedRef.current && !initializedSocketsRef.current.has(socket)) {
        initializedSocketsRef.current.add(socket);
        markConnectedRef.current();
        setStatusMessage("");
        setError("");
        for (const [clientMessageId, content] of pendingMessagesRef.current) {
          const pending: ClientChatEvent = { type: "message", client_message_id: clientMessageId, content };
          socket.send(JSON.stringify(pending));
        }
      }
    } else if (data.type === "message") {
      const message = { ...data.message, is_self: Boolean(data.is_self) };
      addOrUpdateMessage(message);
      if (message.client_message_id) pendingMessagesRef.current.delete(message.client_message_id);
    } else if (data.type === "join") {
      setStatusMessage(data.nickname ? `${data.nickname} found a seat.` : "Someone joined the room.");
      if (typeof data.online === "number") setOnline(data.online);
    } else if (data.type === "leave") {
      setStatusMessage(data.nickname ? `${data.nickname} stepped away.` : "Someone stepped away.");
      if (typeof data.online === "number") setOnline(data.online);
    } else if (data.type === "error") {
      setError(data.error ?? "That message could not be sent.");
    } else if (data.type === "moderation_event") {
      if (data.event === "message_deleted" && typeof data.message_id === "number") {
        setMessages((current) => current.filter((message) => message.id !== data.message_id));
      } else if (data.event === "muted") {
        setError("A moderator has paused your messages for now.");
      }
    }
  }, [addOrUpdateMessage]);

  const callbacksRef = useRef(handleServerEvent);
  callbacksRef.current = handleServerEvent;
  const onMessage = useCallback((event: ServerChatEvent, socket: WebSocket) => callbacksRef.current(event, socket), []);

  const socketReconnect = useWebSocket<ServerChatEvent>({
    url: getWebSocketUrl("/ws/chat"),
    parseMessage: parseServerChatEvent,
    onOpen: (socket) => {
      if (!nicknameRef.current) return;
      const join: ClientChatEvent = { type: "join", nickname: nicknameRef.current };
      socket.send(JSON.stringify(join));
    },
    onMessage,
    shouldReconnect: (event) => event.code !== 1000 && event.code !== 1008,
    onDisconnect: (event) => {
      if (event.code === 1008) setError(event.reason || "You can’t rejoin the room right now.");
    },
    onReconnectExhausted: () => setError("The chat could not reconnect. Please try joining again."),
  });
  markConnectedRef.current = socketReconnect.markConnected;

  useEffect(() => {
    try {
      setDraftNickname(localStorage.getItem(nicknameKey) ?? "");
    } catch {
      setStatusMessage("Your nickname won’t be saved in this browser.");
    }
    setNicknameReady(true);
  }, []);

  useEffect(() => {
    if (socketReconnect.error) setError(socketReconnect.error);
  }, [socketReconnect.error]);

  const joinRoom = useCallback((nicknameInput: string) => {
    const clean = nicknameInput.trim().replace(/\s+/g, " ");
    const validationError = validateText(clean, maximumNicknameLength);
    if (validationError) {
      setError(`Please choose a nickname between 1 and ${maximumNicknameLength} characters.`);
      return false;
    }
    nicknameRef.current = clean;
    try {
      localStorage.setItem(nicknameKey, clean);
    } catch {
      setStatusMessage("Your nickname won’t be saved in this browser.");
    }
    historyLoadedRef.current = false;
    setNickname(clean);
    setDraftNickname(clean);
    setMessages([]);
    setError("");
    setStatusMessage("");
    socketReconnect.connect();
    return true;
  }, [socketReconnect.connect]);

  const leaveRoom = useCallback(() => {
    historyLoadedRef.current = false;
    pendingMessagesRef.current.clear();
    socketReconnect.close();
    setOnline((current) => Math.max(0, current - 1));
    setStatusMessage("You’ve left the room. You’re welcome back anytime.");
  }, [socketReconnect.close]);

  const sendMessage = useCallback((contentInput: string) => {
    const content = contentInput.trim();
    const validationError = validateText(content, maximumMessageLength);
    if (validationError) {
      setError(validationError);
      return false;
    }
    if (socketReconnect.status !== "connected") {
      setError("You’re offline. Your message will be ready when you reconnect.");
      return false;
    }

    const clientMessageId = crypto.randomUUID();
    pendingMessagesRef.current.set(clientMessageId, content);
    const event: ClientChatEvent = { type: "message", client_message_id: clientMessageId, content };
    if (!socketReconnect.send(event)) {
      setError("Your message could not be sent. It will be retried after reconnecting.");
      return false;
    }
    setError("");
    return true;
  }, [socketReconnect.send, socketReconnect.status]);

  const reportMessage = useCallback(async (messageId: number) => {
    try {
      await apiClient.reportChatMessage(messageId, "Reported by a Cozy Corner visitor");
      setStatusMessage("Thanks. Your report was sent to the moderators.");
      setError("");
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your report could not be sent.");
      return false;
    }
  }, []);

  return {
    draftNickname,
    setDraftNickname,
    nicknameReady,
    nickname,
    messages,
    online,
    connection: socketReconnect.status,
    statusMessage,
    error,
    setError,
    joinRoom,
    leaveRoom,
    sendMessage,
    reportMessage,
  };
}
