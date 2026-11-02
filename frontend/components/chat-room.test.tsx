import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatRoom } from "./chat-room";

const sharedChatMocks = vi.hoisted(() => {
  type Message = { id: string; nickname: string; content: string; created_at: string };
  type Handlers = {
    onMessage: (message: Message) => void;
    onPresence: (count: number) => void;
    onStatus: (status: "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED") => void;
    onError: (message: string) => void;
  };
  let handlers: Handlers | null = null;
  let messages: Message[] = [];
  let nextId = 0;

  return {
    connect: vi.fn((_nickname: string, nextHandlers: Handlers) => {
      handlers = nextHandlers;
      setTimeout(() => {
        nextHandlers.onStatus("SUBSCRIBED");
        nextHandlers.onPresence(2);
      }, 0);
      return { disconnect: async () => undefined };
    }),
    loadHistory: vi.fn(async () => messages.slice()),
    send: vi.fn(async (nickname: string, content: string) => {
      const message = {
        id: `message-${++nextId}`,
        nickname,
        content,
        created_at: new Date().toISOString(),
      };
      messages = [...messages, message];
      handlers?.onMessage(message);
      return message;
    }),
    receive: (nickname: string, content: string) => {
      const message = {
        id: `message-${++nextId}`,
        nickname,
        content,
        created_at: new Date().toISOString(),
      };
      messages = [...messages, message];
      handlers?.onMessage(message);
    },
    reset: () => {
      handlers = null;
      messages = [];
      nextId = 0;
      sharedChatMocks.connect.mockClear();
      sharedChatMocks.loadHistory.mockClear();
      sharedChatMocks.send.mockClear();
    },
  };
});

vi.mock("@/lib/shared-chat", () => ({
  connectToSharedChat: sharedChatMocks.connect,
  loadSharedChatHistory: sharedChatMocks.loadHistory,
  sendSharedChatMessage: sharedChatMocks.send,
}));

describe("ChatRoom", () => {
  beforeEach(() => sharedChatMocks.reset());

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("joins the shared room, sends a message, and reloads shared history", async () => {
    const firstRender = render(<ChatRoom />);
    fireEvent.change(await screen.findByLabelText("Choose a nickname"), { target: { value: "Bookworm" } });
    const joinButton = screen.getByRole("button", { name: /join the room/i });
    fireEvent.click(joinButton);
    expect(await screen.findByText("Connected to the shared Cozy Corner.")).toBeInTheDocument();
    expect(await screen.findByText("2 visitors here")).toBeInTheDocument();

    const input = screen.getByLabelText("Your message");
    fireEvent.change(input, { target: { value: "Happy birthday! 🎂" } });
    const form = input.closest("form");
    if (!form) throw new Error("Chat composer form is missing");
    fireEvent.submit(form);

    expect(await screen.findByText("Happy birthday! 🎂")).toBeInTheDocument();
    expect(sharedChatMocks.send).toHaveBeenCalledWith("Bookworm", "Happy birthday! 🎂");

    firstRender.unmount();
    render(<ChatRoom />);
    expect(screen.getByLabelText("Choose a nickname")).toHaveValue("Bookworm");
    fireEvent.click(screen.getByRole("button", { name: /join the room/i }));
    expect(await screen.findByText("Happy birthday! 🎂")).toBeInTheDocument();
    expect(sharedChatMocks.loadHistory).toHaveBeenCalledTimes(2);
  });

  it("displays messages received from other visitors in real time", async () => {
    render(<ChatRoom />);
    fireEvent.change(await screen.findByLabelText("Choose a nickname"), { target: { value: "Bookworm" } });
    fireEvent.click(screen.getByRole("button", { name: /join the room/i }));
    expect(await screen.findByText("Connected to the shared Cozy Corner.")).toBeInTheDocument();

    act(() => sharedChatMocks.receive("Birthday Friend", "Hope your day is magical!"));
    expect(await screen.findByText("Hope your day is magical!")).toBeInTheDocument();
  });

  it("offers a small accessible emoji picker to joined visitors", async () => {
    render(<ChatRoom />);
    fireEvent.change(await screen.findByLabelText("Choose a nickname"), { target: { value: "Bookworm" } });
    fireEvent.click(screen.getByRole("button", { name: /join the room/i }));
    expect(await screen.findByText("Connected to the shared Cozy Corner.")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Choose an emoji" }));
    fireEvent.click(screen.getByRole("button", { name: "Insert 🎂" }));
    expect(screen.getByLabelText("Your message")).toHaveValue("🎂");
  });
});
