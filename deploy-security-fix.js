#!/usr/bin/env node

/**
 * Snacks 911 — Security Fix Deployer
 * Deploys critical RLS security patches to Supabase
 * 
 * Note: Supabase JS client cannot execute raw SQL, so this script
 * provides instructions for manual deployment.
 * 
 * Usage: node deploy-security-fix.js
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

// ── Validate environment ──────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Please create a .env.local file with these values.');
  process.exit(1);
}

// ── Extract project reference from URL ────────────────────────────────────────
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project reference from URL:', supabaseUrl);
  process.exit(1);
}

// ── Read migration file ───────────────────────────────────────────────────────
const migrationPath = path.join(__dirname, 'supabase/migrations/20260428_fix_rls_security.sql');
let migrationSql;

try {
  migrationSql = fs.readFileSync(migrationPath, 'utf8');
} catch (err) {
  console.error('❌ Could not read migration file:', migrationPath);
  console.error(err.message);
  process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('🔒 Snacks 911 — Critical RLS Security Patches');
console.log('═'.repeat(60));
console.log('');
console.log('📋 Database:', supabaseUrl);
console.log('📄 Migration: supabase/migrations/20260428_fix_rls_security.sql');
console.log('');
console.log('⚠️  The Supabase JS client cannot execute raw SQL directly.');
console.log('   Please follow these steps to deploy the security fix:');
console.log('');
console.log('─'.repeat(60));
console.log('');

// Option 1: Using Supabase CLI
console.log('🔹 OPTION 1: Using Supabase CLI (Recommended)');
console.log('');
console.log('   1. Install Supabase CLI if you haven\'t:');
console.log('      npm install -g supabase');
console.log('');
console.log('   2. Link your project:');
console.log('      supabase link --project-ref ' + projectRef);
console.log('');
console.log('   3. Run the migration:');
console.log('      supabase db push');
console.log('');

// Option 2: Manual via SQL Editor
console.log('🔹 OPTION 2: Manual via Supabase SQL Editor');
console.log('');
console.log('   1. Open the SQL Editor:');
const sqlEditorUrl = `https://app.supabase.com/project/${projectRef}/sql/new`;
console.log('      ' + sqlEditorUrl);
console.log('');
console.log('   2. Copy the SQL from the migration file:');
console.log('      ' + migrationPath);
console.log('');
console.log('   3. Paste into the SQL Editor and click "Run"');
console.log('');

// Display SQL Editor URL
console.log('─'.repeat(60));
console.log('');
console.log('🌐 SQL Editor URL:');
console.log('   ' + sqlEditorUrl);
console.log('');
console.log('   (Ctrl+Click to open in browser)');
console.log('');

// Display SQL content
console.log('─'.repeat(60));
console.log('');
console.log('📋 SQL Migration Content (copy and paste):');
console.log('═'.repeat(60));
console.log('');
console.log(migrationSql);
console.log('');
console.log('═'.repeat(60));
console.log('');
console.log('✅ After running the migration:');
console.log('');
console.log('   1. Verify no errors occurred');
console.log('   2. Check audit_logs table for security_patch_001 entry');
console.log('   3. Test that staff can access admin features');
console.log('   4. Test that WhatsApp bot still works');
console.log('');
console.log('📖 For detailed instructions, see: SECURITY_FIX_GUIDE.md');
console.log('');
