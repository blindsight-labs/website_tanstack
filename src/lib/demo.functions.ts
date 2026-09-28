import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyCaptcha } from "./captcha.server";
import { EVALUATION_TERMS_VERSION } from "./evaluation-terms";
import { createRow } from "./dataverse.server";
import { DEMO_REQUESTS } from "./dataverse-schema";
import { escapeHtml, renderFields, sendNotification } from "./mailer.server";
import { deliver } from "./submission.server";

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
  segment: z.enum(["Larger team", "Startup", ""]).optional(),
  captchaToken: z.string().max(4096).optional(),
});

export const submitDemoRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DemoRequestSchema.parse(input))
  .handler(async ({ data }) => {
    if (!data.consent) {
      throw new Error("You must accept the Evaluation Terms.");
    }
    await verifyCaptcha(data.captchaToken, "demo");

    const to = process.env.MAIL_TO_DEMO ?? "";

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
        ["Segment", data.segment || null],
        ["Terms accepted", `Evaluation Terms ${EVALUATION_TERMS_VERSION}`],
      ])}
      ${data.message ? `<p style="font-family:system-ui,sans-serif;font-size:14px;margin-top:16px;"><strong>Message:</strong><br>${escapeHtml(data.message).replace(/\n/g, "<br>")}</p>` : ""}
    `;

    const source = data.source || "website";
    await deliver(
      "demo_requests",
      {
        dataverse: () =>
          createRow(DEMO_REQUESTS.entitySet, {
            web_name: `${data.company} — ${data.name}`.slice(0, 400),
            web_fullname: data.name,
            web_workemail: data.workEmail,
            web_company: data.company,
            web_role: data.role || null,
            web_companysize: data.companySize || null,
            web_usecase: data.useCase || null,
            web_engine: data.engine || null,
            web_deployment: data.deployment || null,
            web_message: data.message || null,
            web_source: source,
            ...(data.segment ? { web_segment: data.segment } : {}),
            web_consent: true,
            web_consentat: new Date().toISOString(),
            web_termsversion: EVALUATION_TERMS_VERSION,
          }),
        email: () =>
          sendNotification({
            to,
            subject: `Demo request — ${data.company} (${data.name})`.replace(/[\r\n]+/g, " "),
            html,
            replyTo: data.workEmail,
          }),
      },
      "A problem on our side stopped your request from being saved. Your details are still in the form, so you can send it again in a minute.",
    );

    return { ok: true as const };
  });
