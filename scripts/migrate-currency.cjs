/**
 * Adds multi-currency support to an existing Supabase DB.
 * Safe to run multiple times (uses IF NOT EXISTS / idempotent).
 *
 * New columns:
 *   currency   text  'USD' | 'ARS'   default 'USD'
 *   amount_usd numeric               for USD txns  = amount
 *                                    for ARS txns  = user-entered USD equiv (nullable)
 */

const { Client } = require('pg');

const POOL_URL = 'postgresql://postgres.rdejlznoompmtwlfkgjo:Polibyus!12@aws-1-us-east-2.pooler.supabase.com:5432/postgres';

const STEPS = [
  // Add currency column (defaults to USD → all existing transactions become USD)
  `ALTER TABLE public.transactions
     ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD'
     CHECK (currency IN ('USD', 'ARS'))`,

  // Add amount_usd column (nullable — ARS without conversion = NULL)
  `ALTER TABLE public.transactions
     ADD COLUMN IF NOT EXISTS amount_usd numeric(12,2) NULL`,

  // Back-fill existing rows: they're all USD, so amount_usd = amount
  `UPDATE public.transactions
   SET amount_usd = amount
   WHERE amount_usd IS NULL AND currency = 'USD'`,
];

async function run() {
  const client = new Client({ connectionString: POOL_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('\n🔌 Conectado\n');

  for (const stmt of STEPS) {
    const label = stmt.trim().replace(/\s+/g, ' ').slice(0, 70);
    try {
      const r = await client.query(stmt);
      const rows = r.rowCount ?? '–';
      console.log(`✅  ${label}…  (${rows} rows)`);
    } catch (e) {
      console.error(`❌  ${label}\n    → ${e.message}`);
      await client.end();
      process.exit(1);
    }
  }

  // Verify
  const cols = await client.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions'
      AND column_name IN ('currency', 'amount_usd')
    ORDER BY column_name
  `);
  console.log('\n📋 Columnas nuevas:');
  cols.rows.forEach((r) =>
    console.log(`   ${r.column_name}  ${r.data_type}  default=${r.column_default}  nullable=${r.is_nullable}`)
  );

  await client.end();
  console.log('\n✅ Migración de moneda completa.\n');
}

run().catch((e) => { console.error(e.message); process.exit(1); });
