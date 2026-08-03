import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { escapeHtml, renderFields, sendNotification } from "./mailer.server";

const DemoRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  workEmail: z.string().trim().email("Invalid email").max(255),
  company: z.string().trim().min(1, "Company is required").max(200),
  role: z.string().trim().max(120).optional().or(z.literal("")),
  companySize: z.string().trim().max(50).optional().or(z.literal("")),
  useCase: z.string().trim().max(80).optional().or(z.literal("")),
  engine: z.string().trim().max(50).optional().or(z.literal("")),
  deployment: z.string().trim().max(50).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  consent: z.boolean(),
  source: z.string().trim().max(120).optional().or(z.literal("")),
});

export const submitDemoRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DemoRequestSchema.parse(input))
  .handler(async ({ data }) => {
    if (!data.consent) {
      throw new Error("You must agree to be contacted.");
    }

    const to = process.env.MAIL_TO_DEMO;
    if (!to) throw new Error("MAIL_TO_DEMO is not set");

    const html = `
      <h2 style="font-family:system-ui,sans-serif;font-size:16px;margin:0 0 12px;">New demo request</h2>
      ${renderFields([
        ["Name", data.name],
        ["Work email", data.workEmail],
        ["Company", data.company],
        ["Role", data.role || null],
        ["Company size", data.companySize || null],
        ["Use case", data.useCase || null],
        ["Engine preference", data.engine || null],
        ["Deployment preference", data.deployment || null],
        ["Source", data.source || "website"],
      ])}
      ${data.message ? `<p style="font-family:system-ui,sans-serif;font-size:14px;margin-top:16px;"><strong>Message:</strong><br>${escapeHtml(data.message).replace(/\n/g, "<br>")}</p>` : ""}
    `;

    try {
      await sendNotification({
        to,
        subject: `Demo request — ${data.company} (${data.name})`,
        html,
        replyTo: data.workEmail,
      });
    } catch (err) {
      console.error("[demo_requests] mail send failed", err);
      throw new Error("Could not submit your request. Please try again.");
    }

    return { ok: true as const };
  });
