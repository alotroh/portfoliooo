/* ═══════════════════════════════════════════════════════════════
   Приём заявки из подбора и отправка её в телеграм.

   Эта часть обязана жить на сервере. Токен бота — это полный доступ
   к боту: кто его прочитал, тот может и читать переписку, и писать
   от его имени. В коде страницы он виден любому, поэтому отправка
   идёт отсюда, а токен лежит в переменных окружения.

   Нужны две переменные (Vercel → Settings → Environment Variables):
       TELEGRAM_BOT_TOKEN  — выдаёт @BotFather
       TELEGRAM_CHAT_ID    — куда слать; свой id скажет @userinfobot

   Ничего не храним: заявка уходит в телеграм и забывается.
   ═══════════════════════════════════════════════════════════════ */

const MAX_FILES = 6;
const MAX_FILE = 4 * 1024 * 1024;
const MIN_ELAPSED = 2500;          /* человек не проходит подбор за две секунды */

const hits = new Map();            /* грубый тормоз для спама */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clean(s, max) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max || 400);
}

function tooMany(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 500) hits.clear();
  return list.length > 5;
}

function compose(p) {
  const when = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  const lines = [
    '<b>Заявка с сайта</b>',
    'Направление: <b>' + esc(clean(p.branch, 40) || 'не указано') + '</b>',
    ''
  ];
  (p.answers || []).slice(0, 12).forEach((a, i) => {
    lines.push((i + 1) + '. ' + esc(clean(a && a.q, 160)));
    lines.push('    <b>' + esc(clean(a && a.a, 900)) + '</b>');
  });
  lines.push('');
  lines.push('Связь: <b>' + esc(clean(p.contact && p.contact.channel, 20)) + '</b> — ' +
             '<code>' + esc(clean(p.contact && p.contact.value, 60)) + '</code>');
  lines.push('Согласие на обработку данных: да, ' + esc(when) + ' (МСК)');
  const text = lines.join('\n');
  return text.length > 3900 ? text.slice(0, 3900) + '\n…' : text;
}

function fromDataURL(data) {
  const m = /^data:([^;,]+);base64,(.+)$/.exec(String(data || ''));
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > MAX_FILE) return null;
  return { type: m[1], buf };
}

async function tg(token, method, body, isForm) {
  const r = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'POST',
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body: isForm ? body : JSON.stringify(body)
  });
  if (!r.ok) {
    /* наружу текст ошибки телеграма не отдаём: там бывает токен */
    throw new Error('telegram ' + method + ' ' + r.status);
  }
  return r.json();
}

/* ─── собственно отправка; используется и функцией, и локальным сервером ─── */
async function send(payload, ip) {
  const p = payload || {};

  if (p.consent !== true) return { status: 400, msg: 'no-consent' };
  if (p.trap) return { status: 200, msg: 'ok' };              /* бот, молча глотаем */
  if (Number(p.elapsed) < MIN_ELAPSED) return { status: 400, msg: 'too-fast' };
  if (!p.contact || !p.contact.channel || !p.contact.value) return { status: 400, msg: 'no-contact' };
  if (!Array.isArray(p.answers) || !p.answers.length) return { status: 400, msg: 'empty' };
  if (ip && tooMany(ip)) return { status: 429, msg: 'slow-down' };

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { status: 503, msg: 'not-configured' };

  await tg(token, 'sendMessage', {
    chat_id: chat, text: compose(p), parse_mode: 'HTML',
    disable_web_page_preview: true
  });

  const files = Array.isArray(p.files) ? p.files.slice(0, MAX_FILES) : [];
  for (const f of files) {
    const got = fromDataURL(f && f.data);
    if (!got) continue;
    const isImg = /^image\//.test(got.type);
    const name = clean(f.name, 80) || (isImg ? 'photo.jpg' : 'file.pdf');
    const form = new FormData();
    form.append('chat_id', chat);
    form.append(isImg ? 'photo' : 'document',
      new Blob([got.buf], { type: got.type }), name);
    try {
      await tg(token, isImg ? 'sendPhoto' : 'sendDocument', form, true);
    } catch (e) { /* один не ушёл — остальные и текст уже на месте */ }
  }

  return { status: 200, msg: 'ok' };
}

/* ─── точка входа Vercel ─── */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('method not allowed');
    return;
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }

  let out;
  try {
    out = await send(body, ip);
  } catch (e) {
    console.error('lead failed:', e.message);     /* без данных заявки */
    out = { status: 502, msg: 'send-failed' };
  }

  res.statusCode = out.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: out.status === 200, error: out.status === 200 ? undefined : out.msg }));
};

module.exports.send = send;
