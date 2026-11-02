import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useGuestbook } from "./use-guestbook";

describe("useGuestbook", () => {
  afterEach(() => localStorage.clear());

  it("loads and saves wishes in this browser", async () => {
    const { result } = renderHook(() => useGuestbook());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.addWish(" Reader ", " Have a lovely day! ");
    });

    expect(result.current.wishes[0]).toMatchObject({ nickname: "Reader", message: "Have a lovely day!" });
    expect(result.current.success).toContain("this browser");
    expect(localStorage.getItem("amelia-guestbook-wishes")).toContain("Have a lovely day!");
  });

  it("validates locally before saving a wish", async () => {
    const { result } = renderHook(() => useGuestbook());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.addWish("  ", "A birthday wish");
    });

    expect(result.current.submitError).toContain("Name");
    expect(localStorage.getItem("amelia-guestbook-wishes")).toBeNull();
  });
});
