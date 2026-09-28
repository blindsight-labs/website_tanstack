# Forms, consent and compliance — setup

How the site's forms, consent banner and analytics are wired, and the one-time setup outside
the code. Code: `src/lib/{demo,careers}.functions.ts`, `src/lib/dataverse*.ts`,
`src/lib/captcha.server.ts`, `src/lib/consent.ts`.

```
Demo / trial / download form ─┐                        ┌─► Dataverse web_demorequests ──(Power Automate)──► Jira: TRIALS board
                              ├─ reCAPTCHA check ──────┤
Job application form ─────────┘  (server-side)         ├─► Dataverse web_jobapplications ─(Power Automate)─► Jira: HIRING board
                                                       └─► notification email (Resend)
```

A submission counts as received if **either** the Dataverse write or the email succeeds; both
failing shows the visitor an error. Every failure is logged in the Netlify function logs.

## 1. Environment variables (Netlify → Site configuration → Environment variables)

| Variable | Scope | Notes |
| --- | --- | --- |
| `VITE_COOKIEBOT_CBID` | build | Cookiebot domain group ID. **Unset = no banner and no Google Analytics.** |
| `VITE_RECAPTCHA_SITE_KEY` | build | reCAPTCHA v3 site key (public). |
| `RECAPTCHA_SECRET_KEY` | functions | reCAPTCHA secret. **Unset in production = every form submission is rejected.** |
| `RECAPTCHA_MIN_SCORE` | functions | Optional, default `0.5` (0 = bot, 1 = human). |
| `DATAVERSE_URL` | functions | `https://org5198f2b6.crm4.dynamics.com` |
| `DATAVERSE_TENANT_ID` / `DATAVERSE_CLIENT_ID` / `DATAVERSE_CLIENT_SECRET` | functions | Entra app registration (step 3). |
| `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_TO_DEMO`, `MAIL_TO_CAREERS` | functions | Unchanged. |

`VITE_*` values are baked in at build time, so trigger a redeploy after changing them.

## 2. Google reCAPTCHA v3

Chosen to stay with one vendor (Google, as for Analytics). Invisible: no checkbox, each submission gets a score.

1. https://www.google.com/recaptcha/admin → **Create** → type **Score based (v3)**. Domains: `blindsight.io` (and the Netlify preview domain for testing). Owner: admin@blindsight.io.
2. Copy the **site key** into `VITE_RECAPTCHA_SITE_KEY` and the **secret key** into `RECAPTCHA_SECRET_KEY`.
3. After a few weeks of traffic, check the score distribution in the admin console; raise or lower `RECAPTCHA_MIN_SCORE` if real people are being refused or spam gets through.
4. Compliance: the script loads **only while a form is on screen**, never site-wide, and the privacy notice discloses it (legitimate interest, spam protection). The badge is hidden and replaced by Google's required attribution line under each form. In Cookiebot, classify its cookie (`_GRECAPTCHA`) as **Necessary**.
5. Local dev: keys unset, the check is skipped (it is enforced whenever `NODE_ENV=production`).

## 3. Microsoft Dataverse

1. **Environment.** In use: **Blindsight (default)**, `https://org5198f2b6.crm4.dynamics.com` (crm4 = Europe). The tables live in the unmanaged solution **Blindsight Website** (publisher *Blindsight*, prefix `web`). A dedicated production environment in Switzerland would be cleaner later; export the solution to move it.
2. **App registration.** Entra admin center → App registrations → New (`blindsight-website`), single tenant. Certificates & secrets → new client secret (put a reminder on its expiry date). Note the tenant ID and client ID.
3. **Application user.** Power Platform admin center → the environment → Settings → Users + permissions → Application users → New → pick the app registration → security role **Website form writer** (step 5). Table creation no longer needs it: step 4 is done.
4. **Create the tables.** ✅ Done 2026-09-28 (run as admin@blindsight.io with an `az` token, verified with a live write/read/delete). To re-run or add columns:
   ```bash
   U=https://org5198f2b6.crm4.dynamics.com
   DATAVERSE_URL=$U DATAVERSE_SOLUTION=BlindsightWebsite DATAVERSE_ACCESS_TOKEN=$(az account get-access-token --resource $U --query accessToken -o tsv) bun --no-env-file scripts/dataverse-setup.ts
   ```
   It creates `web_demorequest` and `web_jobapplication` with all their columns and is safe to re-run. To put them in a solution, set `DATAVERSE_SOLUTION=<unique name>` (the publisher prefix must be `web`).
5. **Least privilege.** Create a security role `Website form writer` with **Create** (Organization) on *Demo request* and *Job application* and nothing else, give it to the application user, and **remove System Customizer**.
6. **Retention** (it must match the privacy notice). Settings → Data management → Bulk deletion, recurring daily:
   - Demo requests: *Created On* older than 24 months.
   - Job applications: *Created On* older than 6 months (or run a manual check when a role closes).
7. **Access.** Give only sales/founders read access to Demo requests, and only the hiring team read access to Job applications (CVs).

## 4. Power Automate → Jira (two flows)

