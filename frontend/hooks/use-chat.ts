"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  connectToSharedChat,
  loadSharedChatHistory,
  sendSharedChatMessage,
  type ChatConnectionStatus,
  type SharedChatConnection,
} from "@/lib/shared-chat";
import type { ChatMessage } from "@/lib/supabase";
import { validateText } from "@/lib/text-validation";

const nicknameKey = "amelia-chat-nickname";
const maximumNicknameLength = 24;
const maximumMessageLength = 500;
const maximumStoredMessages = 100;
const configurationMessage = "Shared chat is not configured yet. Add the Supabase URL and anon key to the frontend environment.";

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === "string" &&
    typeof message.nickname === "string" &&
    typeof message.content === "string" &&
    typeof message.created_at === "string"
  );
}

export function useChat() {
  const [draftNickname, setDraftNickname] = useState("");
  const [nicknameReady, setNicknameReady] = useState(false);
  const [nickname, setNickname] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [online, setOnline] = useState(0);
  const [connection, setConnection] = useState<"idle" | "connecting" | "connected" | "reconnecting" | "disconnected">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const messagesRef = useRef<ChatMessage[]>([]);
  const channelRef = useRef<SharedChatConnection | null>(null);

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    const merged = new Map(messagesRef.current.map((message) => [message.id, message]));
    for (const message of incoming) merged.set(message.id, message);
    const next = [...merged.values()]
      .sort((left, right) => left.created_at.localeCompare(right.created_at))
      .slice(-maximumStoredMessages);
    messagesRef.current = next;
    setMessages(next);
  }, []);

  useEffect(() => {
    try {
      setDraftNickname(window.localStorage.getItem(nicknameKey) ?? "");
    } catch {
      setStatusMessage("Your nickname cannot be saved in this browser.");
    }
    setNicknameReady(true);

    return () => {
      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) void channel.disconnect();
    };
  }, []);

  const joinRoom = useCallback((nicknameInput: string) => {
    const clean = nicknameInput.trim().replace(/\s+/g, " ");
    const validationError = validateText(clean, maximumNicknameLength);
    if (validationError) {
      setError(`Please choose a nickname between 1 and ${maximumNicknameLength} characters.`);
      return false;
    }
    try {
      window.localStorage.setItem(nicknameKey, clean);
    } catch {
      setError("Your nickname could not be saved in this browser. Check its storage settings and try again.");
      return false;
    }

    const previousChannel = channelRef.current;
    channelRef.current = null;
    if (previousChannel) {
      void previousChannel.disconnect().catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "The previous chat connection could not be closed.");
      });
    }

    setNickname(clean);
    setDraftNickname(clean);
    setConnection("connecting");
    setOnline(0);
    setError("");
    setStatusMessage("Connecting to the shared Cozy Corner…");

    let channel: SharedChatConnection | null = null;
    channel = connectToSharedChat(clean, {
      onMessage: (message) => {
        if (channelRef.current === channel) mergeMessages([message]);
      },
      onPresence: (count) => {
        if (channelRef.current === channel) setOnline(count);
      },
      onError: (message) => {
        if (channelRef.current === channel) setError(message);
      },
      onStatus: (status: ChatConnectionStatus) => {
        if (channelRef.current !== channel) return;
        if (status === "SUBSCRIBED") {
          setConnection("connected");
          setStatusMessage("Connected to the shared Cozy Corner.");
          setError("");
          void loadSharedChatHistory()
            .then((history) => {
              if (channelRef.current === channel) mergeMessages(history);
            })
            .catch((reason: unknown) => {
              if (channelRef.current === channel) {
                setError(reason instanceof Error ? reason.message : "Could not load shared chat history.");
              }
            });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnection("reconnecting");
          setError("The shared chat connection was interrupted. Reconnecting…");
        } else if (status === "CLOSED") {
          setConnection("disconnected");
        }
      },
    });
    if (!channel) {
      setConnection("idle");
      setError(configurationMessage);
      return false;
    }

    channelRef.current = channel;
    return true;
  }, [mergeMessages]);

  const leaveRoom = useCallback(() => {
    const channel = channelRef.current;
    channelRef.current = null;
    setConnection("idle");
    setOnline(0);
    setStatusMessage("You’ve left the shared room. The conversation remains available to other visitors.");
    if (channel) void channel.disconnect().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "The chat connection could not be closed cleanly.");
    });
  }, []);

  const sendMessage = useCallback(async (contentInput: string) => {
    const content = contentInput.trim();
    const validationError = validateText(content, maximumMessageLength);
    if (validationError) {
      setError(validationError);
      return false;
    }
    if (connection !== "connected" || !nickname) {
      setError("Connect to the shared room before sending a message.");
      return false;
    }

    try {
      const message = await sendSharedChatMessage(nickname, content);
      if (!isChatMessage(message)) {
        setError("The shared chat returned an invalid message.");
        return false;
      }
      mergeMessages([message]);
      setError("");
      setStatusMessage("Your message was shared with the room.");
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your message could not be shared.");
      return false;
    }
  }, [connection, mergeMessages, nickname]);

  return {
    draftNickname,
    setDraftNickname,
    nicknameReady,
    nickname,
    messages,
    online,
    connection,
    statusMessage,
    error,
    joinRoom,
    leaveRoom,
    sendMessage,
  };
}
