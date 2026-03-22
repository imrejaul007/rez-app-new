const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIST = path.join(__dirname, 'dist');
const PORT = 8081;
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.webp': 'image/webp', '.mp4': 'video/mp4',
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  
  // Try exact file, then .html, then index.html fallback
  let filePath = path.join(DIST, urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const htmlPath = path.join(DIST, urlPath + '.html');
    if (fs.existsSync(htmlPath)) filePath = htmlPath;
    else if (fs.existsSync(path.join(filePath, 'index.html'))) filePath = path.join(filePath, 'index.html');
    else filePath = path.join(DIST, 'index.html');
  }
  
  if (!fs.existsSync(filePath)) {
    res.writeHead(404); res.end('Not found'); return;
  }
  
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  const raw = fs.readFileSync(filePath);
  
  // Cache static assets
  if (ext !== '.html') {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
  
  // Gzip compress text-based files > 1KB
  const acceptGzip = (req.headers['accept-encoding'] || '').includes('gzip');
  if (acceptGzip && ['.js', '.css', '.html', '.json', '.svg'].includes(ext) && raw.length > 1024) {
    res.writeHead(200, { 'Content-Type': mime, 'Content-Encoding': 'gzip', 'Vary': 'Accept-Encoding' });
    zlib.gzip(raw, { level: 6 }, (err, compressed) => {
      if (err) { res.end(raw); } else { res.end(compressed); }
    });
  } else {
    res.writeHead(200, { 'Content-Type': mime });
    res.end(raw);
  }
}).listen(PORT, () => console.log(`Rez App: http://localhost:${PORT} (gzip enabled)`));
