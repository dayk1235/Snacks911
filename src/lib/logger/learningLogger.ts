import fs from 'fs';
import path from 'path';

export interface FailureEntry {
  input: string;
  detectedIntent: string;
  failureType: string;
  output: string;
  timestamp: string;
}

const FAILURES_FILE = path.join(process.cwd(), 'src/data/learning/failures.json');

/**
 * Saves a failure entry to failures.json for later training/learning.
 * Avoids duplicates based on input and failureType.
 */
export async function saveFailure(
  input: string,
  detectedIntent: string,
  failureType: string,
  output: string
): Promise<void> {
  try {
    // Ensure directory exists
    const dir = path.dirname(FAILURES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let failures: FailureEntry[] = [];
    if (fs.existsSync(FAILURES_FILE)) {
      const content = fs.readFileSync(FAILURES_FILE, 'utf8');
      try {
        failures = JSON.parse(content);
      } catch (e) {
        failures = [];
      }
    }

    // Avoid duplicates
    const exists = failures.some(f => f.input === input && f.failureType === failureType);
    if (exists) return;

    const entry: FailureEntry = {
      input,
      detectedIntent,
      failureType,
      output,
      timestamp: new Date().toISOString()
    };

    failures.push(entry);
    fs.writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2), 'utf8');
  } catch (error) {
    console.error('[learningLogger] Failed to save failure:', error);
  }
}
