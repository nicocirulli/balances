const { Client } = require('pg');

const POOL_URL = 'postgresql://postgres.rdejlznoompmtwlfkgjo:Polibyus!12@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
const NEW_PASS = '527527CLAU';
const EMAILS   = ['nico@padel-balances.local', 'clau@padel-balances.local'];

async function run() {
  const client = new Client({ connectionString: POOL_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  for (const email of EMAILS) {
    const r = await client.query(
      `UPDATE auth.users
         SET encrypted_password = crypt($1, gen_salt('bf')),
             updated_at = NOW()
       WHERE email = $2
       RETURNING email`,
      [NEW_PASS, email]
    );
    console.log(r.rows.length ? `✅ ${r.rows[0].email}` : `❌ no encontrado: ${email}`);
  }

  await client.end();
  console.log(`\nContraseña actualizada a: ${NEW_PASS}\n`);
}

run().catch((e) => { console.error(e.message); process.exit(1); });
