// Thin wrapper around Resend. Server-only — never import from client code.
//
// Required env (set in Netlify → Site settings → Environment variables):
//   RESEND_API_KEY      — API key from https://resend.com/api-keys
//   MAIL_FROM           — verified sender, e.g. "Blindsight <noreply@blindsight.io>"
//   MAIL_TO_DEMO        — recipient for demo requests
//   MAIL_TO_CAREERS     — recipient for job applications
//
// Domain `blindsight.io` must be verified in Resend (SPF include added to the
// existing Microsoft 365 SPF record; Resend's DKIM record added separately).

import { Resend } from "resend";

type Attachment = {
  filename: string;
  content: Buffer;
};

let cached: Resend | undefined;

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set");
  }
  cached ??= new Resend(key);
  return cached;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export async function sendNotification(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Attachment[];
}): Promise<void> {
  const from = requireEnv("MAIL_FROM");
  const { error } = await getResend().emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo,
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });
  if (error) {
    // Re-throw so the server function returns a 500 to the client.
    throw new Error(`Resend send failed: ${error.message}`);
  }
}

// Minimal HTML escaping for user-supplied strings interpolated into the email body.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Renders a labelled list of fields. Skips empty values.
export function renderFields(rows: Array<[label: string, value: string | null | undefined]>): string {
  const items = rows
    .filter(([, v]) => v != null && v !== "")
    .map(
      ([label, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top;"><strong>${escapeHtml(label)}</strong></td><td style="padding:4px 0;">${escapeHtml(String(v))}</td></tr>`,
    )
    .join("");
  return `<table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px;">${items}</table>`;
}
