import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "..", "db", "migrations");

async function loadLocalEnvFile(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex <= 0) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();

      if (!key || process.env[key] !== undefined) {
        continue;
      }

      let value = trimmed.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

await loadLocalEnvFile(path.join(__dirname, "..", ".env.local"));
await loadLocalEnvFile(path.join(__dirname, "..", ".env"));

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before running db:migrate.");
}

const sql = neon(databaseUrl);
const entries = (await readdir(migrationsDir)).filter((entry) => entry.endsWith(".sql"));

function splitSqlStatements(sqlText) {
  const statements = [];
  let current = "";

  for (const line of sqlText.split("\n")) {
    current += `${line}\n`;

    if (line.trimEnd().endsWith(";")) {
      const statement = current.trim();

      if (statement) {
        statements.push(statement);
      }

      current = "";
    }
  }

  const trailing = current.trim();

  if (trailing) {
    statements.push(trailing);
  }

  return statements;
}

for (const fileName of entries.sort()) {
  const migrationPath = path.join(migrationsDir, fileName);
  const migrationSql = await readFile(migrationPath, "utf8");
  const statements = splitSqlStatements(migrationSql);

  console.log(`Applying ${fileName}`);

  for (const statement of statements) {
    await sql.query(statement);
  }
}

console.log("Migrations complete.");
