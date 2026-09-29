// Applies migrations/*.sql to the D1 database `cf dev` is using, through the dev server's Local
// Explorer API (cf's own `d1 migrations apply` only takes remote UUIDs). Applied files are recorded
// in a _local_migrations table, so each runs once. Usage: local-migrate.mjs <worker> [binding] (dev
// must be running on PORT).
import { readFileSync, readdirSync } from 'node:fs';

const [worker, binding = 'DB'] = process.argv.slice(2);
const base = `http://localhost:${process.env.PORT || 5173}/cdn-cgi/local/explorer/api/d1/database/${binding}-${worker}/raw`;

async function sql(query) {
  const response = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql: query }) })
    .catch(() => { console.error(`No dev server on port ${process.env.PORT || 5173}: run mise run dev first.`); process.exit(1); });
  const json = await response.json();
  if (!json.success) { console.error(JSON.stringify(json.errors)); process.exit(1); }
  return json.result;
}

const rows = result => { const { columns, rows } = result.at(-1).results; return rows.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]]))); };
await sql('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)');
const applied = new Set(rows(await sql('SELECT name FROM _local_migrations')).map(row => row.name));
const pending = readdirSync('migrations').filter(name => name.endsWith('.sql')).sort().filter(name => !applied.has(name));
for (const name of pending) {
  await sql(readFileSync(`migrations/${name}`, 'utf8'));
  await sql(`INSERT INTO _local_migrations (name) VALUES ('${name.replaceAll("'", "''")}')`);
  console.log(`applied ${name}`);
}
console.log(pending.length ? `${pending.length} migration(s) applied to local ${binding}-${worker}` : `local ${binding}-${worker} is up to date`);
