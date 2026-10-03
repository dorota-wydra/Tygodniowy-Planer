/**
 * dataApi.ts
 * Thin HTTP client for /api/data endpoint.
 */

import type { AppData, ApiGetDataResponse, ApiPutDataRequest, ApiPutDataResponse, ApiConflictResponse } from "../types/appData";

const BASE = "/api";

export type PutResult =
  | { ok: true; data: AppData; updatedAt: string }
  | { ok: false; conflict: true; serverData: AppData; serverUpdatedAt: string }
  | { ok: false; conflict: false; error: string };

/** GET /api/data — fetch server data for authenticated user. */
export async function fetchServerData(): Promise<ApiGetDataResponse> {
  const res = await fetch(`${BASE}/data`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET /api/data → ${res.status}`);
  return res.json() as Promise<ApiGetDataResponse>;
}

/** PUT /api/data — save AppData to server. Handles 409 Conflict. */
export async function putServerData(
  data: AppData,
  baseServerUpdatedAt: string | null,
): Promise<PutResult> {
  const body: ApiPutDataRequest = {
    data,
    clientUpdatedAt: data.updatedAt,
    baseServerUpdatedAt: baseServerUpdatedAt ?? undefined,
  };

  let res: Response;
  try {
    res = await fetch(`${BASE}/data`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, conflict: false, error: String(e) };
  }

  if (res.status === 409) {
    const conflict = (await res.json()) as ApiConflictResponse;
    return {
      ok: false,
      conflict: true,
      serverData: conflict.serverData,
      serverUpdatedAt: conflict.serverUpdatedAt,
    };
  }

  if (!res.ok) {
    return { ok: false, conflict: false, error: `PUT /api/data → ${res.status}` };
  }

  const json = (await res.json()) as ApiPutDataResponse;
  return { ok: true, data: json.data, updatedAt: json.updatedAt };
}
