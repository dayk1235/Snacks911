#!/usr/bin/env node
/**
 * AI CLI — Tactical commands for Snacks 911 development.
 *
 * Usage:
 *   node ai/cli.js <command>
 *   npm run ai:<command>
 *
 * Each command loads the corresponding .md file from ai/commands/
 * and prints the execution plan.
 */

const { readFileSync, existsSync } = require('fs');
const { join, basename } = require('path');

const COMMANDS_DIR = join(__dirname, 'commands');

const command = process.argv[2];

if (!command) {
  console.error('Usage: node ai/cli.js <command>\n');
  console.error('Available commands:');
  const { readdirSync } = require('fs');
  const cmds = readdirSync(COMMANDS_DIR).map(f => basename(f, '.md'));
  cmds.forEach(c => console.error(`  ${c}`));
  process.exit(1);
}

const file = join(COMMANDS_DIR, `${command}.md`);

if (!existsSync(file)) {
  console.error(`Command not found: ${command}`);
  console.error(`Check ai/commands/ for available commands.`);
  process.exit(1);
}

const content = readFileSync(file, 'utf-8');
console.log(content);
