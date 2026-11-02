"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { Alert, Button, IconButton, Paper, TextField, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useChat } from "@/hooks/use-chat";
import {
  Cat,
  Heart,
  MessageCircle,
  Moon,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";

const emojis = ["🎂", "💜", "✨", "🐈‍⬛", "📚", "🎃", "🌙", "💕", "🎶", "🕯️"];
const maximumNicknameLength = 24;
const maximumMessageLength = 500;

export function ChatRoom() {
  const {
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
  } = useChat();
  const [content, setContent] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const behavior = reduceMotion ? "auto" : "smooth";
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight, behavior });
  }, [messages.length]);

  const handleJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    joinRoom(draftNickname);
  };

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await sendMessage(content)) setContent("");
  };

  const addEmoji = (emoji: string) => {
    setContent((current) => (current + emoji).slice(0, maximumMessageLength));
  };

  const connected = connection === "connected";

  return (
    <div className="relative mx-auto max-w-4xl">
      <div aria-hidden="true" className="pointer-events-none absolute -left-7 top-16 hidden text-rose/60 lg:block"><Star size={15} /></div>
      <div aria-hidden="true" className="pointer-events-none absolute -right-7 top-36 hidden text-[#e9afc5]/60 lg:block"><Heart size={16} /></div>
      <Paper component="div" elevation={0} className="chat-room-card soft-card relative overflow-hidden rounded-[1.75rem] border border-rose/20 shadow-[0_26px_70px_rgba(13,8,21,.3)]" sx={{ border: "1px solid rgba(233,175,197,.2)", background: "rgba(27,21,38,.97)", borderRadius: "1.75rem" }}>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-rose/80 to-transparent" aria-hidden="true" />
        <header className="chat-room-header flex flex-wrap items-center justify-between gap-4 border-b border-white/[.08] px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="relative rounded-2xl bg-rose/10 p-3 text-rose">
              <Moon size={20} aria-hidden="true" />
              <Sparkles size={11} className="absolute -right-1 -top-1 text-gold" aria-hidden="true" />
            </span>
            <div>
              <Typography component="h2" variant="h6" className="serif text-xl text-[#fff5f5]" sx={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "1.25rem" }}>The Cozy Corner</Typography>
              <p className="mt-1 text-xs text-[#b8a9c1]">A little hello beneath the birthday stars</p>
            </div>
          </div>
          <span aria-live="polite" className="rounded-full border border-white/10 bg-[#191326]/90 px-3 py-1.5 text-xs text-[#ded2e1]">
            {connected ? "Saved in this browser" : "A seat is waiting"}
          </span>
        </header>

        <section className="grid gap-3 border-b border-white/[.08] bg-[#191326]/70 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-7">
          <div className="flex items-start gap-3">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
            <details className="group text-sm text-[#c6b8ce]">
              <summary className="cursor-pointer list-none font-medium text-[#eadde9] outline-none focus-visible:underline [&::-webkit-details-marker]:hidden">
                A few cozy room rules <span className="text-rose">· be kind, keep it friendly</span>
              </summary>
              <p className="mt-2 max-w-xl text-xs leading-5 text-[#b5a7bd]">Messages are saved only in this browser and are not shared with other visitors. Anyone using this browser can delete any saved message.</p>
            </details>
          </div>
          {connected && (
            <Button type="button" onClick={leaveRoom} variant="outlined" size="small" className="justify-self-start sm:justify-self-end" sx={{ minHeight: 36, px: 1.5, color: "text.primary", borderColor: "rgba(255,255,255,.2)" }}>
              Leave room
            </Button>
          )}
        </section>

        {!connected && (
          <section className="chat-join-panel grid gap-5 border-b border-white/[.08] p-5 lg:grid-cols-[auto_1fr] lg:items-center lg:px-7 lg:py-6">
              <div className="flex items-center gap-4 lg:block lg:text-center">
              <Cat size={38} strokeWidth={1.4} className="shrink-0 text-rose/90" aria-hidden="true" />
                <p className="serif text-lg text-[#f4dce6] lg:mt-2">There’s room for one more.</p>
            </div>
              <form onSubmit={handleJoin} className="flex flex-col gap-3 lg:flex-row">
              <div className="min-w-0 flex-1">
                <label htmlFor="chat-nickname" className="sr-only">Choose a nickname</label>
                <TextField
                  id="chat-nickname"
                  fullWidth
                  size="small"
                  variant="outlined"
                  autoComplete="nickname"
                  slotProps={{ htmlInput: { maxLength: maximumNicknameLength } }}
                  disabled={!nicknameReady}
                  required
                  value={draftNickname}
                  onChange={(event) => setDraftNickname(event.target.value)}
                  placeholder="What should we call you?"
                  aria-describedby="nickname-hint"
                />
                <p id="nickname-hint" className="mt-1.5 px-1 text-[11px] text-[#9f91a8]">Your nickname is public · up to {maximumNicknameLength} characters</p>
              </div>
              <Button type="submit" variant="contained" className="min-h-[50px] md:self-start" disabled={!nicknameReady || !draftNickname.trim()} endIcon={<MessageCircle size={16} aria-hidden="true" />}>
                Join the room
              </Button>
            </form>
          </section>
        )}

        <div
          ref={listRef}
          role="log"
          aria-label="Cozy Corner messages"
          aria-live="polite"
          aria-relevant="additions text"
          className="chat-message-area chat-scroll flex h-[min(56vh,480px)] min-h-[300px] flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-7"
        >
          {!connected && messages.length === 0 && (
            <div className="m-auto max-w-sm text-center">
              <Image
                src="/celestial-cat.svg"
                width={84}
                height={84}
                alt="A black cat wearing a pink ribbon"
                className="mx-auto mb-3 opacity-90"
              />
              <p className="serif text-xl text-[#e8d7e8]">A quiet little room for now</p>
              <p className="mt-2 text-sm leading-6 text-[#a99bb0]">Pick a nickname to save birthday wishes in this browser.</p>
            </div>
          )}
          {connected && messages.length === 0 && (
            <div className="m-auto max-w-sm text-center">
              <Sparkles size={20} className="mx-auto mb-3 text-gold" aria-hidden="true" />
              <p className="serif text-xl text-[#e8d7e8]">You’re the first one in</p>
              <p className="mt-2 text-sm leading-6 text-[#a99bb0]">Leave a little hello to revisit later in this browser.</p>
            </div>
          )}
          {messages.map((message) => {
            const isSelf = message.nickname === nickname;
            return (
              <motion.article key={message.id} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`flex max-w-[92%] gap-3 sm:max-w-[82%] ${isSelf ? "ml-auto flex-row-reverse" : ""}`}>
                <span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isSelf ? "bg-gradient-to-br from-[#e7acc2] to-[#b384bc] text-[#26182e]" : "border border-white/10 bg-[#372944] text-[#e5c4d5]"}`}>
                  {message.nickname.slice(0, 1).toLocaleUpperCase()}
                </span>
                <div className={`min-w-0 ${isSelf ? "text-right" : ""}`}>
                  <div className={`mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 ${isSelf ? "justify-end" : ""}`}>
                    <span className="text-xs font-semibold text-[#f2dce7]">{isSelf ? "You" : message.nickname}</span>
                    <time className="text-[10px] text-[#9889a1]" dateTime={message.created_at}>
                      {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </div>
                  <div className="flex items-start gap-1">
                    <div className={`chat-bubble relative text-left shadow-sm ${isSelf ? "chat-bubble-self rounded-tr-sm" : "chat-bubble-other rounded-tl-sm"}`}>
                      <Typography component="p" variant="body2" className="whitespace-pre-wrap break-words text-sm leading-6" sx={{ color: "inherit", fontSize: ".875rem", lineHeight: 1.65 }}>{message.content}</Typography>
                    </div>
                    <IconButton
                      type="button"
                      size="small"
                      aria-label={`Delete message from ${message.nickname}`}
                      onClick={() => deleteMessage(message.id)}
                      sx={{ color: "#b8a9c1", "&:hover": { color: "#f4b4c8", backgroundColor: "rgba(244,180,200,.08)" } }}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </IconButton>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        <div aria-live="polite" className="min-h-7 border-t border-white/[.06] px-5 pt-2 text-center text-xs text-[#b8a9c1]">
          {error ? <Alert severity="error" variant="standard" sx={{ justifyContent: "center", py: 0, background: "transparent", color: "#f4b4c8", "& .MuiAlert-icon": { py: 0.5 } }}>{error}</Alert> : statusMessage || (connected ? `${nickname}, you’re in good company.` : "")}
        </div>

        <form onSubmit={send} className="chat-composer flex items-end gap-2 border-t border-white/[.08] p-4 sm:gap-3 sm:px-6 sm:py-5">
          <div className="relative">
            <IconButton
              type="button"
              onClick={() => setEmojiOpen((open) => !open)}
              aria-label="Choose an emoji"
              aria-expanded={emojiOpen}
              disabled={!connected}
              sx={{ width: 44, height: 48, border: "1px solid rgba(255,255,255,.19)", color: "primary.main", "&:hover": { backgroundColor: "rgba(255,255,255,.08)" } }}
            >
              <Smile size={19} aria-hidden="true" />
            </IconButton>
            {emojiOpen && (
              <fieldset aria-label="Choose an emoji" className="absolute bottom-14 left-0 z-10 grid w-52 grid-cols-5 gap-1 rounded-2xl border border-white/10 bg-[#241b30] p-2 shadow-xl">
                {emojis.map((emoji) => (
                  <IconButton
                    key={emoji}
                    type="button"
                    onClick={() => { addEmoji(emoji); setEmojiOpen(false); }}
                    aria-label={`Insert ${emoji}`}
                    sx={{ borderRadius: 2, color: "text.primary", fontSize: "1.25rem", "&:hover": { backgroundColor: "rgba(255,255,255,.1)" } }}
                  >
                    {emoji}
                  </IconButton>
                ))}
              </fieldset>
            )}
          </div>
          <label htmlFor="chat-message" className="sr-only">Your message</label>
          <TextField
            id="chat-message"
            className="min-h-[48px] flex-1"
            size="small"
            variant="outlined"
            fullWidth
            slotProps={{ htmlInput: { maxLength: maximumMessageLength, "aria-label": "Your message" } }}
            disabled={!connected}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={connected ? "Write a friendly message…" : "Join with a nickname to write"}
          />
          <Button type="submit" variant="contained" className="!min-h-[48px] !min-w-12 !px-3 sm:!px-5" aria-label="Send message" disabled={!connected || !content.trim()}>
            <Send size={17} aria-hidden="true" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
        <footer className="flex flex-wrap items-center justify-between gap-2 px-5 pb-4 text-[11px] text-[#93849b] sm:px-6">
          <span>{connected ? "Saved only in this browser" : "Chat history stays in this browser"}</span>
          <span>{content.length}/{maximumMessageLength}</span>
        </footer>
      </Paper>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-[#a99bb0]">
        A little kindness makes this room feel like home <Heart size={12} className="text-rose" aria-label="love" />
      </p>
    </div>
  );
}
