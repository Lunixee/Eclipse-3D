import {createReadStream, existsSync, statSync} from 'node:fs';
import {extname, join, normalize, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';

const root = resolve('.');
const buildResult = spawnSync(process.execPath, ['scripts/build.mjs'], {stdio: 'inherit'});
if (buildResult.status !== 0) process.exit(buildResult.status ?? 1);

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.webp': 'image/webp',
    '.sb3': 'application/x.scratch.sb3'
};

const server = createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const relativePath = requestPath === '/' ? 'docs/index.html' : requestPath.slice(1);
    const path = normalize(join(root, relativePath));
    if (!path.startsWith(root) || !existsSync(path) || !statSync(path).isFile()) {
        response.writeHead(404, {'content-type': 'text/plain; charset=utf-8'});
        response.end('Not found');
        return;
    }
    response.writeHead(200, {
        'content-type': contentTypes[extname(path)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
        'access-control-allow-origin': '*'
    });
    createReadStream(path).pipe(response);
});

server.listen(8000, '127.0.0.1', () => {
    console.log('Eclipse 3D development server: http://localhost:8000/');
});
