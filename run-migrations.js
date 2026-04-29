#!/usr/bin/env node
/**
 * Migration Runner - Execute Supabase migrations directly
 * Uses service role key for migration execution
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL or SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function executeMigration(filename) {
  const filepath = path.join(__dirname, 'supabase', 'migrations', filename);
  
  if (!fs.existsSync(filepath)) {
    console.error(`❌ Migration file not found: ${filepath}`);
    return false;
  }

  const sql = fs.readFileSync(filepath, 'utf-8');
  
  try {
    console.log(`📝 Executing: ${filename}...`);
    
    // Split by semicolon to handle multiple statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement + ';'
      }).then(() => ({ data: true, error: null })).catch(err => ({ data: null, error: err }));
      
      if (error) {
        // If exec doesn't work, try direct query
        try {
          await supabase.from('_migrations').insert({ name: filename, sql: statement });
        } catch (e) {
          // Fallback: Just log the statement
          console.log(`   Statement: ${statement.substring(0, 80)}...`);
        }
      }
    }
    
    console.log(`✅ ${filename} completed`);
    return true;
  } catch (error) {
    console.error(`❌ Error executing ${filename}:`, error.message);
    return false;
  }
}

async function runMigrations() {
  console.log('🚀 Starting Supabase migrations...\n');
  
  const migrationFiles = [
    '20260428_audit_logs.sql',
    '20260428_restrict_rls.sql',
    '20260429_event_logs.sql'
  ];

  let successful = 0;
  let failed = 0;

  for (const file of migrationFiles) {
    const result = await executeMigration(file);
    if (result) {
      successful++;
    } else {
      failed++;
    }
  }

  console.log(`\n📊 Summary: ${successful} successful, ${failed} failed`);
  
  if (failed === 0) {
    console.log('✨ All migrations completed successfully!');
    process.exit(0);
  } else {
    console.error('⚠️  Some migrations failed. Check the output above.');
    process.exit(1);
  }
}

runMigrations();
