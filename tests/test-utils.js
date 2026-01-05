const http = require('http');

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
  'base64'
);
const tinyJpg = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQEA8PEA8QEA8QDw8QEA8QEA8PFREWFhURFRUYHSggGBolHRUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDQ0NDg0NDisZFRkrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//AABEIAAEAAQMBIgACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAAAAwIE/8QAFhABAQEAAAAAAAAAAAAAAAAAAAER/8QAFQEBAQAAAAAAAAAAAAAAAAAAAQL/xAAVEQEBAAAAAAAAAAAAAAAAAAABAP/aAAwDAQACEQMRAD8AxrGkJf/Z',
  'base64'
);
const tinyGif = Buffer.from('R0lGODlhAQABAAAAACw=', 'base64');
const tinyPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n', 'utf8');
const tinyMp3 = Buffer.from('ID3', 'utf8');
const tinyMp4 = Buffer.from('....ftypmp42', 'utf8');
const tinyVtt = Buffer.from('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nTest subtitle\n', 'utf8');
const tinyM3u8 = Buffer.from('#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:5.0,\nsegment1.ts\n', 'utf8');

const buildPages = (baseUrl) => {
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:image" content="${baseUrl}/media/hero.jpg">
  <meta name="twitter:image" content="${baseUrl}/media/twitter.png">
  <title>LPS Test Page</title>
  <style>
    .hero { padding: 24px; }
    .background { width: 80px; height: 80px; background-image: url('${baseUrl}/media/background.jpg'); }
    pre code { color: #111; }
  </style>
</head>
<body>
  <header class="hero">
    <img src="${baseUrl}/media/hero.jpg" alt="Hero image">
  </header>
  <main>
    <h1>Extractor Test Content</h1>
    <p>This is a structured paragraph with enough words to exercise readability calculations and text scoring logic.</p>
    <a href="${baseUrl}/page2">Next Page</a>
    <a rel="next" href="${baseUrl}/page2">Pagination</a>
    <a href="${baseUrl}/docs/sample.pdf">Sample PDF</a>
    <a href="${baseUrl}/docs/sample.docx">Sample DOCX</a>
    <pre><code class="language-js">const answer = 42;</code></pre>
    <audio controls src="${baseUrl}/media/audio.mp3"></audio>
    <video controls poster="${baseUrl}/media/poster.jpg">
      <source src="${baseUrl}/media/video.mp4" type="video/mp4">
      <source src="${baseUrl}/media/stream.m3u8" type="application/x-mpegURL">
      <track src="${baseUrl}/media/subtitles.vtt" kind="subtitles" srclang="en" label="English">
    </video>
    <img src="${baseUrl}/media/thumb.png" class="thumbnail" alt="Thumbnail">
    <div class="background" aria-label="Background"></div>
    <figure>
      <img src="${baseUrl}/media/gallery.jpg" alt="Gallery image">
      <figcaption>Gallery image</figcaption>
    </figure>
    <picture>
      <source srcset="${baseUrl}/media/hero.webp 1x, ${baseUrl}/media/hero@2x.webp 2x" type="image/webp">
      <img src="${baseUrl}/media/hero.jpg" alt="Responsive hero">
    </picture>
    <iframe src="${baseUrl}/docs/embed.pdf" width="600" height="400"></iframe>
    <object data="${baseUrl}/docs/object.pdf" type="application/pdf"></object>
    <div data-pdf="${baseUrl}/docs/data.pdf"></div>
  </main>
</body>
</html>`;

  const page2Html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LPS Test Page 2</title>
</head>
<body>
  <main>
    <h2>Page Two Content</h2>
    <p>Additional text content for crawler and text extractor validation.</p>
    <a href="${baseUrl}/page3">Third Page</a>
    <img src="${baseUrl}/media/extra.jpg" alt="Extra image">
  </main>
</body>
</html>`;

  return { indexHtml, page2Html };
};

const createTestServer = () => new Promise((resolve, reject) => {
  let baseUrl = '';
  const server = http.createServer((req, res) => {
    if (!baseUrl) {
      res.writeHead(503);
      res.end('Server warming up');
      return;
    }

    const { indexHtml, page2Html } = buildPages(baseUrl);
    const requestUrl = new URL(req.url, baseUrl);
    const pathname = requestUrl.pathname;

    const routes = new Map([
      ['/', { type: 'text/html; charset=utf-8', body: indexHtml }],
      ['/page2', { type: 'text/html; charset=utf-8', body: page2Html }],
      ['/robots.txt', { type: 'text/plain; charset=utf-8', body: 'User-agent: *\nAllow: /\n' }],
      ['/media/hero.jpg', { type: 'image/jpeg', body: tinyJpg }],
      ['/media/gallery.jpg', { type: 'image/jpeg', body: tinyJpg }],
      ['/media/extra.jpg', { type: 'image/jpeg', body: tinyJpg }],
      ['/media/thumb.png', { type: 'image/png', body: tinyPng }],
      ['/media/twitter.png', { type: 'image/png', body: tinyPng }],
      ['/media/background.jpg', { type: 'image/jpeg', body: tinyJpg }],
      ['/media/poster.jpg', { type: 'image/jpeg', body: tinyJpg }],
      ['/media/hero.webp', { type: 'image/webp', body: tinyPng }],
      ['/media/hero@2x.webp', { type: 'image/webp', body: tinyPng }],
      ['/media/icon.ico', { type: 'image/x-icon', body: tinyGif }],
      ['/media/audio.mp3', { type: 'audio/mpeg', body: tinyMp3 }],
      ['/media/video.mp4', { type: 'video/mp4', body: tinyMp4 }],
      ['/media/stream.m3u8', { type: 'application/x-mpegURL', body: tinyM3u8 }],
      ['/media/subtitles.vtt', { type: 'text/vtt; charset=utf-8', body: tinyVtt }],
      ['/docs/sample.pdf', { type: 'application/pdf', body: tinyPdf }],
      ['/docs/embed.pdf', { type: 'application/pdf', body: tinyPdf }],
      ['/docs/object.pdf', { type: 'application/pdf', body: tinyPdf }],
      ['/docs/data.pdf', { type: 'application/pdf', body: tinyPdf }],
      ['/docs/sample.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: Buffer.from('DOCX', 'utf8') }]
    ]);

    const route = routes.get(pathname);
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': route.type,
      'Content-Length': Buffer.byteLength(route.body)
    });
    res.end(route.body);
  });

  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
    resolve({ server, baseUrl });
  });
});

const closeServer = (server) => new Promise((resolve, reject) => {
  if (!server) {
    resolve();
    return;
  }
  server.close((err) => {
    if (err) {
      reject(err);
      return;
    }
    resolve();
  });
});

module.exports = {
  createTestServer,
  closeServer
};
