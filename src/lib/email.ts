/**
 * Minimal email sending — a direct fetch() to the Resend HTTP API rather
 * than the `resend` npm package, so this doesn't add another dependency
 * to install. If RESEND_API_KEY isn't set (e.g. local dev without an
 * account), this logs to the console instead of sending — the app should
 * never crash or block a user-facing action just because email isn't
 * configured yet.
 *
 * No durable queue here — sends are still fire-and-forget, called with a
 * bare `await` wrapped in try/catch at the call site so a failed send
 * never fails the underlying operation (approving a submission should
 * never roll back because an email provider hiccuped). `sendEmailSafely`
 * does retry a couple of times with a short backoff first, which covers
 * the common case (a transient network blip or a momentary 5xx from
 * Resend) without needing a real queue. It still can't guarantee delivery
 * — a sustained outage just becomes a few missed emails instead of one.
 * Revisit with a real queue (see docs/PLAN.md Phase 5's background-jobs
 * note) if delivery guarantees start to matter.
 */

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Staffic <notifications@staffic.dev>";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[email:not-configured] to=${input.to} subject="${input.subject}"`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
}

const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Never let a notification failure break the calling action. Retries a
 * couple of times with a short linear backoff before giving up and
 * logging — a bounded, synchronous retry, not a queue (see the file-level
 * comment above for why that distinction matters).
 */
export async function sendEmailSafely(input: SendEmailInput): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      await sendEmail(input);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_ATTEMPTS) {
        await delay(RETRY_BASE_DELAY_MS * attempt);
      }
    }
  }

  console.error(
    `[email:failed] to=${input.to} subject="${input.subject}" after ${RETRY_ATTEMPTS} attempts`,
    lastError,
  );
}
