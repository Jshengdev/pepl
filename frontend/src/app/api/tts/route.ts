// Dot speaks via REAL Grok TTS (voice "eve"). Server-side so XAI_API_KEY never
// reaches the client. POST { text } -> audio/mpeg. (Ported from the dot project's
// proven /api/tts — verified live: 200, 24kHz mp3.)
export const runtime = "nodejs";

export async function POST(req: Request) {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    return Response.json({ error: "XAI_API_KEY not set on the frontend deploy" }, { status: 500 });
  }
  let text = "";
  try {
    ({ text } = await req.json());
  } catch {
    return Response.json({ error: "bad body" }, { status: 400 });
  }
  if (!text || typeof text !== "string") {
    return Response.json({ error: "text required" }, { status: 400 });
  }

  const upstream = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.slice(0, 600), voice_id: "eve", language: "en" }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { error: `grok tts ${upstream.status}`, detail: detail.slice(0, 300) },
      { status: 502 },
    );
  }

  const buf = await upstream.arrayBuffer();
  return new Response(buf, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
