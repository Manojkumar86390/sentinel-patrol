// ---------------------------------------------------------------------------
// Telegram notifier.
//
// Configure in .env.local:
//   TELEGRAM_BOT_TOKEN     = 1234567890:AAFGvsLK6o2DpgUMLvB2VmonbM-zUoyWXAI
//   TELEGRAM_GROUP_CHAT_ID = -1001234567890                  (optional, negative for groups)
//   TELEGRAM_CHAT_IDS      = 6228260264,612345678            (optional, comma-separated individuals)
//
// If TELEGRAM_BOT_TOKEN is missing, sendAlertNotification() silently no-ops so
// the dashboard still works for local development.
//
// Both group and individual chats can be configured at the same time — the
// notifier will fire to all of them in parallel and aggregate the results.
// ---------------------------------------------------------------------------

export interface NotifyResult {
  ok: boolean;
  skipped?: boolean;
  recipients: Array<{
    chatId: string;
    kind:   "group" | "individual";
    ok:     boolean;
    error?: string;
  }>;
  error?: string;
}

function parseChatIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function sendOne(
  token: string,
  chatId: string,
  text: string,
  signal: AbortSignal
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        chat_id:    chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!data?.ok) {
      return { ok: false, error: data?.description ?? "Telegram returned ok=false" };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Send `message` to the configured group AND every individual chat in parallel.
 * Never throws — caller (emergency-alerts POST) needs to respond to the ESP32 quickly.
 *
 * Telegram supports HTML-flavoured formatting; escape any untrusted strings
 * the caller passes in (here, `location` and `espId` are server-side controlled).
 */
export async function sendAlertNotification(message: string): Promise<NotifyResult> {
  const token   = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  const groupId = (process.env.TELEGRAM_GROUP_CHAT_ID ?? "").trim();
  const inds    = parseChatIds(process.env.TELEGRAM_CHAT_IDS);

  if (!token || (!groupId && inds.length === 0)) {
    return { ok: false, skipped: true, recipients: [] };
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 5000);

  const targets: Array<{ chatId: string; kind: "group" | "individual" }> = [];
  if (groupId) targets.push({ chatId: groupId, kind: "group" });
  for (const id of inds) targets.push({ chatId: id, kind: "individual" });

  try {
    const settled = await Promise.allSettled(
      targets.map((t) => sendOne(token, t.chatId, message, controller.signal))
    );

    const recipients = targets.map((t, i) => {
      const r = settled[i];
      if (r.status === "fulfilled") {
        return { chatId: t.chatId, kind: t.kind, ok: r.value.ok, error: r.value.error };
      }
      return { chatId: t.chatId, kind: t.kind, ok: false, error: String(r.reason) };
    });

    const anyOk = recipients.some((r) => r.ok);
    return { ok: anyOk, recipients };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Tiny HTML-escape for values we drop into the Telegram message.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