Needs a Power Automate Premium licence (the Dataverse connector is premium) and a Jira service account with an API token.

**Jira** (blindsight-team.atlassian.net): two Kanban projects, named in the site's existing "Team | Topic" style:
- **Sales | Trials & Demos**, key `TRIALS`. Columns: New → Qualified → Demo scheduled → Trial active → Closed won / Closed lost.
- **People | Hiring Pipeline**, key `HIRING`. Columns: Applied → Screening → Interviewing → Offer → Hired / Declined. It holds candidate data, so it should be **private** to the hiring team.

> **Open item (accepted for now, 2026-09-28):** the Jira site is on the Free plan, where every space is visible to everyone on the site ("Everyone's an admin access"). Until the site moves to Standard, the hiring board is visible to all Jira users. This is accepted on the basis that everyone on the site is involved in hiring. **On upgrade:** Space settings → Access → Private, then add only the hiring team.

**Flow A: Demo request → TRIALS** (built and live: "Website · Demo requests → Jira TRIALS")
1. Trigger: *Dataverse · When a row is added* on **Demo requests** (organization scope).
2. *Jira · Create a new issue (V3)* in `TRIALS`, Task: summary `web_name`; description = the message, submitted time and a link to the Dataverse record.
3. *Jira · Edit issue (V2)* sets the structured fields (Space settings → Fields in TRIALS):

   | Jira field | ID | From |
   |---|---|---|
   | Request type (dropdown) | customfield_10108 | `web_source`: free-trial → Free trial, download-app → App download, else Demo |
   | Segment (dropdown) | customfield_10115 | `web_segment` (Larger team / Startup) |
   | Contact name | customfield_10109 | `web_fullname` |
   | Work email | customfield_10110 | `web_workemail` |
   | Company | customfield_10111 | `web_company` (blank for startups) |
   | Role | customfield_10112 | `web_role` |
   | Company size (dropdown) | customfield_10116 | `web_companysize` |
   | Engine (dropdown) | customfield_10117 | `web_engine` |
   | Deployment (dropdown) | customfield_10118 | `web_deployment` |
   | Use case | customfield_10113 | `web_usecase` |
   | Terms accepted | customfield_10114 | "Evaluation Terms " + `web_termsversion` |
   | Labels | | `website` + `web_source` |

   Dropdown values must match the Jira options exactly; the form sends these exact strings. Empty values leave the field blank. If you rename an option in Jira, change the form (`DemoForm.tsx`) too.
4. *Dataverse · Update a row* writes the issue key into **Jira issue** (`web_jiraissuekey`).

Jira note: the connector fails on projects whose create screen shows **Reporter**; it was removed from the Task layout in both projects (Jira still records the creator).

**Flow B: Job application → HIRING** (built and live: "Website · Job applications → Jira HIRING")
Same shape as Flow A: trigger on **Job applications**, create a Task in `HIRING` (summary `web_name`; description = message, submitted time, link to the record), then *Edit issue (V2)* sets:

| Jira field | ID | From |
|---|---|---|
| Position | customfield_10119 | `web_role` |
| Candidate name | customfield_10120 | `web_fullname` |
| Email | customfield_10121 | `web_email` |
| CV file | customfield_10122 | `web_cvfilename` ("No CV attached" if none) |
| Application record (URL) | customfield_10123 | link to the Dataverse record |
| Labels | | `website` |

**The CV is never copied into Jira.** It stays in Dataverse (file column `web_cv`); recruiters open it from **Application record**. One place, one retention rule.

Both flows: turn on *Settings → Retry policy* (default exponential) and add yourself to failure notifications. Jira issues hold personal data too, so add a Jira automation rule that deletes (or anonymises) issues older than the same retention periods.

**Flow C: TRIALS approved → workspace + invite email**

Moving a TRIALS task to **Done** (status id `10082`, shown as "Approved" on the board) creates the client's workspace and emails them the invite link. **Rejected** and **Cancelled** do nothing. Neither does "Done" in any other project.

```
Jira: task → Done ──(Jira automation: web request)──► Power Automate (HTTP trigger)
   ► Dataverse: find the demo request by web_jiraissuekey
   ► license admin: POST https://admin.blindsight.io/service/trial-approvals
        creates the workspace: Enterprise plan, licence expires in 14 days
        the platform emails the client the standard "You're invited to Blindsight" email (link valid 7 days)
   ► Jira: comment on the task with the outcome
```

The license admin does the work (`backend/app/routers/service.py` in blindsight-license-admin). The platform mails the link, and it never reaches Jira or the flow's run history.
- **Idempotent per issue.** Approving the same task again, or a retried run, returns `"status": "exists"`. It creates no second workspace and sends no second email.
- **Trial terms are set on the license admin, not the flow:** `TRIAL_PLAN_SLUG` (enterprise), `TRIAL_DAYS` (14), `TRIAL_INVITE_EXPIRES_HOURS` (168).
- To re-send the invite later, open the workspace in the license admin → *Platform access* → tick **Email them the link**.

Setup:

