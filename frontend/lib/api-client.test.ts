import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiClient, getWebSocketUrl, validateText } from "./api-client";

describe("apiClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the versioned API path and validates returned wish data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 2, nickname: "Reader", message: "Happy birthday!", created_at: "2026-11-02T00:00:00Z" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.getWishes()).resolves.toMatchObject([{ id: 2, nickname: "Reader" }]);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/wishes");
  });

  it("surfaces API validation messages instead of masking them", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Please wait before leaving another wish" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    ));

    await expect(apiClient.createWish({ nickname: "Reader", message: "A wish" }))
      .rejects.toMatchObject({ name: "ApiError", message: "Please wait before leaving another wish", status: 429 });
  });

  it("reports network failures as actionable API errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network unavailable")));

    await expect(apiClient.getWishes()).rejects.toBeInstanceOf(ApiError);
    await expect(apiClient.getWishes()).rejects.toThrow("Check your connection");
  });

  it("derives secure WebSocket URLs from the configured HTTPS API origin", () => {
    const url = new URL(getWebSocketUrl("/ws/chat", "https://api.amelia.example.com"));
    expect(url.protocol).toBe("wss:");
    expect(url.host).toBe("api.amelia.example.com");
    expect(url.pathname).toBe("/ws/chat");
  });
});

describe("validateText", () => {
  it("rejects blank, oversized, and unsupported control input", () => {
    expect(validateText("  ", 24)).toContain("blank");
    expect(validateText("12345", 4)).toContain("4 characters");
    expect(validateText("hello\u0000", 10)).toContain("control characters");
  });
});
