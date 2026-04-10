import { getConfig, type Environment } from "./config.js";

export class EmqxApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string
  ) {
    super(message);
    this.name = "EmqxApiError";
  }
}

async function request<T>(
  env: Environment,
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const cfg = getConfig(env);
  const credentials = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString("base64");

  let url = `${cfg.baseUrl}/api/v5${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!res.ok) {
    const msg =
      typeof json === "object" && json !== null && "message" in json
        ? String((json as Record<string, unknown>).message)
        : `HTTP ${res.status}`;
    throw new EmqxApiError(res.status, json, msg);
  }

  return json as T;
}

async function requestBuffer(
  env: Environment,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<Buffer> {
  const cfg = getConfig(env);
  const credentials = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString("base64");

  let url = `${cfg.baseUrl}/api/v5${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/octet-stream",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new EmqxApiError(res.status, text, `HTTP ${res.status}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export const emqx = {
  get: <T>(env: Environment, path: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(env, "GET", path, undefined, params),
  getBuffer: (env: Environment, path: string, params?: Record<string, string | number | boolean | undefined>) =>
    requestBuffer(env, path, params),
  post: <T>(env: Environment, path: string, body?: unknown) =>
    request<T>(env, "POST", path, body),
  put: <T>(env: Environment, path: string, body?: unknown) =>
    request<T>(env, "PUT", path, body),
  delete: <T>(env: Environment, path: string, body?: unknown) =>
    request<T>(env, "DELETE", path, body),
};
