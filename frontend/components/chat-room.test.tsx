import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatRoom } from "./chat-room";

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  sent: string[] = [];

  constructor(_url: string) {
    MockWebSocket.instances.push(this);
  }

  send(value: string) {
    this.sent.push(value);
  }

  close(code = 1000, reason = "") {
    this.readyState = 3;
    this.onclose?.({ code, reason } as CloseEvent);
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({} as Event);
  }

  receive(event: object) {
    this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent);
  }
}

describe("ChatRoom", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    MockWebSocket.instances = [];
    vi.unstubAllGlobals();
  });

  it("joins with a nickname, receives the history, and submits a message", async () => {
    vi.stubGlobal("WebSocket", MockWebSocket);
    render(<ChatRoom />);

    fireEvent.change(screen.getByLabelText("Choose a nickname"), { target: { value: "Bookworm" } });
    fireEvent.click(screen.getByRole("button", { name: /join the room/i }));

    const socket = MockWebSocket.instances[0];
    socket.open();
    expect(JSON.parse(socket.sent[0])).toMatchObject({ type: "join", nickname: "Bookworm" });
    socket.receive({ type: "message_history", messages: [] });
    socket.receive({ type: "online_count", count: 1 });
    expect(await screen.findByText("Bookworm, you’re in good company.")).toBeInTheDocument();

    const input = screen.getByLabelText("Your message");
    fireEvent.change(input, { target: { value: "Happy birthday! 🎂" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });
    const form = input.closest("form");
    if (!form) throw new Error("Chat composer form is missing");
    fireEvent.submit(form);

    await waitFor(() => {
      const sentMessage = socket.sent.map((item) => JSON.parse(item)).find((item) => item.type === "message");
      expect(sentMessage).toMatchObject({ type: "message", content: "Happy birthday! 🎂" });
      expect(sentMessage.client_message_id).toBeTruthy();
    });
    socket.receive({ type: "online_count", count: 2 });
    expect(socket.sent.map((item) => JSON.parse(item)).filter((item) => item.type === "message")).toHaveLength(1);

    socket.receive({
      type: "message",
      is_self: true,
      message: { id: 10, nickname: "Bookworm", content: "Happy birthday! 🎂", created_at: new Date().toISOString() },
    });
    expect(await screen.findByText("Happy birthday! 🎂")).toBeInTheDocument();
  });

  it("offers a small accessible emoji picker to joined visitors", async () => {
    vi.stubGlobal("WebSocket", MockWebSocket);
    render(<ChatRoom />);
    fireEvent.change(screen.getByLabelText("Choose a nickname"), { target: { value: "Bookworm" } });
    fireEvent.click(screen.getByRole("button", { name: /join the room/i }));
    const socket = MockWebSocket.instances[0];
    socket.open();
    socket.receive({ type: "message_history", messages: [] });
    socket.receive({ type: "online_count", count: 1 });
    const picker = await screen.findByRole("button", { name: "Choose an emoji" });
    fireEvent.click(picker);
    fireEvent.click(screen.getByRole("button", { name: "Insert 🎂" }));
    expect(screen.getByLabelText("Your message")).toHaveValue("🎂");
  });
});
