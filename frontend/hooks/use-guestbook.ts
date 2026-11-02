"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, validateText, type Wish } from "@/lib/api-client";

type GuestbookState = {
  wishes: Wish[];
  loading: boolean;
  submitting: boolean;
  loadError: string;
  submitError: string;
  success: string;
};

const initialState: GuestbookState = {
  wishes: [],
  loading: true,
  submitting: false,
  loadError: "",
  submitError: "",
  success: "",
};

export function useGuestbook() {
  const [state, setState] = useState(initialState);

  const loadWishes = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, loadError: "" }));
    try {
      const wishes = await apiClient.getWishes();
      setState((current) => ({ ...current, wishes, loading: false }));
    } catch (reason) {
      setState((current) => ({
        ...current,
        loading: false,
        loadError: reason instanceof Error ? reason.message : "Could not load the guestbook just now.",
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
      const wish = await apiClient.createWish({ nickname, message });
      setState((current) => ({
        ...current,
        wishes: [wish, ...current.wishes].slice(0, 100),
        submitting: false,
        success: "Your birthday wish has been added. Thank you!",
      }));
      return true;
    } catch (reason) {
      setState((current) => ({
        ...current,
        submitting: false,
        submitError: reason instanceof Error ? reason.message : "Your wish could not be saved. Please try again.",
      }));
      return false;
    }
  }, []);

  const clearFeedback = useCallback(() => {
    setState((current) => ({ ...current, submitError: "", success: "" }));
  }, []);

  return { ...state, loadWishes, addWish, clearFeedback };
}
