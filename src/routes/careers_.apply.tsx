import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { submitApplication } from "@/lib/careers.functions";

const SearchSchema = z.object({
  role: z.string().trim().min(1).max(160).optional().catch(undefined),
});

export const Route = createFileRoute("/careers_/apply")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: ApplyPage,
  head: () => ({
    meta: [
      { title: "Apply · Blindsight Careers" },
      { name: "description", content: "Apply to join Blindsight. Send us your CV and we'll be in touch." },
    ],
    links: [{ rel: "canonical", href: "/careers/apply" }],
  }),
});

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function ApplyPage() {
  const { role } = Route.useSearch();
  const submit = useServerFn(submitApplication);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || "").trim();
    const email = String(f.get("email") || "").trim();
    const message = String(f.get("message") || "").trim();
    const consent = f.get("consent") === "on";
    const file = f.get("cv") as File | null;

    if (!consent) {
      setError("Please confirm you agree to be contacted.");
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setError("CV must be 5MB or smaller.");
      return;
    }

    setSubmitting(true);
    try {
      const cv =
        file && file.size > 0
          ? {
              filename: file.name,
              mimeType: file.type || "application/octet-stream",
              base64: await fileToBase64(file),
            }
          : null;
      await submit({
        data: {
          role: role || "General application",
          name,
          email,
          message,
          consent,
          cv,
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <section className="section demo-section">
        <div className="section-inner demo-compact">
          <div className="demo-compact-head reveal">
            <span className="tag">Apply{role ? ` · ${role}` : ""}</span>
            <h1 className="demo-title">Join the team.</h1>
            <p className="demo-sub">
              Send your CV and a short note. We read every application and reply within a few business days.
            </p>
          </div>

          <div className="demo-form-wrap reveal">
            {done ? (
              <div className="demo-success">
                <span className="tag">Received</span>
                <h2>Thanks - we'll be in touch.</h2>
                <p>
                  Questions in the meantime? Write to{" "}
                  <a href="mailto:careers@blindsight.io">careers@blindsight.io</a>.
                </p>
                <p style={{ marginTop: 18 }}>
                  <Link to="/careers" className="btn btn-ghost">← Back to careers</Link>
                </p>
              </div>
            ) : (
              <form className="demo-form" onSubmit={onSubmit} noValidate>
                <label className="demo-field">
                  <span>Name *</span>
                  <input name="name" type="text" required maxLength={120} autoComplete="name" />
                </label>
                <label className="demo-field">
                  <span>Email *</span>
                  <input name="email" type="email" required maxLength={255} autoComplete="email" />
                </label>
                <label className="demo-field">
                  <span>CV (PDF, DOC, DOCX or TXT · max 5MB)</span>
                  <input name="cv" type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" />
                </label>
                <label className="demo-field">
                  <span>Tell us anything relevant about you, your needs, your use case</span>
                  <textarea
                    name="message"
                    rows={4}
                    maxLength={2000}
                    placeholder="Optional - links, what you'd build here, when you can start."
                  />
                </label>
                <label className="demo-consent">
                  <input name="consent" type="checkbox" defaultChecked />
                  <span>I agree to be contacted by Blindsight about this application.</span>
                </label>
                {error && <div className="demo-error" role="alert">{error}</div>}
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Sending…" : "Submit application"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
