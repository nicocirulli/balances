/**
 * Migration + env setup script.
 *
 * Runs each DDL statement individually (pooler-safe) instead of
 * passing the raw SQL file (which breaks on multi-statement batches).
 */

const { Client } = require('pg');
const crypto     = require('crypto');
const fs         = require('fs');
const path       = require('path');

const PROJECT_REF  = 'rdejlznoompmtwlfkgjo';
const DB_PASS      = 'Polibyus!12';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

const POOL_URL   = `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASS)}@aws-1-us-east-2.pooler.supabase.com:5432/postgres`;
const DIRECT_URL = `postgresql://postgres:${encodeURIComponent(DB_PASS)}@db.${PROJECT_REF}.supabase.co:5432/postgres`;

// ── HS256 JWT ─────────────────────────────────────────────────────────────────
function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function makeJWT(payload, secret) {
  const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64url(JSON.stringify(payload));
  const s = b64url(crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest());
  return `${h}.${p}.${s}`;
}

// ── Explicit schema statements ────────────────────────────────────────────────
const STATEMENTS = [
  // ── Categories ──
  `CREATE TABLE IF NOT EXISTS public.categories (
    id    uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
    name  text  NOT NULL UNIQUE,
    color text  NOT NULL DEFAULT '#6b7280'
  )`,

  // Seed
  `INSERT INTO public.categories (name, color) VALUES
    ('TURNOS',          '#6366f1'),
    ('CLASES',          '#8b5cf6'),
    ('ALQUILERES',      '#0ea5e9'),
    ('BUFFET',          '#f59e0b'),
    ('INSUMOS',         '#f97316'),
    ('INFRAESTRUCTURA', '#ef4444'),
    ('OTROS',           '#94a3b8')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color`,

  `ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY`,

  `DROP POLICY IF EXISTS categories_read ON public.categories`,
  `CREATE POLICY categories_read ON public.categories FOR SELECT TO authenticated, anon USING (true)`,

  // ── Transactions ──
  `CREATE TABLE IF NOT EXISTS public.transactions (
    id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    date           date          NOT NULL,
    concept        text          NOT NULL,
    type           text          NOT NULL CHECK (type IN ('Ingreso', 'Egreso')),
    category_id    uuid          NOT NULL REFERENCES public.categories(id),
    amount         numeric(12,2) NOT NULL CHECK (amount > 0),
    payment_method text          NOT NULL DEFAULT 'Efectivo',
    registered_by  text          NOT NULL CHECK (registered_by IN ('NICO', 'CLAU')),
    user_id        uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
    notes          text          NOT NULL DEFAULT '',
    created_at     timestamptz   NOT NULL DEFAULT now()
  )`,

  `CREATE INDEX IF NOT EXISTS transactions_date_idx    ON public.transactions (date DESC)`,
  `CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions (user_id)`,

  `ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY`,

  `DROP POLICY IF EXISTS transactions_authenticated_all ON public.transactions`,
  `CREATE POLICY transactions_authenticated_all ON public.transactions
    FOR ALL TO authenticated USING (true) WITH CHECK (true)`,
];

// ── Connect ───────────────────────────────────────────────────────────────────
async function connect(url) {
  const c = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 12000,
  });
  await c.connect();
  return c;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  let client;
  for (const [label, url] of [['session pooler', POOL_URL], ['direct', DIRECT_URL]]) {
    try {
      console.log(`\n🔌 Connecting via ${label}…`);
      client = await connect(url);
      console.log(`   ✓ Connected via ${label}`);
      break;
    } catch (e) {
      console.log(`   ✗ ${label}: ${e.message}`);
    }
  }
  if (!client) throw new Error('Cannot reach Supabase Postgres.');

  // ── 1. Drop old tables ─────────────────────────────────────────────────────
  console.log('\n🗑  Dropping old tables…');
  await client.query(`DROP TABLE IF EXISTS public.transactions CASCADE`);
  await client.query(`DROP TABLE IF EXISTS public.categories   CASCADE`);
  console.log('   ✓ Done');

  // ── 2. Apply schema ────────────────────────────────────────────────────────
  console.log('\n📦 Applying schema…');
  for (const stmt of STATEMENTS) {
    const label = stmt.trim().slice(0, 60).replace(/\s+/g, ' ');
    try {
      await client.query(stmt);
      console.log(`   ✓ ${label}`);
    } catch (e) {
      console.error(`   ✗ ${label}\n     → ${e.message}`);
      throw e;
    }
  }

  // ── 3. Verify ──────────────────────────────────────────────────────────────
  const cats = await client.query('SELECT name FROM public.categories ORDER BY name');
  console.log('\n   ✅ Categories in DB:', cats.rows.map((r) => r.name).join(', '));

  const cols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='transactions'
    ORDER BY ordinal_position
  `);
  console.log('   ✅ transactions columns:', cols.rows.map((r) => r.column_name).join(', '));

  // ── 4. Get JWT secret ──────────────────────────────────────────────────────
  console.log('\n🔑 Looking for JWT secret…');
  let jwtSecret = null;
  for (const q of [
    `SELECT current_setting('app.settings.jwt_secret', true) AS s`,
    `SELECT current_setting('request.jwt.secret',       true) AS s`,
    `SELECT decrypted_secret AS s FROM vault.decrypted_secrets WHERE name ILIKE 'jwt%' LIMIT 1`,
  ]) {
    try {
      const r = await client.query(q);
      const v = r.rows[0]?.s;
      if (v && v.trim().length > 10) { jwtSecret = v.trim(); break; }
    } catch { /* continue */ }
  }
  await client.end();

  let anonKey = null;
  if (jwtSecret) {
    anonKey = makeJWT(
      { role: 'anon', iss: 'supabase', iat: 1609459200, exp: 1924905600 },
      jwtSecret
    );
    console.log('   ✓ Anon key generated from JWT secret');
  } else {
    console.log('   ⚠  Could not auto-retrieve JWT secret.');
    console.log(`      → Get your anon key from:`);
    console.log(`        https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api`);
  }

  // ── 5. Write .env.local ────────────────────────────────────────────────────
  const envPath = path.join(__dirname, '..', '.env.local');
  fs.writeFileSync(envPath, [
    `VITE_SUPABASE_URL=${SUPABASE_URL}`,
    anonKey
      ? `VITE_SUPABASE_ANON_KEY=${anonKey}`
      : `VITE_SUPABASE_ANON_KEY=PASTE_ANON_KEY_HERE`,
    '',
  ].join('\n'));

  console.log(`\n✅ .env.local written`);
  console.log(`   VITE_SUPABASE_URL      = ${SUPABASE_URL}`);
  if (anonKey) {
    console.log(`   VITE_SUPABASE_ANON_KEY = ${anonKey.slice(0, 50)}…`);
    console.log('\n🚀 All set! Run:  npm run dev\n');
  } else {
    console.log(`   VITE_SUPABASE_ANON_KEY = (manual step needed)\n`);
  }
}

main().catch((e) => { console.error('\n❌', e.message); process.exit(1); });
