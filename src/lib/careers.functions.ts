import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyCaptcha } from "./captcha.server";
import { createRow, uploadFile } from "./dataverse.server";
import { JOB_APPLICATIONS } from "./dataverse-schema";
import { escapeHtml, renderFields, sendNotification } from "./mailer.server";
import { deliver } from "./submission.server";

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
      base64: z.string().min(1).max(5_600_000), // 4MB binary as base64 (+33%)
    })
    .nullable()
    .optional(),
  captchaToken: z.string().max(4096).optional(),
});

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

/** The file's leading bytes ("magic numbers") must match its extension. */
function contentMatches(ext: string, b: Buffer): boolean {
  const starts = (sig: number[]) => sig.every((v, i) => b[i] === v);
  switch (ext) {
    case "pdf":
      return starts([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
    case "doc":
      return starts([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // OLE2 compound file
    case "docx":
      return starts([0x50, 0x4b, 0x03, 0x04]); // ZIP (OOXML)
    case "txt":
      return !b.subarray(0, 8192).includes(0); // text: no NUL bytes
    default:
      return false;
  }
}

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

// Resend's API caps total payload at ~40MB but practical attachment limit is
// lower because the message also has to fit through downstream mail servers.
// 4MB, not more: the CV travels base64-encoded (+33%) inside the server function's request,
// and Netlify rejects request bodies over 6MB before this code runs.
const MAX_CV_BYTES = 4 * 1024 * 1024;

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ApplicationSchema.parse(input))
  .handler(async ({ data }) => {
    if (!data.consent) throw new Error("You must agree to be contacted.");
    await verifyCaptcha(data.captchaToken, "careers");

    const to = process.env.MAIL_TO_CAREERS ?? "";

    let attachment: { filename: string; content: Buffer } | undefined;

    if (data.cv) {
      // The extension decides the type (browsers often send none for .doc/.docx), and the
      // file's own first bytes must agree: a renamed .html/.svg/.exe is refused, whatever
      // type the client claims.
      const ext = data.cv.filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
      const mimeType = MIME_BY_EXT[ext];
      if (!mimeType || !ALLOWED_MIME.has(mimeType)) {
        throw new Error("Unsupported CV file type. Please upload PDF, DOC, DOCX, or TXT.");
      }
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data.cv.base64)) {
        throw new Error("The CV file couldn't be read. Please choose it again.");
      }
      const bytes = Buffer.from(data.cv.base64, "base64");
      if (bytes.byteLength > MAX_CV_BYTES) {
        throw new Error("CV file is too large (max 4MB).");
      }
      if (!contentMatches(ext, bytes)) {
        throw new Error("That file doesn't look like a real PDF, DOC, DOCX or TXT. Please export your CV again.");
      }
      // never the visitor's own file name: a fixed, readable one
      const slug = data.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
      attachment = { filename: `cv-${slug || "applicant"}.${ext}`, content: bytes };
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

    await deliver(
      "job_applications",
      {
        dataverse: async () => {
          const id = await createRow(JOB_APPLICATIONS.entitySet, {
            web_name: `${data.role} — ${data.name}`.slice(0, 400),
            web_role: data.role,
            web_fullname: data.name,
            web_email: data.email,
            web_message: data.message || null,
            web_cvfilename: attachment?.filename ?? null,
            web_consent: true,
            web_consentat: new Date().toISOString(),
          });
          if (attachment) await uploadFile(JOB_APPLICATIONS.entitySet, id, "web_cv", attachment);
        },
        email: () =>
          sendNotification({
            to,
            subject: `Application — ${data.role} — ${data.name}`.replace(/[\r\n]+/g, " "),
            html,
            replyTo: data.email,
            attachments: attachment ? [attachment] : undefined,
          }),
      },
      "A problem on our side stopped your application from being saved. Your details are still in the form, so you can send it again in a minute.",
    );

    return { ok: true as const };
  });
