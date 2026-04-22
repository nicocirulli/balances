/**
 * Creates NICO and CLAU in Supabase Auth directly via SQL.
 *
 * No real email required. We use internal placeholder emails
 * (nico@padel-balances.local / clau@padel-balances.local) that the
 * login UI never shows — users just pick their name and enter a password.
 *
 * Uses pgcrypto (enabled by default in Supabase) for password hashing.
 *
 * Run: node scripts/create-users.cjs
 *   or: npm run create-users
 */

const { Client } = require('pg');

const PROJECT_REF = 'rdejlznoompmtwlfkgjo';
const DB_PASS     = 'Polibyus!12';
const POOL_URL    = `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASS)}@aws-1-us-east-2.pooler.supabase.com:5432/postgres`;
const DIRECT_URL  = `postgresql://postgres:${encodeURIComponent(DB_PASS)}@db.${PROJECT_REF}.supabase.co:5432/postgres`;

// ── Users to create ───────────────────────────────────────────────────────────
// Emails are internal — they never appear in the UI.
// Users log in by clicking their name and entering their password.
const USERS = [
  { username: 'NICO', email: 'nico@padel-balances.local', password: 'Padel2025!' },
  { username: 'CLAU', email: 'clau@padel-balances.local', password: 'Padel2025!' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function connect(url) {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 12000 });
  await c.connect();
  return c;
}

async function upsertUser(client, { username, email, password }) {
  // Pre-build JSON strings in JS — avoids type inference issues with jsonb_build_object($n)
  const metaJson     = JSON.stringify({ username });
  const appMetaJson  = JSON.stringify({ provider: 'email', providers: ['email'] });

  // Check if already exists
  const existing = await client.query(
    'SELECT id FROM auth.users WHERE email = $1', [email]
  );

  if (existing.rows.length > 0) {
    const uid = existing.rows[0].id;
    await client.query(`
      UPDATE auth.users SET
        encrypted_password = crypt($1, gen_salt('bf')),
        raw_user_meta_data = $2::jsonb,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at         = NOW()
      WHERE id = $3
    `, [password, metaJson, uid]);

    await client.query(`
      INSERT INTO auth.identities
        (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
      VALUES
        (gen_random_uuid(), $1, $2::jsonb, 'email', NOW(), NOW(), NOW(), $3)
      ON CONFLICT (provider, provider_id) DO NOTHING
    `, [uid, JSON.stringify({ sub: uid, email }), email]);

    return { action: 'updated', id: uid };
  }

  // Create new user — try with token columns first, fall back without them
  let uid;
  const insertWithTokens = `
    INSERT INTO auth.users (
      instance_id, id, aud, role,
      email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid, gen_random_uuid(),
      'authenticated', 'authenticated',
      $1, crypt($2, gen_salt('bf')), NOW(),
      $3::jsonb, $4::jsonb,
      NOW(), NOW(),
      '', '', '', ''
    ) RETURNING id`;

  const insertMinimal = `
    INSERT INTO auth.users (
      instance_id, id, aud, role,
      email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid, gen_random_uuid(),
      'authenticated', 'authenticated',
      $1, crypt($2, gen_salt('bf')), NOW(),
      $3::jsonb, $4::jsonb,
      NOW(), NOW()
    ) RETURNING id`;

  try {
    const res = await client.query(insertWithTokens, [email, password, metaJson, appMetaJson]);
    uid = res.rows[0].id;
  } catch (e) {
    if (e.message.includes('does not exist') || e.message.includes('column')) {
      const res = await client.query(insertMinimal, [email, password, metaJson, appMetaJson]);
      uid = res.rows[0].id;
    } else {
      throw e;
    }
  }

  // Create email identity (required for signInWithPassword)
  await client.query(`
    INSERT INTO auth.identities
      (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
    VALUES
      (gen_random_uuid(), $1, $2::jsonb, 'email', NOW(), NOW(), NOW(), $3)
    ON CONFLICT (provider, provider_id) DO NOTHING
  `, [uid, JSON.stringify({ sub: uid, email }), email]);

  return { action: 'created', id: uid };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  let client;
  for (const [label, url] of [['session pooler', POOL_URL], ['direct', DIRECT_URL]]) {
    try {
      console.log(`\n🔌 Connecting via ${label}…`);
      client = await connect(url);
      console.log(`   ✓ Connected`);
      break;
    } catch (e) {
      console.log(`   ✗ ${e.message}`);
    }
  }
  if (!client) throw new Error('Cannot reach Supabase Postgres.');

  console.log('\n👤 Creating users…\n');

  for (const user of USERS) {
    try {
      const { action, id } = await upsertUser(client, user);
      const icon = action === 'created' ? '✅' : '♻️ ';
      console.log(`   ${icon} ${user.username}  ${action}  (${id})`);
      console.log(`      email   : ${user.email}  (internal — not shown in UI)`);
      console.log(`      password: ${user.password}`);
      console.log('');
    } catch (e) {
      console.error(`   ❌ ${user.username}: ${e.message}`);
      console.error(`      Full error:`, e);
    }
  }

  await client.end();

  console.log('─────────────────────────────────────────────────');
  console.log('🚀 Done. Users can now log in at the app with:');
  console.log('   Name    → NICO  or  CLAU');
  console.log('   Password → Padel2025!');
  console.log('   (Change passwords anytime from the Supabase dashboard)');
  console.log('─────────────────────────────────────────────────\n');
}

main().catch((e) => { console.error('\n❌', e.message); process.exit(1); });