1. **License admin.** Generate a token with `openssl rand -hex 32` and set `TRIAL_APPROVAL_TOKEN` on the instance (`deploy/compose.prod.yaml`), then redeploy. Without it the route answers 503.
2. **Power Automate.** ✅ Built 2026-09-28: *Website · TRIALS approved → workspace + invite* (flow id `3673b32b-f3f2-4ce0-83dd-1e3c1e06b967`). It uses the same Jira and Dataverse connections as Flow A. It is saved **turned off**, with two placeholders to replace before turning it on:
   - **Check request** condition: replace `PASTE-JIRA-SHARED-SECRET-HERE` with a random value (`openssl rand -hex 24`). The same value goes in the Jira rule's body.
   - **Create workspace** (HTTP) header: replace `PASTE-TRIAL-APPROVAL-TOKEN-HERE` with the license admin's `TRIAL_APPROVAL_TOKEN`. Secure inputs is on, so it is hidden in run history.

   Then turn the flow on and copy the trigger's HTTP URL (it carries a signature, so treat it as a secret). What it does:
   1. *When Jira approves a trial* (HTTP trigger, who can trigger: Anyone). Body: `{"issueKey", "statusId", "secret"}`.
   2. *Check request*: `statusId` is `10082` and `secret` matches. Otherwise it answers 403 and stops.
   3. *Find demo request*: Demo requests where `web_jiraissuekey` equals the issue key, top 1. If none, it comments "No website request is linked to this task…" and stops.
   4. *Create workspace*: POST `https://admin.blindsight.io/service/trial-approvals` with the key, work email, name and company.
   5. *Comment result* on the issue, whether the call succeeded or failed:
      - created: licence admin #, invite emailed (or not), trial end date;
      - exists: nothing was sent again;
      - platform error: finish it in the license admin;
      - failure: the HTTP status code.
   6. *Respond done* 200. If the workspace was not created, the run then ends as **Failed**, so the flow's failure alerts reach you.
3. **Jira automation** (Sales | Trials & Demos → Space settings → Automation → Create rule):
   - Trigger: *Work item transitioned*, to status **Done**.
   - Action: *Send web request*:
     - URL: the flow's HTTP trigger URL. Method POST, body **Custom data**: `{"issueKey": "{{issue.key}}", "statusId": "{{issue.status.id}}", "secret": "<the second value>"}`.
     - Tick **Delay execution of subsequent rule actions until we've received a response**, so failures show in the rule's audit log.
4. **Test** with a `[TEST]` task (e.g. TRIALS-2) pointed at your own email. Check the comment, the email, and the new workspace in the license admin. Then delete the workspace from the license admin (with purge).

## 5. Cookiebot

1. Cookiebot account (admin.cookiebot.com, filipe.azevedo@blindsight.io), domain `blindsight.io`, domain group ID `a768bbcf-0728-4829-aa88-15def193146e` → set as `VITE_COOKIEBOT_CBID` in Netlify (it's public: it ends up in every page's HTML).
2. **Regional settings (geo-targeting):**
   - EU/EEA, UK, Switzerland → **GDPR** template (opt-in, "Deny" as prominent as "Allow all").
   - United States (at least CA, CO, CT, VA, UT, TX, OR) → **CCPA/US** template (opt-out), with **"Respect Global Privacy Control"** turned on.
   - Rest of world → GDPR (the safe default).
3. Banner: categories *Necessary* and *Statistics* only (no Marketing on this site). Language: auto-detect.
4. The site runs Cookiebot in **manual** blocking mode (auto-blocking breaks React hydration). Analytics tags are marked `data-cookieconsent="statistics"` in `src/lib/consent.ts`. **Any new third-party tag must be added there, gated the same way**, and then shows up in the monthly scan and the cookie declaration on `/privacy`.
5. Consent Mode v2 defaults (everything denied) are set before Cookiebot loads.

## 6. Google Analytics 4 (property G-06PKBPMVBJ)

In GA admin:
- Data settings → Data collection → **Google signals: off**; *Granular location and device data collection*: off for EU/CH.
- Data retention → **14 months** (the privacy notice says 14 months).
- Account settings → accept the **Data Processing Terms** (and the Measurement Controller-Controller terms).
- Events tracked by the site: `page_view` (including client-side navigation) and `generate_lead` (`form`: demo-form / download-app / free-trial / job-application). No form contents are sent.

## 7. Before go-live checklist

- [ ] All env vars set in Netlify, and the site redeployed.
- [ ] Banner appears in an EU/CH browser; with "Deny", no `_ga` cookie is set and no request goes to `googletagmanager.com`.
- [ ] A demo request and an application each create a Dataverse row, an email, and a Jira issue with the key written back.
- [ ] `/privacy` shows the Cookiebot cookie declaration.
- [ ] DPAs signed/accepted: Netlify, Resend, Microsoft (Product Terms/DPA), Atlassian, Cloudflare, Usercentrics, Google.
- [ ] Jira upgraded to Standard and **People | Hiring Pipeline** set to private (see section 4).
- [ ] Legal review of `/privacy` and `/evaluation-terms` (see the open points in the handover notes).
