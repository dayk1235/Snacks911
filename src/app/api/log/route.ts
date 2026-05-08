import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const logPath = path.join(process.cwd(), 'logs.txt');

    // Ensure the directory exists (though here it's process.cwd())
    fs.appendFileSync(logPath, JSON.stringify({
      ts: new Date().toISOString(),
      ...body
    }) + '\n', 'utf8');

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[API LOG] Error:', error);
    return Response.json({ ok: false, error: 'Failed to write log' }, { status: 500 });
  }
}
