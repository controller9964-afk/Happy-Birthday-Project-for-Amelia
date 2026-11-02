import { createClient } from "@supabase/supabase-js";

export type ChatMessage = {
  id: string;
  nickname: string;
  content: string;
  created_at: string;
};

type Database = {
  public: {
    Tables: {
      chat_messages: {
        Row: ChatMessage;
        Insert: { id?: string; nickname: string; content: string; created_at?: string };
        Update: Partial<{ id: string; nickname: string; content: string; created_at: string }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient<Database>(supabaseUrl, supabaseAnonKey) : null;
