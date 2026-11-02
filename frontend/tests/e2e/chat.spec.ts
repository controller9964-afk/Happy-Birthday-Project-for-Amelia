import { expect, test } from "@playwright/test";

test("a visitor joins, sends with Enter, and retries a pending message after reconnect", async ({ page }) => {
  await page.addInitScript(() => {
    const BrowserWebSocket = window.WebSocket;
    class LocalChatSocket {
      readyState = 0;
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onclose: ((event: CloseEvent) => void) | null = null;
      sent: string[] = [];

      constructor() {
        const chatSockets = (window as Window & { __chatSockets?: LocalChatSocket[] }).__chatSockets ?? [];
        chatSockets.push(this);
        Object.defineProperty(window, "__chatSockets", { configurable: true, value: chatSockets });
        window.setTimeout(() => {
          this.readyState = 1;
          this.onopen?.(new Event("open"));
        }, 0);
      }

      send(serialized: string) {
        this.sent.push(serialized);
        const event = JSON.parse(serialized) as { type: string; nickname?: string; content?: string };
        if (event.type === "join") {
          this.receive({ type: "message_history", messages: [] });
          this.receive({ type: "online_count", count: 1 });
        } else if (event.type === "message" && (window as Window & { __chatSockets: LocalChatSocket[] }).__chatSockets.length > 1) {
          this.receive({
            type: "message",
            is_self: true,
            message: {
              id: 1,
              nickname: event.nickname ?? "Guest",
              content: event.content,
              created_at: new Date().toISOString(),
            },
          });
        }
      }

      close(code = 1000, reason = "") {
        this.readyState = 3;
        this.onclose?.(new CloseEvent("close", { code, reason }));
      }

      private receive(event: object) {
        this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(event) }));
      }
    }

    const webSocketProxy = new Proxy(BrowserWebSocket, {
      construct(target, argumentsList) {
        const url = String(argumentsList[0]);
        if (url.includes("/ws/chat")) return new LocalChatSocket();
        return Reflect.construct(target, argumentsList);
      },
    });
    Object.defineProperty(window, "WebSocket", { configurable: true, value: webSocketProxy });
  });

  await page.goto("/chat");
  await page.getByLabel("Choose a nickname").fill("Story Friend");
  await page.getByRole("button", { name: /join the room/i }).click();
  await expect(page.getByText("Story Friend, you’re in good company.")).toBeVisible();
  const composer = page.getByLabel("Your message");
  await composer.fill("Happy birthday, Amelia! 🎂");
  await composer.press("Enter");
  await page.evaluate(() => {
    const sockets = (window as Window & { __chatSockets?: Array<{ close: (code: number, reason: string) => void }> }).__chatSockets;
    sockets?.[0]?.close(1006, "Simulated network interruption");
  });
  await expect.poll(() => page.evaluate(() => (window as Window & { __chatSockets?: WebSocket[] }).__chatSockets?.length)).toBe(2);
  await expect(page.getByText("Happy birthday, Amelia! 🎂")).toBeVisible();
  await expect(page.getByText("You", { exact: true })).toBeVisible();
  const messageIds = await page.evaluate(() => {
    const sockets = (window as Window & { __chatSockets?: Array<{ sent: string[] }> }).__chatSockets ?? [];
    return sockets.flatMap((socket) => socket.sent.map((frame) => JSON.parse(frame) as { type: string; client_message_id?: string }))
      .filter((frame) => frame.type === "message")
      .map((frame) => frame.client_message_id);
  });
  expect(messageIds).toHaveLength(2);
  expect(messageIds[0]).toBe(messageIds[1]);
});
