const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY ?? "";
const COMPOSIO_MODE = process.env.COMPOSIO_MODE ?? "live";

export function isComposioAvailable(): boolean {
  return COMPOSIO_MODE === "live" && COMPOSIO_API_KEY.length > 0;
}

export function getComposioKey(): string {
  if (!isComposioAvailable()) {
    throw new Error(
      "[pepl:ingest:composio] COMPOSIO_API_KEY not set or COMPOSIO_MODE != 'live' — both required.",
    );
  }
  return COMPOSIO_API_KEY;
}
