// Client for the profile agent backend (see website.md for the contract).
// POST /chat {query, session_id} -> {response}; GET /health wakes a cold instance.

export const AGENT_URL = (
  import.meta.env.PUBLIC_AGENT_URL ?? 'https://profile-agent-160704106074.us-west1.run.app'
).replace(/\/$/, '');

export const MAX_QUESTION_LENGTH = 500;

export type AgentResult =
  | { ok: true; text: string }
  | { ok: false; kind: 'invalid' | 'limit' | 'busy' | 'down'; message: string };

const SESSION_KEY = 'ask-session';

/** One session per visitor tab, so the agent remembers the last few questions. */
export function sessionId(): string {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) return saved;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Ping /health so a cold instance starts while the visitor reads the page. */
export function wakeAgent(): void {
  fetch(`${AGENT_URL}/health`).catch(() => {});
}

const retryText = (res: Response): string => {
  const s = Number(res.headers.get('Retry-After'));
  if (!s) return 'in a little while';
  return s < 90 ? `in ${s} seconds` : `in about ${Math.ceil(s / 60)} minutes`;
};

const detailOf = async (res: Response): Promise<string> => {
  try {
    const body = await res.json();
    return typeof body.detail === 'string' ? body.detail : '';
  } catch {
    return '';
  }
};

export async function askAgent(query: string, signal?: AbortSignal): Promise<AgentResult> {
  let res: Response;
  try {
    res = await fetch(`${AGENT_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.slice(0, MAX_QUESTION_LENGTH), session_id: sessionId() }),
      signal,
    });
  } catch {
    return { ok: false, kind: 'down', message: "I can't reach my answer service right now. These sections should help in the meantime." };
  }

  if (res.ok) {
    try {
      const body = await res.json();
      if (typeof body.response === 'string' && body.response.trim()) return { ok: true, text: body.response.trim() };
    } catch {
      // fall through to the generic message
    }
    return { ok: false, kind: 'down', message: 'Something went wrong with that answer. Try asking again.' };
  }

  if (res.status === 422) {
    return { ok: false, kind: 'invalid', message: `Questions can be up to ${MAX_QUESTION_LENGTH} characters. Try a shorter one.` };
  }
  if (res.status === 429) {
    const detail = await detailOf(res);
    const daily = /tomorrow/i.test(detail);
    return {
      ok: false,
      kind: 'limit',
      message: daily
        ? "I've answered all the questions I can for today. Try again tomorrow, or use the sections below."
        : `That's a lot of questions in a short time. Try again ${retryText(res)}.`,
    };
  }
  if (res.status === 503) {
    return { ok: false, kind: 'busy', message: `My answer service is busy. Try again ${retryText(res)}.` };
  }
  return { ok: false, kind: 'down', message: "I can't reach my answer service right now. These sections should help in the meantime." };
}
