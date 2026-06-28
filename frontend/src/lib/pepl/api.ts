// One fetch wrapper + typed helpers (INTEGRATION.md law 1+4). Every non-200 logs LOUD and THROWS —
// never a canned value, never a swallowed catch (CLAUDE.md §2). Liveness is WS-driven (useRun);
// this layer is the HTTP data half (law 3).
import type {
  ConnectInitiateResp,
  ConnectStatusResp,
  DotIntroResp,
  DotTurnReq,
  DotTurnResp,
  SaveCardReq,
  SaveCardResp,
  Dossier,
  MapResp,
  MapLinkResp,
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL!; // unset → fetch fails loud (the honest failure)

export async function call<T>(path: string, body?: unknown): Promise<T> {
  const t0 = performance.now();
  const res = await fetch(
    `${API}${path}`,
    body !== undefined
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
  const ms = (performance.now() - t0).toFixed(0);
  if (!res.ok) {
    const err = await res.text();
    console.error(`[pepl:ui] ${path} -> ${res.status} (${ms}ms): ${err}`);
    throw new Error(`${path} failed (${res.status})`);
  }
  console.log(`[pepl:ui] ${path} -> 200 (${ms}ms)`);
  return (await res.json()) as T;
}

// --- typed helpers (one per clickable, bound to the contract) ----------------------------------

export const connectInitiate = (userId: string): Promise<ConnectInitiateResp> =>
  call("/api/connect/google/initiate", { userId, provider: "gmail" });

export const connectStatus = (userId: string): Promise<ConnectStatusResp> =>
  call(
    `/api/connect/google/status?userId=${encodeURIComponent(userId)}&provider=gmail`,
  );

export const dotIntro = (): Promise<DotIntroResp> => call("/api/dot/intro");

export const dotTurn = (req: DotTurnReq): Promise<DotTurnResp> =>
  call("/api/dot/turn", req);

export const saveCard = (req: SaveCardReq): Promise<SaveCardResp> =>
  call("/api/card", req);

export const reveal = (userId: string): Promise<Dossier> =>
  call("/reveal", { userId });

export const getMap = (): Promise<MapResp> => call("/api/map");

export const mapLink = (a: string, b: string): Promise<MapLinkResp> =>
  call("/api/map/link", { a, b });
