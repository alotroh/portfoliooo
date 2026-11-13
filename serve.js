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

/* Корень тоже берём настоящий: сравнивать короткое имя с длинным
   бессмысленно, они не совпадут ни одним символом.
   Именно .native, а не обычный realpath: первый спрашивает систему и
   получает каноническое длинное имя, второй разворачивает только
   символические ссылки и короткое имя оставляет как есть. */
const ROOT = fs.realpathSync.native(__dirname);
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

  const json = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  };

  /* Подбор. Локально принимаем заявку тем же кодом, что работает на
     проде, — чтобы проверять не заглушку, а настоящий путь. Без токена
     в окружении заявка никуда не уходит, но ответ приходит успешный:
     так видно, что форма работает. */
  if (url === '/api/lead') {
    if (req.method !== 'POST') { json(405, { ok: false, error: 'post-only' }); return; }
    let raw = '', over = false;
    req.on('data', c => {
      raw += c;
      if (raw.length > 5e6) { over = true; req.destroy(); }
    });
    req.on('end', async () => {
      if (over) { json(413, { ok: false, error: 'too-big' }); return; }
      let body = null;
      try { body = JSON.parse(raw); } catch { /* ниже отдадим 400 */ }
      let out;
      try { out = await require('./api/lead.js').send(body, '127.0.0.1'); }
      catch (e) { console.error('заявка не ушла:', e.message); out = { status: 502, msg: 'send-failed' }; }
      if (out.status === 503) {
        const a = (body && body.answers || []).length;
        const f = (body && body.files || []).length;
        console.log(`заявка принята локально: ответов ${a}, файлов ${f} — токен не задан, в телеграм не ушла`);
        out = { status: 200, msg: 'ok' };
      }
      json(out.status, { ok: out.status === 200, error: out.status === 200 ? undefined : out.msg });
    });
    return;
  }

  /* исходники серверной части статикой не отдаём */
  if (/^\/api(\/|$)/.test(url)) { json(404, { ok: false, error: 'not-found' }); return; }

  /* Windows умеет открывать один и тот же файл несколькими именами:
     короткое имя (GIT~1), поток внутри файла (index.html:secret),
     имя с точкой или пробелом на конце — система их молча отбросит.
     Ни одному настоящему файлу этого сайта такое не нужно. */
  const bad = /[~:]/.test(url) ||
              url.split(/[\\/]/).some(seg => /[. ]$/.test(seg));
  if (bad) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('403');
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
  fs.realpath.native(target, (rErr, file) => {
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
