import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DemoRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  workEmail: z.string().trim().email("Invalid email").max(255),
  company: z.string().trim().min(1, "Company is required").max(200),
  role: z.string().trim().max(120).optional().or(z.literal("")),
  companySize: z.string().trim().max(50).optional().or(z.literal("")),
  useCase: z.string().trim().max(80).optional().or(z.literal("")),
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

    const { error } = await supabaseAdmin.from("demo_requests").insert({
      name: data.name,
      work_email: data.workEmail,
      company: data.company,
      role: data.role || null,
      company_size: data.companySize || null,
      use_case: data.useCase || null,
      message: data.message || null,
      consent: data.consent,
      source: data.source || "website",
    });

    if (error) {
      console.error("[demo_requests] insert failed", error);
      throw new Error("Could not submit your request. Please try again.");
    }

    return { ok: true as const };
  });
