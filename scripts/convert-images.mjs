import { createRequire } from 'module';
import { readdirSync, statSync } from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const sharp = require('./node_modules/next/node_modules/sharp/lib/index.js');

const dir = path.join(process.cwd(), 'public/images');
const files = readdirSync(dir).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

for (const file of files) {
  const src = path.join(dir, file);
  const ext = path.extname(file);
  const base = path.basename(file, ext);
  const dest = path.join(dir, `${base}.webp`);

  const stat = statSync(src);
  console.log(`Processing ${file} (${(stat.size / 1024).toFixed(0)}KB)...`);

  await sharp(src)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(dest + '.tmp');

  // Replace original
  const { rename } = await import('fs/promises');
  await rename(dest + '.tmp', dest);

  // If original was .png or .jpg (not already .webp), keep old file too
  if (ext.toLowerCase() !== '.webp') {
    console.log(`  → kept original ${file}`);
  }

  const newStat = statSync(dest);
  console.log(`  → ${base}.webp (${(newStat.size / 1024).toFixed(0)}KB)`);
}

console.log('\nDone!');
