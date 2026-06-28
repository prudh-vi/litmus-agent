import { runLitmusAgent } from "@/lib/agent/graph";
import type { AgentProgress } from "@/lib/agent/types";
import { persistResearchRun } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();
const send = (controller: ReadableStreamDefaultController, event: string, data: unknown) => {
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
};

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const companyName = typeof (body as { companyName?: unknown }).companyName === "string" ? (body as { companyName: string }).companyName.trim() : "";
  if (companyName.length < 2 || companyName.length > 120) return Response.json({ error: "companyName must be between 2 and 120 characters." }, { status: 400 });
  if (!process.env.KIMI_API_KEY || !process.env.TAVILY_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: "Research service is not configured. Check the required server environment variables." }, { status: 503 });
  }

  // POST + fetch is used instead of EventSource because EventSource is GET-only.
  // Once a stream has started HTTP status cannot change; runtime errors are emitted
  // as an `error` SSE event, while input/configuration failures retain normal 4xx/5xx.
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await runLitmusAgent(companyName, (event: AgentProgress) => send(controller, "progress", event));
        // Persist using the canonical resolved name so the history table shows clean names.
        const persistName = result.resolvedName || companyName;
        let run = null;
        let persistError = null;
        try {
          run = await persistResearchRun(persistName, result.decision);
        } catch (err) {
          persistError = err instanceof Error ? err.message : "Failed to save run to database.";
          console.error("[persist]", persistError);
        }
        send(controller, "complete", { ...result, run, persistError });
      } catch (error) {
        const message = error instanceof Error ? error.message : "The research run failed unexpectedly.";
        send(controller, "error", { error: message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
