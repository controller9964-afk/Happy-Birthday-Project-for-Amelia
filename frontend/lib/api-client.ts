export type Wish = {
  id: number;
  nickname: string;
  message: string;
  created_at: string;
};

export type CreateWishInput = {
  nickname: string;
  message: string;
};

type ReportResponse = { status: "reported" };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
if (process.env.NODE_ENV === "production") {
  if (!configuredApiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL must be configured for production.");
  }
  const productionApiUrl = new URL(configuredApiUrl);
  if (
    productionApiUrl.protocol !== "https:" ||
    ["localhost", "127.0.0.1", "0.0.0.0"].includes(productionApiUrl.hostname) ||
    productionApiUrl.pathname !== "/" ||
    productionApiUrl.search !== "" ||
    productionApiUrl.hash !== "" ||
    productionApiUrl.username !== "" ||
    productionApiUrl.password !== ""
  ) {
    throw new Error("NEXT_PUBLIC_API_URL must be a public HTTPS API origin without credentials or a path.");
  }
}

const apiBaseUrl = (configuredApiUrl ?? "http://localhost:8000").replace(/\/+$/, "");

function parseWish(value: unknown): Wish {
  if (
    typeof value !== "object" ||
    value === null ||
    !("id" in value) ||
    typeof value.id !== "number" ||
    !("nickname" in value) ||
    typeof value.nickname !== "string" ||
    !("message" in value) ||
    typeof value.message !== "string" ||
    !("created_at" in value) ||
    typeof value.created_at !== "string"
  ) {
    throw new ApiError("The server returned an invalid birthday wish.");
  }
  return {
    id: value.id,
    nickname: value.nickname,
    message: value.message,
    created_at: value.created_at,
  };
}

async function request<T>(path: string, decode: (value: unknown) => T, init?: RequestInit): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      controller.signal.aborted
        ? "The request timed out. Please try again."
        : "Can’t reach the birthday server. Check your connection and try again.",
    );
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    let message = `The request could not be completed (${response.status}).`;
    try {
      const body: unknown = await response.json();
      if (typeof body === "object" && body !== null && "detail" in body) {
        const detail = body.detail;
        if (typeof detail === "string") message = detail;
        else if (Array.isArray(detail)) {
          const firstMessage = detail.find(
            (item): item is { msg: string } =>
              typeof item === "object" &&
              item !== null &&
              "msg" in item &&
              typeof item.msg === "string",
          )?.msg;
          if (firstMessage) message = firstMessage;
        }
      }
    } catch {
      // Some server errors do not include a JSON response body.
    }
    throw new ApiError(message, response.status);
  }

  try {
    return decode(await response.json());
  } catch {
    throw new ApiError("The server returned an unreadable or invalid response.", response.status);
  }
}

export const apiClient = {
  getWishes: () =>
    request("/wishes", (value) => {
      if (!Array.isArray(value)) throw new ApiError("The server returned an invalid guestbook.");
      return value.map(parseWish);
    }),
  createWish: (input: CreateWishInput) =>
    request("/wishes", parseWish, { method: "POST", body: JSON.stringify(input) }),
  reportChatMessage: (messageId: number, reason: string) =>
    request<ReportResponse>(
      `/chat/messages/${messageId}/report`,
      (value) => {
        if (typeof value !== "object" || value === null || !("status" in value) || value.status !== "reported") {
          throw new ApiError("The server could not confirm the report.");
        }
        return { status: "reported" };
      },
      { method: "POST", body: JSON.stringify({ reason }) },
    ),
};

export function getWebSocketUrl(path: string, apiOrigin = apiBaseUrl): string {
  const url = new URL(path, apiOrigin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export function validateText(value: string, maximumLength: number): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "This field cannot be blank.";
  if (trimmed.length > maximumLength) return `Use no more than ${maximumLength} characters.`;
  const hasUnsupportedControl = Array.from(trimmed).some((character) => {
    const code = character.charCodeAt(0);
    return (code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
  });
  if (hasUnsupportedControl) {
    return "This field contains unsupported control characters.";
  }
  return null;
}
