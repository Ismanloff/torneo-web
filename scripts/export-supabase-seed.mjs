import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();

if (!supabaseUrl || !supabaseSecretKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const tableSpecs = [
  { name: "schools", orderBy: "created_at" },
  { name: "tournaments", orderBy: "created_at" },
  { name: "categories", orderBy: "created_at" },
  { name: "category_scoring_rules", orderBy: "category_id" },
  { name: "category_operational_settings", orderBy: "category_id" },
  { name: "teams", orderBy: "created_at" },
  { name: "staff_profiles", orderBy: "created_at" },
  { name: "match_qr_tokens", orderBy: "created_at" },
  { name: "staff_login_attempts", orderBy: "created_at" },
  { name: "staff_assignments", orderBy: "created_at" },
  { name: "category_schedule_runs", orderBy: "created_at" },
  { name: "category_matches", orderBy: "created_at" },
  { name: "category_brackets", orderBy: "created_at" },
  { name: "bracket_rounds", orderBy: "created_at" },
  { name: "bracket_matches", orderBy: "created_at" },
  { name: "team_checkins", orderBy: "created_at" },
  { name: "team_score_adjustments", orderBy: "created_at" },
  { name: "parental_confirmations", orderBy: "created_at" },
  { name: "push_subscriptions", orderBy: "created_at" },
  { name: "match_result_audit", orderBy: "created_at" },
  { name: "slots_config_history", orderBy: "created_at" },
];

function quoteString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function serializeArray(values) {
  return `ARRAY[${values.map((value) => serializeValue(value)).join(", ")}]`;
}

function serializeValue(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (Array.isArray(value)) {
    return serializeArray(value);
  }

  if (value instanceof Date) {
    return quoteString(value.toISOString());
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  if (typeof value === "object") {
    return `${quoteString(JSON.stringify(value))}::jsonb`;
  }

  return quoteString(value);
}

async function fetchTableRows(spec) {
  let query = supabase.from(spec.name).select("*");

  if (spec.orderBy) {
    query = query.order(spec.orderBy, { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`${spec.name}: ${error.message}`);
  }

  return data ?? [];
}

function buildInsertSql(tableName, rows) {
  if (!rows.length) {
    return "";
  }

  const columns = Object.keys(rows[0]);
  const values = rows
    .map((row) => `(${columns.map((column) => serializeValue(row[column])).join(", ")})`)
    .join(",\n  ");

  return `insert into public.${tableName} (${columns.join(", ")}) values\n  ${values}\non conflict do nothing;`;
}

async function main() {
  const rowsByTable = [];

  for (const spec of tableSpecs) {
    const rows = await fetchTableRows(spec);
    rowsByTable.push([spec.name, rows]);
  }

  const targetDir = path.resolve("supabase", "seeds");
  const targetFile = path.join(targetDir, "999_local_snapshot.sql");
  await mkdir(targetDir, { recursive: true });

  const orderedTableNames = rowsByTable.map(([tableName]) => `public.${tableName}`);
  const truncateSql = `truncate table ${orderedTableNames.join(", ")} restart identity cascade;`;
  const inserts = rowsByTable
    .map(([tableName, rows]) => buildInsertSql(tableName, rows))
    .filter(Boolean)
    .join("\n\n");

  const output = [
    "-- Generated from the currently configured Supabase project.",
    "-- Do not commit this file if it contains production-like data.",
    "begin;",
    truncateSql,
    inserts,
    "commit;",
    "",
  ].join("\n");

  await writeFile(targetFile, output, "utf8");

  console.log(`Local seed written to ${targetFile}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
