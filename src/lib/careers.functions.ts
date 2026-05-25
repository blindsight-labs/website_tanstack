import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ApplicationSchema.parse(input))
  .handler(async ({ data }) => {
    if (!data.consent) throw new Error("You must agree to be contacted.");

    let cvPath: string | null = null;

    if (data.cv) {
      if (!ALLOWED_MIME.has(data.cv.mimeType)) {
        throw new Error("Unsupported CV file type. Please upload PDF, DOC, DOCX, or TXT.");
      }
      const bytes = Buffer.from(data.cv.base64, "base64");
      if (bytes.byteLength > 5 * 1024 * 1024) {
        throw new Error("CV file is too large (max 5MB).");
      }
      const safeName = data.cv.filename.replace(/[^\w.\-]+/g, "_").slice(0, 120);
      const key = `${crypto.randomUUID()}/${safeName}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("cv-uploads")
        .upload(key, bytes, { contentType: data.cv.mimeType, upsert: false });
      if (upErr) {
        console.error("[cv-uploads] upload failed", upErr);
        throw new Error("Could not upload your CV. Please try again.");
      }
      cvPath = key;
    }

    const { error } = await supabaseAdmin.from("job_applications").insert({
      role: data.role,
      name: data.name,
      email: data.email,
      message: data.message || null,
      cv_path: cvPath,
      consent: data.consent,
      source: "careers-apply",
    });

    if (error) {
      console.error("[job_applications] insert failed", error);
      throw new Error("Could not submit your application. Please try again.");
    }

    return { ok: true as const };
  });
