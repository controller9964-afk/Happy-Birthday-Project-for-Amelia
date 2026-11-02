import { describe, expect, it } from "vitest";
import { parseServerChatEvent } from "./chat-protocol";

describe("parseServerChatEvent", () => {
  it("accepts valid history and message events", () => {
    expect(parseServerChatEvent({ type: "message_history", messages: [] }))
      .toEqual({ type: "message_history", messages: [] });
    expect(parseServerChatEvent({
      type: "message",
      is_self: true,
      message: { id: 1, nickname: "Reader", content: "Hello!", created_at: "2026-11-02T00:00:00Z" },
    })).toMatchObject({ type: "message", is_self: true });
  });

  it("rejects malformed or unknown server events", () => {
    expect(parseServerChatEvent({ type: "message_history", messages: [{ id: "1" }] })).toBeNull();
    expect(parseServerChatEvent({ type: "system_admin", role: "admin" })).toBeNull();
  });
});
