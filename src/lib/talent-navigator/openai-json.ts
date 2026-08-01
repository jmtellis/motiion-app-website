/**
 * Thin shared OpenAI JSON chat helper for Talent Navigator parsing.
 * Keeps provider keys server-only; callers validate all output.
 */

export type OpenAiJsonMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function callOpenAiJsonObject(input: {
  messages: OpenAiJsonMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<{ ok: true; json: unknown } | { ok: false; reason: "missing_key" | "http" | "parse" | "timeout" }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "missing_key" };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model ?? "gpt-4o-mini",
        temperature: input.temperature ?? 0,
        max_tokens: input.maxTokens ?? 900,
        messages: input.messages,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(input.timeoutMs ?? 15_000),
    });

    if (!response.ok) return { ok: false, reason: "http" };

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return { ok: false, reason: "parse" };

    try {
      return { ok: true, json: JSON.parse(content) as unknown };
    } catch {
      return { ok: false, reason: "parse" };
    }
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "http" };
  }
}
