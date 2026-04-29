#!/usr/bin/env node
/**
 * Deploy Supabase Migrations
 * Two options:
 * 1. Via Supabase CLI (requires login)
 * 2. Manually execute SQL in Supabase dashboard
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🚀 Supabase Migration Deployment\n');
console.log('=' .repeat(50));

const migrationDir = path.join(__dirname, 'supabase', 'migrations');
const migrations = [
  '20260428_audit_logs.sql',
  '20260428_restrict_rls.sql'
];

console.log('\n📋 Migrations to deploy:\n');
migrations.forEach((m, i) => {
  console.log(`  ${i + 1}. ${m}`);
});

console.log('\n' + '='.repeat(50));
console.log('\n⚙️  Option 1: Via Supabase CLI (Recommended)\n');
console.log('Run the following command:');
console.log('  supabase link');
console.log('  supabase db push\n');

console.log('='.repeat(50));
console.log('\n⚙️  Option 2: Manual SQL Execution\n');
console.log('1. Go to: https://app.supabase.com/project/hhybfgqabjickxbuviyf/sql/new');
console.log('2. Copy & paste the SQL below:');
console.log('3. Click "Run" or Ctrl+Enter\n');

console.log('='.repeat(50));
console.log('\n📄 SQL Migration (1/2) - Audit Logs\n');

const auditSql = fs.readFileSync(path.join(migrationDir, '20260428_audit_logs.sql'), 'utf-8');
console.log(auditSql);

console.log('\n' + '='.repeat(50));
console.log('\n📄 SQL Migration (2/2) - Restrict RLS\n');

const rlsSql = fs.readFileSync(path.join(migrationDir, '20260428_restrict_rls.sql'), 'utf-8');
console.log(rlsSql);

console.log('\n' + '='.repeat(50));
console.log('\n✨ Migration deployment guide complete!');
console.log('\n');
