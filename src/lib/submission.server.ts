// Delivers a form submission to its two sinks: the Dataverse row (the record Power Automate
// turns into a Jira issue) and the notification email. They run in parallel and the
// submission counts as received if either lands, so one outage never loses a lead; each
// failure is logged. Server-only.

import { dataverseConfigured } from "./dataverse.server";

export async function deliver(
  label: string,
  sinks: { dataverse: () => Promise<unknown>; email: () => Promise<unknown> },
  failureMessage: string,
): Promise<void> {
  const useDataverse = dataverseConfigured();
  if (!useDataverse) console.warn(`[${label}] Dataverse not configured — email only`);

  const [dv, mail] = await Promise.allSettled([
    useDataverse ? sinks.dataverse() : Promise.reject(new Error("not configured")),
    sinks.email(),
  ]);
  // One short reference per submission, in every log line and in the visitor's error, so a
  // "it didn't work, Ref K7Q2MX" email can be matched to the Netlify function log.
  const ref = Math.random().toString(36).slice(2, 8).toUpperCase();
  if (useDataverse && dv.status === "rejected")
    console.error(`[${label}] Ref ${ref} Dataverse write failed`, dv.reason);
  if (mail.status === "rejected") console.error(`[${label}] Ref ${ref} mail send failed`, mail.reason);

  if (dv.status === "rejected" && mail.status === "rejected") {
    throw new Error(`${failureMessage} (Ref ${ref})`);
  }
}
