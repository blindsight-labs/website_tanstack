// Minimal Microsoft Dataverse Web API client (server-to-server, client credentials).
// Server-only — never import from client code.
//
// Env (Netlify → Site settings → Environment variables):
//   DATAVERSE_URL           — environment URL, e.g. https://blindsight.crm17.dynamics.com
//   DATAVERSE_TENANT_ID     — Entra ID tenant (directory) ID
//   DATAVERSE_CLIENT_ID     — app registration's application (client) ID
//   DATAVERSE_CLIENT_SECRET — app registration's client secret
// The app registration must be added to the environment as an application user with a
// security role that can create rows in the web_* tables (see docs/forms-dataverse-jira.md).

const API = "/api/data/v9.2";

type Config = { url: string; tenant: string; clientId: string; secret: string };

/** Admin scripts only (scripts/dataverse-setup.ts): a ready bearer token for DATAVERSE_URL,
 *  e.g. from `az account get-access-token --resource <url>`, used instead of the app's
 *  client credentials. The site never sets it. */
const scriptToken = () => (process.env.NETLIFY ? undefined : process.env.DATAVERSE_ACCESS_TOKEN);

function config(): Config | null {
  const url = process.env.DATAVERSE_URL?.replace(/\/+$/, "");
  if (url && scriptToken()) return { url, tenant: "", clientId: "", secret: "" };
  const tenant = process.env.DATAVERSE_TENANT_ID;
  const clientId = process.env.DATAVERSE_CLIENT_ID;
  const secret = process.env.DATAVERSE_CLIENT_SECRET;
  if (!url || !tenant || !clientId || !secret) return null;
  return { url, tenant, clientId, secret };
}

export function dataverseConfigured(): boolean {
  return config() !== null;
}

let token: { value: string; expires: number } | undefined;

async function accessToken(c: Config): Promise<string> {
  const given = scriptToken();
  if (given) return given;
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const res = await fetch(`https://login.microsoftonline.com/${c.tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: c.clientId,
      client_secret: c.secret,
      scope: `${c.url}/.default`,
    }),
  });
  const body = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(`Dataverse token request failed: ${body.error_description ?? res.status}`);
  }
  token = { value: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return token.value;
}

/** Calls the Web API (path relative to /api/data/v9.2). Throws on a non-2xx response. */
export async function dataverseFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const c = config();
  if (!c) throw new Error("Dataverse is not configured");
  const res = await fetch(`${c.url}${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken(c)}`,
      Accept: "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      ...init.headers,
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Dataverse ${init.method ?? "GET"} ${path} → ${res.status} ${detail.slice(0, 500)}`,
    );
  }
  return res;
}

/** Creates a row and returns its ID. */
export async function createRow(entitySet: string, data: Record<string, unknown>): Promise<string> {
  const res = await dataverseFetch(`/${entitySet}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", Prefer: "return=minimal" },
    body: JSON.stringify(data),
  });
  const id = res.headers.get("OData-EntityId")?.match(/\(([0-9a-f-]{36})\)/i)?.[1];
  if (!id) throw new Error("Dataverse create returned no row ID");
  return id;
}

/** Uploads a file into a row's file column (single request; fine up to 128MB). */
export async function uploadFile(
  entitySet: string,
  id: string,
  column: string,
  file: { filename: string; content: Buffer },
): Promise<void> {
  await dataverseFetch(`/${entitySet}(${id})/${column}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/octet-stream",
      "x-ms-file-name": encodeURIComponent(file.filename),
    },
    body: new Uint8Array(file.content),
  });
}
