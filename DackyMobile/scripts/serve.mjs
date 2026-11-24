import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.json':'application/json' };
const server = createServer(async (request,response)=>{
  let decoded;
  try { decoded=decodeURIComponent(new URL(request.url,'http://localhost').pathname); } catch { response.writeHead(400).end('Bad request'); return; }
  if (decoded==='/'||decoded.endsWith('/')) decoded += 'index.html';
  const file = path.resolve(root,'.'+decoded);
  if (!file.startsWith(root+path.sep)) { response.writeHead(403).end('Forbidden'); return; }
  try {
    const body=await readFile(file);
    response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}).end(body);
  } catch { response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Not found; run npm run build first.'); }
});
server.listen(4173,'127.0.0.1',()=>console.log('Dacky Mobile review server: http://127.0.0.1:4173'));
