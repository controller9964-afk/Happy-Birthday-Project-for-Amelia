import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api-client";
import { useGuestbook } from "./use-guestbook";

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return { ...actual, apiClient: { ...actual.apiClient, getWishes: vi.fn(), createWish: vi.fn() } };
});

describe("useGuestbook", () => {
  afterEach(() => vi.clearAllMocks());

  it("loads real API wishes and updates state after a successful submission", async () => {
    vi.mocked(apiClient.getWishes).mockResolvedValue([]);
    vi.mocked(apiClient.createWish).mockResolvedValue({
      id: 1,
      nickname: "Reader",
      message: "Have a lovely day!",
      created_at: "2026-11-02T00:00:00Z",
    });

    const { result } = renderHook(() => useGuestbook());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.addWish(" Reader ", " Have a lovely day! ");
    });

    expect(apiClient.createWish).toHaveBeenCalledWith({ nickname: "Reader", message: "Have a lovely day!" });
    expect(result.current.wishes[0]?.message).toBe("Have a lovely day!");
    expect(result.current.success).toContain("added");
  });

  it("validates locally before sending a wish", async () => {
    const { result } = renderHook(() => useGuestbook());
    await act(async () => {
      await result.current.addWish("  ", "A birthday wish");
    });

    expect(apiClient.createWish).not.toHaveBeenCalled();
    expect(result.current.submitError).toContain("Name");
  });
});
