import type { ApiErrorBody } from "./types";

const BASE_URL = "/api/v1";

/** Error thrown for every non-2xx response, parsed from {"error": {"code", "message"}}. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

type Params = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, params?: Params): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    if (body.error) return new ApiError(body.error.code, body.error.message, response.status);
  } catch {
    // fall through: the body was empty or not JSON
  }
  return new ApiError("UnknownError", response.statusText || "Unexpected error", response.status);
}

interface RequestOptions {
  params?: Params;
  body?: unknown;
  /** Send this string as a text/plain body instead of JSON-encoding `body`. */
  text?: string;
}

async function send(method: string, path: string, options: RequestOptions): Promise<Response> {
  const isText = options.text !== undefined;
  const hasBody = isText || options.body !== undefined;
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.params), {
      method,
      credentials: "include",
      headers: hasBody ? { "Content-Type": isText ? "text/plain" : "application/json" } : undefined,
      body: isText ? options.text : options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("NetworkError", "Unable to reach the server. Check your connection and try again.", 0);
  }
  if (!response.ok) throw await toApiError(response);
  return response;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(method, path, options);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>("GET", path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  /** POST a raw text body (e.g. a zone file) with optional query params. */
  postText: <T>(path: string, text: string, params?: Params) => request<T>("POST", path, { text, params }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  delete: <T = void>(path: string) => request<T>("DELETE", path),
};

/** Fetch a file from the API and hand it to the browser as a download (uses the server's filename). */
export async function downloadFile(path: string, params?: Params): Promise<void> {
  const response = await send("GET", path, { params });
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? "download";
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
