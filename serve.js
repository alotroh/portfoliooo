/* ═══════════════════════════════════════════════════════════
   Локальный сервер этого сайта.

   Лежит внутри самой папки и раздаёт только её — ни соседние
   проекты, ни черновики сюда не попадают. Запуск из этой папки:

       node serve.js

   Понимает Range-запросы: без них браузер не умеет перематывать
   видео и иногда отказывается его проигрывать.
   ═══════════════════════════════════════════════════════════ */
const http = require('http');
const fs = require('fs');
const path = require('path');

/* корень тоже берём настоящий: сравнивать короткое имя с длинным
   бессмысленно, они не совпадут ни одним символом */
const ROOT = fs.realpathSync(__dirname);
const PORT = Number(process.env.PORT) || 4500;
/* слушаем только свою машину. Нужен доступ с телефона по Wi-Fi —
   запусти так: HOST=0.0.0.0 node serve.js */
const HOST = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2'
};

http.createServer((req, res) => {
  /* decodeURIComponent падает на кривом проценте вроде /%, а
     исключение в обработчике роняет весь процесс — одним запросом */
  let url;
  try {
    url = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('400');
    return;
  }

  const target = path.join(ROOT, url === '/' ? 'index.html' : url);

  /* Проверяем не адрес, а то, куда он на самом деле ведёт.
     Разбирать адрес самому бесполезно: Windows считает разделителем
     и обратный слэш, поэтому «/\.git/config» проходит любую проверку
     по сегментам и всё равно попадает в .git. А ещё у каждой папки
     есть короткое имя в стиле GIT~1, ведущее туда же.
     realpath снимает и то, и другое: он возвращает настоящий путь
     с настоящими именами, и уже его мы сверяем с корнем. */
  fs.realpath(target, (rErr, file) => {
    if (rErr) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
      return;
    }

    const rel = path.relative(ROOT, file);
    const outside = rel.startsWith('..') || path.isAbsolute(rel);
    const hidden = rel.split(/[\\/]/).some(seg => seg.startsWith('.'));
    if (outside || hidden) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('403');
      return;
    }

    serve(file);
  });

  function serve(file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
      return;
    }

    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;

    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m && m[1] ? parseInt(m[1], 10) : 0;
      const end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;

      if (start >= st.size || end >= st.size || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }).end();
        return;
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${st.size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store'
      });
      fs.createReadStream(file, { start, end })
        .on('error', () => res.destroy())
        .pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': st.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(file)
      .on('error', () => res.destroy())
      .pipe(res);
  });
  }
}).listen(PORT, HOST, () => {
  console.log(`TROHA — портфолио: http://localhost:${PORT}`);
});
