import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { escapeHtml, renderFields, sendNotification } from "./mailer.server";

const ApplicationSchema = z.object({
  role: z.string().trim().min(1).max(160),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  consent: z.boolean(),
  cv: z
    .object({
      filename: z.string().min(1).max(160),
      mimeType: z.string().min(1).max(120),
      // base64-encoded file contents (no data: prefix)
      base64: z.string().min(1).max(8_500_000), // ~6MB binary after decode
    })
    .nullable()
    .optional(),
});

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

// Resend's API caps total payload at ~40MB but practical attachment limit is
// lower because the message also has to fit through downstream mail servers.
// We keep the same 5MB ceiling the old Supabase Storage path used.
const MAX_CV_BYTES = 5 * 1024 * 1024;

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ApplicationSchema.parse(input))
  .handler(async ({ data }) => {
    if (!data.consent) throw new Error("You must agree to be contacted.");

    const to = process.env.MAIL_TO_CAREERS;
    if (!to) throw new Error("MAIL_TO_CAREERS is not set");

    let attachment: { filename: string; content: Buffer } | undefined;

    if (data.cv) {
      if (!ALLOWED_MIME.has(data.cv.mimeType)) {
        throw new Error("Unsupported CV file type. Please upload PDF, DOC, DOCX, or TXT.");
      }
      const bytes = Buffer.from(data.cv.base64, "base64");
      if (bytes.byteLength > MAX_CV_BYTES) {
        throw new Error("CV file is too large (max 5MB).");
      }
      const safeName = data.cv.filename.replace(/[^\w.-]+/g, "_").slice(0, 120);
      attachment = { filename: safeName, content: bytes };
    }

    const html = `
      <h2 style="font-family:system-ui,sans-serif;font-size:16px;margin:0 0 12px;">New job application</h2>
      ${renderFields([
        ["Role", data.role],
        ["Name", data.name],
        ["Email", data.email],
        ["CV", attachment ? attachment.filename : "(none attached)"],
      ])}
      ${data.message ? `<p style="font-family:system-ui,sans-serif;font-size:14px;margin-top:16px;"><strong>Message:</strong><br>${escapeHtml(data.message).replace(/\n/g, "<br>")}</p>` : ""}
    `;

    try {
      await sendNotification({
        to,
        subject: `Application — ${data.role} — ${data.name}`,
        html,
        replyTo: data.email,
        attachments: attachment ? [attachment] : undefined,
      });
    } catch (err) {
      console.error("[job_applications] mail send failed", err);
      throw new Error("Could not submit your application. Please try again.");
    }

    return { ok: true as const };
  });
