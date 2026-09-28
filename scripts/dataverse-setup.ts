// Creates the Dataverse tables and columns the site's forms write to (src/lib/dataverse-schema.ts).
// Idempotent: existing tables and columns are left untouched, so it is safe to re-run after
// adding a column to the schema.
//
//   bun scripts/dataverse-setup.ts
//
// Reads DATAVERSE_* from the environment (bun loads .env.local). The app user needs the
// System Customizer role for this run; the site itself only needs create rights (see
// docs/forms-dataverse-jira.md). Optional: DATAVERSE_SOLUTION=<unique name> adds everything to
// that unmanaged solution (its publisher prefix must be "web").

import { dataverseFetch } from "../src/lib/dataverse.server";
import { TABLES, type ColumnDef, type TableDef } from "../src/lib/dataverse-schema";

const solution = process.env.DATAVERSE_SOLUTION;

const label = (text: string) => ({
  "@odata.type": "Microsoft.Dynamics.CRM.Label",
  LocalizedLabels: [
    { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: text, LanguageCode: 1033 },
  ],
});
const optional = {
  Value: "None",
  CanBeChanged: true,
  ManagedPropertyLogicalName: "canmodifyrequirementlevelsettings",
};

function columnMetadata(c: ColumnDef): Record<string, unknown> {
  const base = {
    SchemaName: c.name,
    DisplayName: label(c.label),
    Description: label(c.label),
    RequiredLevel: optional,
  };
  switch (c.kind) {
    case "text":
      return {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        ...base,
        MaxLength: c.max,
        FormatName: { Value: c.format ?? "Text" },
      };
    case "memo":
      return {
        "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
        ...base,
        MaxLength: c.max,
        Format: "TextArea",
      };
    case "bool":
      return {
        "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
        ...base,
        DefaultValue: false,
        OptionSet: {
          TrueOption: { Value: 1, Label: label("Yes") },
          FalseOption: { Value: 0, Label: label("No") },
        },
      };
    case "datetime":
      return {
        "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
        ...base,
        Format: "DateAndTime",
        DateTimeBehavior: { Value: "UserLocal" },
      };
    case "file":
      return {
        "@odata.type": "Microsoft.Dynamics.CRM.FileAttributeMetadata",
        ...base,
        MaxSizeInKB: c.maxKb,
      };
  }
}

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  ...(solution ? { "MSCRM.SolutionUniqueName": solution } : {}),
};

async function exists(path: string): Promise<boolean> {
  try {
    await dataverseFetch(`${path}?$select=LogicalName`);
    return true;
  } catch (err) {
    if (String(err).includes("→ 404")) return false;
    throw err;
  }
}

async function ensureTable(t: TableDef) {
  const path = `/EntityDefinitions(LogicalName='${t.logicalName}')`;
  if (await exists(path)) {
    console.log(`✓ table ${t.logicalName} exists`);
  } else {
    await dataverseFetch("/EntityDefinitions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
        SchemaName: t.logicalName,
        DisplayName: label(t.label),
        DisplayCollectionName: label(t.pluralLabel),
        Description: label(t.description),
        OwnershipType: "UserOwned",
        IsActivity: false,
        HasActivities: false,
        HasNotes: false,
        Attributes: [
          {
            "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
            SchemaName: t.primary.name,
            IsPrimaryName: true,
            DisplayName: label(t.primary.label),
            RequiredLevel: optional,
            MaxLength: t.primary.max,
            FormatName: { Value: "Text" },
          },
        ],
      }),
    });
    console.log(`+ table ${t.logicalName} created`);
  }

  for (const c of t.columns) {
    if (await exists(`${path}/Attributes(LogicalName='${c.name}')`)) {
      console.log(`  ✓ ${c.name}`);
      continue;
    }
    await dataverseFetch(`${path}/Attributes`, {
      method: "POST",
      headers,
      body: JSON.stringify(columnMetadata(c)),
    });
    console.log(`  + ${c.name} (${c.kind})`);
  }
}

for (const t of TABLES) await ensureTable(t);

const entities = TABLES.map((t) => `<entity>${t.logicalName}</entity>`).join("");
await dataverseFetch("/PublishXml", {
  method: "POST",
  headers,
  body: JSON.stringify({
    ParameterXml: `<importexportxml><entities>${entities}</entities></importexportxml>`,
  }),
});
console.log("Published. Entity sets:", TABLES.map((t) => t.entitySet).join(", "));
