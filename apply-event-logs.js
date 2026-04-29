const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL or SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/sql`);
    
    // The RPC name might be 'exec_sql' or 'sql' depending on the database setup
    const postData = JSON.stringify({ query: sql });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          resolve({ success: false, status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  const filepath = path.join(__dirname, 'supabase', 'migrations', '20260429_event_logs.sql');
  const sql = fs.readFileSync(filepath, 'utf-8');
  
  console.log(`🚀 Applying migration: 20260429_event_logs.sql`);
  
  // Split by semicolon and run statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    const result = await executeSQL(statement + ';');
    if (result.success) {
      console.log(`✅ Statement executed successfully`);
    } else {
      console.error(`❌ Statement failed (Status ${result.status}): ${result.data}`);
    }
  }
}

run().catch(console.error);
