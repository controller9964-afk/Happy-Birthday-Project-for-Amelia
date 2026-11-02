import { supabase, type ChatMessage } from "@/lib/supabase";

export type ChatConnectionStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

export type SharedChatHandlers = {
  onMessage: (message: ChatMessage) => void;
  onPresence: (count: number) => void;
  onStatus: (status: ChatConnectionStatus) => void;
  onError: (message: string) => void;
};

export type SharedChatConnection = {
  disconnect: () => Promise<void>;
};

export function connectToSharedChat(nickname: string, handlers: SharedChatHandlers): SharedChatConnection | null {
  const client = supabase;
  if (!client) return null;

  const channel = client
    .channel("cozy-corner", { config: { presence: { key: crypto.randomUUID() } } })
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages" },
      (payload) => {
        const message = payload.new;
        if (
          typeof message.id === "string" &&
          typeof message.nickname === "string" &&
          typeof message.content === "string" &&
          typeof message.created_at === "string"
        ) {
          handlers.onMessage({
            id: message.id,
            nickname: message.nickname,
            content: message.content,
            created_at: message.created_at,
          });
        }
      },
    )
    .on("presence", { event: "sync" }, () => {
      handlers.onPresence(Object.keys(channel.presenceState()).length);
    })
    .subscribe((status) => {
      handlers.onStatus(status);
      if (status === "SUBSCRIBED") {
        void channel.track({ nickname, online_at: new Date().toISOString() }).then((result) => {
          if (result !== "ok") handlers.onError("You joined chat, but your online status could not be shared.");
        });
      }
    });

  return {
    disconnect: async () => {
      const status = await client.removeChannel(channel);
      if (status !== "ok") throw new Error("The chat connection could not be closed cleanly.");
    },
  };
}

export async function loadSharedChatHistory(): Promise<ChatMessage[]> {
  if (!supabase) throw new Error("Shared chat is not configured.");

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Could not load shared chat history: ${error.message}`);
  return (data ?? []).reverse();
}

export async function sendSharedChatMessage(nickname: string, content: string): Promise<ChatMessage> {
  if (!supabase) throw new Error("Shared chat is not configured.");

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ nickname, content })
    .select()
    .single();

  if (error) throw new Error(`Your message could not be shared: ${error.message}`);
  if (
    !data ||
    typeof data.id !== "string" ||
    typeof data.nickname !== "string" ||
    typeof data.content !== "string" ||
    typeof data.created_at !== "string"
  ) {
    throw new Error("The shared chat returned an invalid message.");
  }
  return data;
}
