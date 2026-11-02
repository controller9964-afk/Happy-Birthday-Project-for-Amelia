export type ChatMessage = {
  id: number;
  nickname: string;
  content: string;
  created_at: string;
  is_self?: boolean;
  client_message_id?: string;
};

export type ClientChatEvent =
  | { type: "join"; nickname: string }
  | { type: "message"; client_message_id: string; content: string };

export type ServerChatEvent =
  | { type: "message_history"; messages: ChatMessage[] }
  | { type: "online_count"; count: number }
  | { type: "join" | "leave"; nickname: string; online: number }
  | { type: "message"; message: ChatMessage; is_self?: boolean }
  | { type: "error"; error: string }
  | { type: "moderation_event"; event: string; message_id?: number; muted_until?: string };

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === "number" &&
    typeof message.nickname === "string" &&
    typeof message.content === "string" &&
    typeof message.created_at === "string" &&
    (message.is_self === undefined || typeof message.is_self === "boolean") &&
    (message.client_message_id === undefined || typeof message.client_message_id === "string")
  );
}

export function parseServerChatEvent(value: unknown): ServerChatEvent | null {
  if (typeof value !== "object" || value === null || !("type" in value) || typeof value.type !== "string") {
    return null;
  }
  const event = value as Record<string, unknown>;
  switch (event.type) {
    case "message_history":
      return Array.isArray(event.messages) && event.messages.every(isChatMessage)
        ? { type: event.type, messages: event.messages }
        : null;
    case "online_count":
      return typeof event.count === "number" ? { type: event.type, count: event.count } : null;
    case "join":
    case "leave":
      return typeof event.nickname === "string" && typeof event.online === "number"
        ? { type: event.type, nickname: event.nickname, online: event.online }
        : null;
    case "message":
      return isChatMessage(event.message)
        ? {
            type: event.type,
            message: event.message,
            is_self: typeof event.is_self === "boolean" ? event.is_self : undefined,
          }
        : null;
    case "error":
      return typeof event.error === "string" ? { type: event.type, error: event.error } : null;
    case "moderation_event":
      return typeof event.event === "string"
        ? {
            type: event.type,
            event: event.event,
            message_id: typeof event.message_id === "number" ? event.message_id : undefined,
            muted_until: typeof event.muted_until === "string" ? event.muted_until : undefined,
          }
        : null;
    default:
      return null;
  }
}
