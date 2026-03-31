import { neon } from "@neondatabase/serverless";
import { getDocumentDatabaseConfig } from "@/lib/server/documents/env";

declare global {
  // eslint-disable-next-line no-var
  var __ryandgDocumentSql:
    | ReturnType<typeof neon>
    | undefined;
}

export function getDocumentSql() {
  if (!globalThis.__ryandgDocumentSql) {
    globalThis.__ryandgDocumentSql = neon(getDocumentDatabaseConfig().databaseUrl);
  }

  return globalThis.__ryandgDocumentSql;
}
