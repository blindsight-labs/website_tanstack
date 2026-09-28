// The Dataverse tables the site's forms write to. Single source of truth for the server
// (dataverse.server.ts) and for scripts/dataverse-setup.ts, which creates them.
//
// All names carry the solution publisher's prefix ("web_"). Power Automate flows watch these
// tables and create the Jira issues (see docs/forms-dataverse-jira.md); they write the issue
// key back into `web_jiraissuekey`.

export type ColumnDef =
  | { kind: "text"; name: string; label: string; max: number; format?: "Email" | "Text" }
  | { kind: "memo"; name: string; label: string; max: number }
  | { kind: "bool"; name: string; label: string }
  | { kind: "datetime"; name: string; label: string }
  | { kind: "file"; name: string; label: string; maxKb: number };

export type TableDef = {
  logicalName: string;
  entitySet: string;
  label: string;
  pluralLabel: string;
  description: string;
  /** The primary name column (always text). */
  primary: { name: string; label: string; max: number };
  columns: ColumnDef[];
};

export const DEMO_REQUESTS: TableDef = {
  logicalName: "web_demorequest",
  entitySet: "web_demorequests",
  label: "Demo request",
  pluralLabel: "Demo requests",
  description: "Demo, download and trial requests from blindsight.io.",
  primary: { name: "web_name", label: "Title", max: 400 },
  columns: [
    { kind: "text", name: "web_fullname", label: "Name", max: 120 },
    { kind: "text", name: "web_workemail", label: "Work email", max: 255, format: "Email" },
    { kind: "text", name: "web_company", label: "Company", max: 200 },
    { kind: "text", name: "web_role", label: "Role", max: 120 },
    { kind: "text", name: "web_companysize", label: "Company size", max: 50 },
    { kind: "text", name: "web_usecase", label: "Use case", max: 80 },
    { kind: "text", name: "web_engine", label: "Engine preference", max: 50 },
    { kind: "text", name: "web_deployment", label: "Deployment preference", max: 50 },
    { kind: "memo", name: "web_message", label: "Message", max: 2000 },
    { kind: "text", name: "web_source", label: "Source", max: 120 },
    { kind: "text", name: "web_segment", label: "Segment", max: 40 },
    { kind: "bool", name: "web_consent", label: "Consent to be contacted" },
    { kind: "datetime", name: "web_consentat", label: "Consent given at" },
    { kind: "text", name: "web_termsversion", label: "Evaluation Terms version", max: 20 },
    { kind: "text", name: "web_jiraissuekey", label: "Jira issue", max: 40 },
  ],
};

export const JOB_APPLICATIONS: TableDef = {
  logicalName: "web_jobapplication",
  entitySet: "web_jobapplications",
  label: "Job application",
  pluralLabel: "Job applications",
  description: "Job applications from blindsight.io/careers.",
  primary: { name: "web_name", label: "Title", max: 400 },
  columns: [
    { kind: "text", name: "web_role", label: "Role", max: 160 },
    { kind: "text", name: "web_fullname", label: "Name", max: 120 },
    { kind: "text", name: "web_email", label: "Email", max: 255, format: "Email" },
    { kind: "memo", name: "web_message", label: "Message", max: 2000 },
    { kind: "file", name: "web_cv", label: "CV", maxKb: 10240 },
    { kind: "text", name: "web_cvfilename", label: "CV file name", max: 160 },
    { kind: "bool", name: "web_consent", label: "Consent to be contacted" },
    { kind: "datetime", name: "web_consentat", label: "Consent given at" },
    { kind: "text", name: "web_jiraissuekey", label: "Jira issue", max: 40 },
  ],
};

export const TABLES = [DEMO_REQUESTS, JOB_APPLICATIONS];
