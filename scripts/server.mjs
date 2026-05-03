import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const preferredPort = Number(process.argv[3] || process.env.PORT || 5173);
const host = '127.0.0.1';

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml']
]);

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || host}`);
    const filePath = await resolveRequestPath(requestUrl.pathname);
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'content-type': mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    const status = error?.code === 'FORBIDDEN' ? 403 : 404;
    response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(status === 403 ? 'Forbidden' : 'Not found');
  }
});

listen(preferredPort);

async function resolveRequestPath(pathname) {
  let cleanPath = decodeURIComponent(pathname);
  if (cleanPath === '/') cleanPath = '/index.html';

  let filePath = path.resolve(root, `.${cleanPath}`);
  if (!isInsideRoot(filePath)) {
    const error = new Error('Forbidden');
    error.code = 'FORBIDDEN';
    throw error;
  }

  const fileStat = await stat(filePath).catch(() => null);
  if (fileStat?.isDirectory()) filePath = path.join(filePath, 'index.html');
  return filePath;
}

function isInsideRoot(filePath) {
  return filePath === root || filePath.startsWith(root + path.sep);
}

function listen(port) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      listen(port + 1);
      return;
    }
    throw error;
  });

  server.listen(port, host, () => {
    const address = server.address();
    console.log(`Serving ${root}`);
    console.log(`Local: http://${host}:${address.port}/`);
  });
}
