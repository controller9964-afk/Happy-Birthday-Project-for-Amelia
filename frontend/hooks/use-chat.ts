"use client";

import { useCallback, useEffect, useState } from "react";
import { createLocalId, readStoredArray, writeStoredArray } from "@/lib/local-storage";
import { validateText } from "@/lib/text-validation";

type ChatMessage = {
  id: string;
  nickname: string;
  content: string;
  created_at: string;
};

const nicknameKey = "amelia-chat-nickname";
const messagesKey = "amelia-chat-messages";
const maximumNicknameLength = 24;
const maximumMessageLength = 500;
const maximumStoredMessages = 100;

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

function readMessages(): ChatMessage[] {
  return readStoredArray(messagesKey, isChatMessage, "chat messages")
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .slice(-maximumStoredMessages);
}

export function useChat() {
  const [draftNickname, setDraftNickname] = useState("");
  const [nicknameReady, setNicknameReady] = useState(false);
  const [nickname, setNickname] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connection, setConnection] = useState<"idle" | "connected">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setDraftNickname(window.localStorage.getItem(nicknameKey) ?? "");
      setMessages(readMessages());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Saved chat data could not be read.");
    }
    setNicknameReady(true);

    const syncMessages = (event: StorageEvent) => {
      if (event.key !== messagesKey && event.key !== null) return;
      try {
        setMessages(readMessages());
        setError("");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Saved chat data could not be read.");
      }
    };

    window.addEventListener("storage", syncMessages);
    return () => window.removeEventListener("storage", syncMessages);
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

    setNickname(clean);
    setDraftNickname(clean);
    setConnection("connected");
    setError("");
    setStatusMessage("Connected to this browser’s Cozy Corner.");
    return true;
  }, []);

  const leaveRoom = useCallback(() => {
    setConnection("idle");
    setStatusMessage("You’ve left the room. Messages remain saved in this browser.");
  }, []);

  const sendMessage = useCallback(async (contentInput: string) => {
    const content = contentInput.trim();
    const validationError = validateText(content, maximumMessageLength);
    if (validationError) {
      setError(validationError);
      return false;
    }
    if (connection !== "connected" || !nickname) {
      setError("Join the room before sending a message.");
      return false;
    }

    const message = {
      id: createLocalId(),
      nickname,
      content,
      created_at: new Date().toISOString(),
    };
    const next = [...messages, message].slice(-maximumStoredMessages);

    try {
      writeStoredArray(messagesKey, next);
      setMessages(next);
      setError("");
      setStatusMessage("Your message was saved in this browser.");
      return true;
    } catch {
      setError("Your message could not be saved. Check this browser’s storage settings and try again.");
      return false;
    }
  }, [connection, messages, nickname]);

  const deleteMessage = useCallback((messageId: string) => {
    const next = messages.filter((message) => message.id !== messageId);
    try {
      writeStoredArray(messagesKey, next);
      setMessages(next);
      setError("");
      setStatusMessage("Message deleted from this browser.");
      return true;
    } catch {
      setError("The message could not be deleted. Check this browser’s storage settings and try again.");
      return false;
    }
  }, [messages]);

  return {
    draftNickname,
    setDraftNickname,
    nicknameReady,
    nickname,
    messages,
    connection,
    statusMessage,
    error,
    joinRoom,
    leaveRoom,
    sendMessage,
    deleteMessage,
  };
}
