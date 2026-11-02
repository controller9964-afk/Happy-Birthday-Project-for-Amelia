"use client";

import { useCallback, useEffect, useState } from "react";
import { createLocalId, readStoredArray, writeStoredArray } from "@/lib/local-storage";
import { validateText } from "@/lib/text-validation";

export type Wish = {
  id: string;
  nickname: string;
  message: string;
  created_at: string;
};

type GuestbookState = {
  wishes: Wish[];
  loading: boolean;
  submitting: boolean;
  loadError: string;
  submitError: string;
  success: string;
};

const storageKey = "amelia-guestbook-wishes";
const initialState: GuestbookState = {
  wishes: [],
  loading: true,
  submitting: false,
  loadError: "",
  submitError: "",
  success: "",
};

function isWish(value: unknown): value is Wish {
  if (typeof value !== "object" || value === null) return false;
  const wish = value as Record<string, unknown>;
  return (
    typeof wish.id === "string" &&
    typeof wish.nickname === "string" &&
    typeof wish.message === "string" &&
    typeof wish.created_at === "string"
  );
}

export function useGuestbook() {
  const [state, setState] = useState(initialState);

  const loadWishes = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, loadError: "" }));
    try {
      const wishes = readStoredArray(storageKey, isWish, "guestbook wishes").slice(0, 100);
      setState((current) => ({ ...current, wishes, loading: false }));
    } catch (reason) {
      setState((current) => ({
        ...current,
        loading: false,
        loadError: reason instanceof Error ? reason.message : "Could not load this browser’s guestbook.",
      }));
    }
  }, []);

  useEffect(() => {
    void loadWishes();
  }, [loadWishes]);

  const addWish = useCallback(async (nicknameInput: string, messageInput: string) => {
    const nickname = nicknameInput.trim();
    const message = messageInput.trim();
    const nicknameError = validateText(nickname, 40);
    const messageError = validateText(message, 500);
    if (nicknameError) {
      setState((current) => ({ ...current, submitError: `Name: ${nicknameError}`, success: "" }));
      return false;
    }
    if (messageError) {
      setState((current) => ({ ...current, submitError: `Birthday note: ${messageError}`, success: "" }));
      return false;
    }

    setState((current) => ({ ...current, submitting: true, submitError: "", success: "" }));
    try {
      const wishes = readStoredArray(storageKey, isWish, "guestbook wishes");
      const wish: Wish = { id: createLocalId(), nickname, message, created_at: new Date().toISOString() };
      const updatedWishes = [wish, ...wishes].slice(0, 100);
      writeStoredArray(storageKey, updatedWishes);
      setState((current) => ({
        ...current,
        wishes: updatedWishes,
        submitting: false,
        success: "Your birthday wish has been saved in this browser. Thank you!",
      }));
      return true;
    } catch (reason) {
      setState((current) => ({
        ...current,
        submitting: false,
        submitError: reason instanceof Error ? reason.message : "Your wish could not be saved in this browser.",
      }));
      return false;
    }
  }, []);

  const clearFeedback = useCallback(() => {
    setState((current) => ({ ...current, submitError: "", success: "" }));
  }, []);

  return { ...state, loadWishes, addWish, clearFeedback };
}
