const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');
const crypto = require('crypto');

class GUIServer {
    constructor() {
        this.port = process.env.PORT || 3001;
        this.host = process.env.HOST || 'localhost';
        this.isDev = process.env.NODE_ENV !== 'production';
        this.cache = new Map();

        this.mimeTypes = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'text/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };

        this.start();
    }

    async start() {
        this.server = http.createServer((req, res) => this.handle(req, res));

        this.server.listen(this.port, this.host, () => {
            console.log(`Server running at http://${this.host}:${this.port}`);
            console.log('READY TO USE!');
        });

        process.on('SIGTERM', () => process.exit(0));
    }

    async handle(req, res) {
        try {
            const parsed = url.parse(req.url, true);
            const pathname = parsed.pathname;

            if (pathname === '/') {
                await this.serveFile(res, 'index.html');
            } else if (pathname === '/api/health') {
                this.json(res, { status: 'healthy', uptime: process.uptime() });
            } else if (pathname === '/api/config') {
                this.json(res, { port: this.port, env: process.env.NODE_ENV });
            } else {
                if (pathname.includes('..')) throw new Error('Invalid path');
                await this.serveFile(res, pathname.substring(1));
            }
        } catch (error) {
            console.error(error);
            res.writeHead(500);
            res.end('Internal Server Error');
        }
    }

    async serveFile(res, filePath) {
        const fullPath = path.join(__dirname, filePath);
        const ext = path.extname(filePath).toLowerCase();

        try {
            let data;
            const stats = await fs.stat(fullPath);
            const mime = this.mimeTypes[ext] || 'application/octet-stream';

            if (!this.isDev && this.cache.has(fullPath)) {
                const cached = this.cache.get(fullPath);
                if (cached.mtime >= stats.mtimeMs) data = cached.data;
            }

            if (!data) {
                data = await fs.readFile(fullPath);
                if (!this.isDev) this.cache.set(fullPath, { data, mtime: stats.mtimeMs });
            }

            const etag = crypto.createHash('md5').update(data).digest('hex');
            if (res.req.headers['if-none-match'] === etag) {
                res.writeHead(304);
                return res.end();
            }

            res.writeHead(200, {
                'Content-Type': mime,
                'Content-Length': data.length,
                'ETag': etag,
                'Cache-Control': this.isDev ? 'no-cache' : 'public, max-age=300'
            });
            res.end(data);
        } catch (e) {
            if (e.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not Found');
            } else {
                throw e;
            }
        }
    }

    json(res, data) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }
}

if (require.main === module) {
    new GUIServer();
}

module.exports = GUIServer;