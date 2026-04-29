const fs = require('fs');

const getAllFiles = (dirPath, arrayOfFiles) => {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach((file) => {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx')) {
        arrayOfFiles.push(dirPath + "/" + file);
      }
    }
  });
  return arrayOfFiles;
};

const files = getAllFiles('src', []);
console.log(`Found ${files.length} tsx files.`);

let changedFiles = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // We only replace standard button patterns to avoid complex JSX breaks.
  // This simplistic approach might be flawed, so we will only replace highly specific buttons if we must.
  // Actually, replacing buttons across 90 instances safely in NodeJS is best done by a well-tested regex.
  
  // Replace <button> tags with standard primary/secondary buttons.
  // 1. Primary Button (contains gradient)
  content = content.replace(/<button([^>]*)style=\{([^}]*gradient[^}]*)\}([^>]*)>/g, '<Button variant="primary" $1$3>');
  
  // 2. Secondary Button (contains border but not gradient)
  // Actually, it's safer to just inject Button imports.
  if (content !== original) {
    if (!content.includes('import { Button }')) {
      content = `import { Button } from '@/components/ui/Button';\n` + content;
    }
    content = content.replace(/<\/button>/g, '</Button>');
    
    fs.writeFileSync(f, content);
    changedFiles++;
    console.log(`Updated ${f}`);
  }
});
console.log(`Changed ${changedFiles} files.`);
