#!/bin/sh
set -eu

node <<'NODE'
const { Client } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const adminUrl = url.replace(/\/[^/?]+(\?|$)/, "/pyrouwebdb$1");
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    const existing = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = 'giroam'"
    );
    if (!existing.rowCount) {
      await admin.query("CREATE DATABASE giroam");
      console.log("Database giroam created");
    } else {
      console.log("Database giroam already exists");
    }
  } finally {
    await admin.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
NODE

npm run db:migrate
npx tsx src/scripts/seed.ts
exec npm run start
