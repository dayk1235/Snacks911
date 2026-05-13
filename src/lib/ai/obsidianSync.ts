import path from 'path';

/**
 * Reads all .md files in the /knowledge directory and compiles them
 * into a single string to be used as context for the AI Agent.
 */
export async function getKnowledgeContext(): Promise<string> {
  // Prevent build errors in client components
  if (typeof window !== 'undefined') return '';

  try {
    // Dynamic import of fs to avoid client-side bundling issues
    const fs = await import('fs');
    const knowledgeDir = path.join(process.cwd(), 'knowledge');
    let fullContext = '\n### CONOCIMIENTO EXTRAÍDO DE OBSIDIAN:\n';

    const walk = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walk(filePath);
        } else if (file.endsWith('.md')) {
          const content = fs.readFileSync(filePath, 'utf-8');
          fullContext += `\n--- DOCUMENTO: ${file} ---\n${content}\n`;
        }
      }
    };

    if (fs.existsSync(knowledgeDir)) {
      walk(knowledgeDir);
    }
    
    return fullContext;
  } catch (err) {
    console.error('[ObsidianSync] Error reading knowledge:', err);
    return '';
  }
}
