import http from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const temp = path.join(project, 'Temp');
await mkdir(temp, { recursive: true });
for (const key of ['TEMP', 'TMP', 'TMPDIR']) process.env[key] = temp;
const root = path.join(project, 'public');
const port = Number(process.env.PORT || 8000);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let filename;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    filename = path.resolve(root, '.' + pathname);
    if (filename !== root && !filename.startsWith(root + path.sep)) throw new Error('Outside public');
    if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html');
    if (!(await stat(filename)).isFile()) throw new Error('Not a file');
    response.statusCode = 200;
  } catch {
    filename = path.join(root, '404.html');
    response.statusCode = 404;
  }
  response.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method === 'HEAD') { response.end(); return; }
  const stream = createReadStream(filename);
  stream.on('error', () => { response.destroy(); });
  stream.pipe(response);
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}\nServing public/ directly. Press Ctrl+C to stop.`));
