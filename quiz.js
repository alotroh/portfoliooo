/* ═══════════════════════════════════════════════════════════════
   TROHA — подбор
   Шаги описаны данными, а не разметкой: ветки отличаются только
   текстом, и держать семнадцать панелей в HTML значит править одно
   и то же в семнадцати местах. Тексты вопросов — ниже, в QUIZ.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const ENDPOINT = '/api/lead';
  const MAX_FILES = 6;
  const MAX_TOTAL = 3.4 * 1024 * 1024;   /* у серверной функции предел
                                            на тело запроса ~4.5 МБ */
  const SND = window.SND || { click() {} };

  /* ─────────────────────── ВОПРОСЫ ─────────────────────── */

  const QUIZ = {

    start: {
      q: 'Что сейчас ты рассматриваешь?',
      kind: 'cards',
      opts: [
        { img: 'media/quiz/pretty.svg', cap: 'Хочу привлекательный сайт для своего бизнеса',
          branch: 'Красивый', next: 'a1' },
        { img: 'media/quiz/sell.svg',   cap: 'Хочу продающий сайт',
          branch: 'Продающий', next: 'b1' },
        { img: 'media/quiz/profit.svg', cap: 'Хочу сайт, который увеличит мою прибыль',
          branch: 'Прибыль', next: 'c1' },
        { img: 'media/quiz/hybrid.svg', cap: 'Я бы хотел сайт-гибрид',
          branch: 'Гибрид', next: 'd1' }
      ]
    },

    /* ── А. Привлекательный ── */
    a1: {
      q: 'У вашего бизнеса сейчас есть сайт?',
      kind: 'choice',
      opts: [{ t: 'Да', next: 'a2' }, { t: 'Нет', next: 'a2' }]
    },
    a2: {
      q: 'Чем занимается ваш бизнес?',
      hint: 'Одной строкой — этого хватит, чтобы я понял отрасль.',
      kind: 'text', ph: 'Кофейня, автосервис, студия красоты…', next: 'a3'
    },
    a3: {
      q: 'Есть пожелания, какой дизайн хочется? Или примеры работ?',
      kind: 'choice',
      opts: [
        { t: 'Да, напишу пожелания', reveal: 'both',
          ph: 'Что нравится, что точно не нравится, какое настроение…', next: 'done' },
        { t: 'Покажу примеры работ', reveal: 'files', next: 'done' },
        { t: 'Нет, пока не знаю', next: 'done' }
      ]
    },

    /* ── Б. Продающий ── */
    b1: {
      q: 'Откуда сейчас приходят клиенты?',
      kind: 'choice',
      opts: [
        { t: 'Сарафанное радио', next: 'b2' },
        { t: 'Реклама', next: 'b2' },
        { t: 'Соцсети', next: 'b2' },
        { t: 'Пока почти ниоткуда', next: 'b2' }
      ]
    },
    b2: {
      q: 'Что человек должен сделать на сайте?',
      hint: 'Одно главное действие. От него зависит вся структура страницы.',
      kind: 'choice',
      opts: [
        { t: 'Оставить заявку', next: 'b3' },
        { t: 'Написать в мессенджер', next: 'b3' },
        { t: 'Позвонить', next: 'b3' },
        { t: 'Сразу купить', next: 'b3' }
      ]
    },
    b3: {
      q: 'Чем занимаетесь и какой средний чек?',
      kind: 'text', ph: 'Натяжные потолки, средний чек 40 000 ₽', next: 'b4'
    },
    b4: {
      q: 'Что мешает продавать сейчас?',
      kind: 'choice',
      opts: [
        { t: 'Расскажу словами', reveal: 'text',
          ph: 'Что происходит: заходят и уходят, звонят не те, дорого…', next: 'done' },
        { t: 'Покажу, что есть сейчас', reveal: 'both',
          ph: 'Ссылка на сайт или на рекламу', next: 'done' },
        { t: 'Пока не понимаю — в этом и вопрос', next: 'done' }
      ]
    },

    /* ── В. Прибыль ── */
    c1: {
      q: 'Сколько заявок приносит сайт сейчас?',
      kind: 'choice',
      opts: [
        { t: 'Сайта нет', next: 'c2' },
        { t: 'До пяти в месяц', next: 'c2' },
        { t: 'От пяти до двадцати', next: 'c2' },
        { t: 'Больше двадцати', next: 'c2' }
      ]
    },
    c2: {
      q: 'Чем занимается бизнес и кто у вас покупает?',
      hint: 'Кто платит — важнее того, что продаётся. Сайт пишется под него.',
      kind: 'text', ph: 'Поставка оборудования, покупают прорабы и снабженцы', next: 'c3'
    },
    c3: {
      q: 'Кто ваш главный конкурент?',
      hint: 'С него я и начну: посмотрю, что у него работает, а что нет.',
      kind: 'text', ph: 'Название или ссылка', optional: true, next: 'c4'
    },
    c4: {
      q: 'На чём, по-вашему, сейчас теряются деньги?',
      kind: 'choice',
      opts: [
        { t: 'Люди заходят и уходят', next: 'done' },
        { t: 'Заявки есть, но не те', next: 'done' },
        { t: 'Нас не находят', next: 'done' },
        { t: 'Расскажу подробнее', reveal: 'both',
          ph: 'Где именно обрывается путь клиента', next: 'done' }
      ]
    },

    /* ── Г. Гибрид ── */
    d1: {
      q: 'Что должно совмещаться?',
      kind: 'choice',
      opts: [
        { t: 'Каталог и заявки', next: 'd2' },
        { t: 'Блог и продажи', next: 'd2' },
        { t: 'Услуги и онлайн-запись', next: 'd2' },
        { t: 'Своё сочетание', reveal: 'text', ph: 'Что с чем', next: 'd2' }
      ]
    },
    d2: {
      q: 'Чем занимается бизнес?',
      kind: 'text', ph: 'Коротко', next: 'd3'
    },
    d3: {
      q: 'Есть пример, как это должно работать?',
      kind: 'choice',
      opts: [
        { t: 'Дам ссылки', reveal: 'text', ph: 'Одна ссылка на строку', next: 'done' },
        { t: 'Покажу файлами', reveal: 'files', next: 'done' },
        { t: 'Опишу словами', reveal: 'text', ph: 'Как вы это видите', next: 'done' },
        { t: 'Пока не знаю', next: 'done' }
      ]
    }
  };

  /* длина каждой ветки — для полоски прогресса */
  const LEN = { '': 4, a: 4, b: 5, c: 5, d: 4 };

  const CHANNELS = [
    { id: 'Telegram', ph: '@username или телефон', kind: 'any' },
    { id: 'MAX',      ph: '@username или телефон', kind: 'any' },
    { id: 'WhatsApp', ph: '+7 999 000-00-00',      kind: 'phone' }
  ];

  /* ─────────────────────── СОСТОЯНИЕ ─────────────────────── */

  const sheet = document.getElementById('quizSheet');
  const stage = document.getElementById('quizStage');
  const numEl = document.getElementById('quizNum');
  const railEl = document.getElementById('quizRail');
  const metaEl = document.getElementById('quizMeta');
  if (!sheet || !stage) return;

  const S = {
    id: 'start',
    history: [],
    branch: '',
    answers: [],
    files: [],
    channel: '',
    born: Date.now()
  };

  const has = typeof gsap !== 'undefined';
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ─────────────────────── ОТРИСОВКА ─────────────────────── */

  function head(step) {
    let h = '<h3 class="quiz__q"><span class="m"><i>' + esc(step.q) + '</i></span></h3>';
    if (step.hint) h += '<p class="quiz__hint">' + esc(step.hint) + '</p>';
    return h;
  }

  function draw() {
    const step = QUIZ[S.id];
    stage.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'quiz__step';

    if (S.id === 'done') { drawFinal(box); }
    else if (step.kind === 'cards') { drawCards(box, step); }
    else if (step.kind === 'choice') { drawChoice(box, step); }
    else { drawText(box, step); }

    if (S.history.length) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'quiz__back';
      back.textContent = '← Назад';
      back.addEventListener('click', goBack);
      box.appendChild(back);
    }

    stage.appendChild(box);
    paintMeta();
    reveal(box);
  }

  function drawCards(box, step) {
    box.innerHTML = head(step) + '<div class="quiz__cards"></div>';
    const wrap = box.querySelector('.quiz__cards');
    step.opts.forEach(o => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiz__card';
      b.innerHTML = '<img src="' + esc(o.img) + '" alt="" loading="lazy">' +
                    '<span>' + esc(o.cap) + '</span><i></i>';
      b.addEventListener('click', () => {
        SND.click(0);
        S.branch = o.branch;
        answer(step.q, o.cap);
        go(o.next);
      });
      wrap.appendChild(b);
    });
  }

  function drawChoice(box, step) {
    box.innerHTML = head(step) + '<div class="quiz__opts"></div><div class="quiz__extra"></div>';
    const list = box.querySelector('.quiz__opts');
    const extra = box.querySelector('.quiz__extra');

    step.opts.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiz__opt';
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<b>' + String(i + 1).padStart(2, '0') + '</b><span>' + esc(o.t) + '</span>';
      b.addEventListener('click', () => {
        SND.click(i);
        if (!o.reveal) { answer(step.q, o.t); go(o.next); return; }

        /* вариант с раскрытием: отмечаем и показываем поле под списком */
        [...list.children].forEach(c => c.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        openExtra(extra, step, o);
      });
      list.appendChild(b);
    });
  }

  function openExtra(extra, step, o) {
    extra.innerHTML = '';
    const needText = o.reveal === 'text' || o.reveal === 'both';
    const needFiles = o.reveal === 'files' || o.reveal === 'both';
    let ta = null;

    if (needText) {
      ta = document.createElement('textarea');
      ta.className = 'quiz__field';
      ta.placeholder = o.ph || 'Напишите тут';
      ta.setAttribute('aria-label', o.t);
      const w = document.createElement('div');
      w.style.marginTop = '1.4rem';
      w.appendChild(ta);
      extra.appendChild(w);
    }
    if (needFiles) extra.appendChild(filesBlock());

    const row = document.createElement('div');
    row.className = 'quiz__row';
    const go_ = document.createElement('button');
    go_.type = 'button';
    go_.className = 'quiz__go';
    go_.textContent = 'Дальше';
    go_.addEventListener('click', () => {
      let a = o.t;
      if (ta && ta.value.trim()) a += ' — ' + ta.value.trim();
      answer(step.q, a);
      go(o.next);
    });
    row.appendChild(go_);
    extra.appendChild(row);

    if (has) gsap.from(extra.children, {
      autoAlpha: 0, y: 16, duration: .6, ease: 'expo.out', stagger: .06
    });
    if (ta) ta.focus();
  }

  function drawText(box, step) {
    box.innerHTML = head(step) +
      '<input class="quiz__field" type="text" maxlength="180" placeholder="' +
      esc(step.ph || '') + '" aria-label="' + esc(step.q) + '">' +
      '<div class="quiz__row"></div>';
    const input = box.querySelector('.quiz__field');
    const row = box.querySelector('.quiz__row');

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'quiz__go';
    next.textContent = 'Дальше';
    next.disabled = !step.optional;
    next.addEventListener('click', () => {
      answer(step.q, input.value.trim() || '— пропущено —');
      go(step.next);
    });
    row.appendChild(next);

    if (step.optional) {
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'quiz__go quiz__skip';
      skip.textContent = 'Не знаю';
      skip.addEventListener('click', () => {
        answer(step.q, '— не знает —');
        go(step.next);
      });
      row.appendChild(skip);
    }

    input.addEventListener('input', () => {
      if (!step.optional) next.disabled = input.value.trim().length < 2;
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !next.disabled) { e.preventDefault(); next.click(); }
    });
    setTimeout(() => input.focus(), 420);
  }

  /* ─────────────────────── ФАЙЛЫ ─────────────────────── */

  function filesBlock() {
    const wrap = document.createElement('div');
    wrap.className = 'quiz__files';
    wrap.innerHTML =
      '<label class="quiz__drop">' +
        '<input type="file" multiple accept="image/*,.pdf">' +
        '<span>Перетащите файлы сюда или нажмите, чтобы выбрать</span>' +
      '</label>' +
      '<ul class="quiz__list"></ul>' +
      '<p class="quiz__err" role="status"></p>';

    const drop = wrap.querySelector('.quiz__drop');
    const input = wrap.querySelector('input');
    const list = wrap.querySelector('.quiz__list');
    const err = wrap.querySelector('.quiz__err');

    input.addEventListener('change', () => { take(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(ev =>
      drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach(ev =>
      drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', e => take(e.dataTransfer.files));

    function paint() {
      list.innerHTML = '';
      S.files.forEach((f, i) => {
        const li = document.createElement('li');
        li.className = 'quiz__file';
        li.innerHTML = '<em>' + esc(f.name) + '</em>' +
          '<button type="button" aria-label="Убрать файл">×</button>';
        li.querySelector('button').addEventListener('click', () => {
          S.files.splice(i, 1); paint();
        });
        list.appendChild(li);
      });
    }

    async function take(fileList) {
      err.textContent = '';
      for (const f of [...fileList]) {
        if (S.files.length >= MAX_FILES) { err.textContent = 'Больше ' + MAX_FILES + ' файлов не нужно.'; break; }
        const isImg = /^image\//.test(f.type);
        const isPdf = f.type === 'application/pdf';
        if (!isImg && !isPdf) { err.textContent = 'Только картинки и PDF.'; continue; }
        try {
          const data = isImg ? await shrink(f) : await asDataURL(f);
          const size = Math.round(data.length * 0.75);
          const total = S.files.reduce((s, x) => s + x.size, 0) + size;
          if (total > MAX_TOTAL) {
            err.textContent = 'Файлы весят слишком много. Уберите один или пришлите в переписке.';
            continue;
          }
          S.files.push({ name: f.name, type: isImg ? 'image/jpeg' : f.type, data, size });
        } catch (e) { err.textContent = 'Файл не читается, попробуйте другой.'; }
      }
      paint();
    }

    return wrap;
  }

  function asDataURL(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  /* Картинки ужимаем прямо в браузере: скриншот с телефона весит
     по три мегабайта, а на той стороне нужен просто понятный вид. */
  function shrink(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', .82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
      img.src = url;
    });
  }

  /* ─────────────────────── ФИНАЛ ─────────────────────── */

  function drawFinal(box) {
    box.innerHTML =
      '<h3 class="quiz__q"><span class="m"><i>Спасибо за ответы!</i></span></h3>' +
      '<p class="quiz__hint">Я свяжусь с вами и покажу макет: как может выглядеть ' +
        'сайт именно для вашего бизнеса.</p>' +
      '<p class="quiz__sub label">Выберите удобную соцсеть для связи</p>' +
      '<div class="quiz__channels"></div>' +
      '<div class="quiz__contact"></div>' +
      '<label class="quiz__consent">' +
        '<input type="checkbox" id="quizOk">' +
        '<span>Я даю согласие на обработку моих персональных данных — контакта ' +
          'и ответов выше — чтобы со мной связались по этой заявке, и ознакомлен ' +
          'с <a href="privacy.html" target="_blank" rel="noopener">политикой ' +
          'конфиденциальности</a>. Заявка приходит в Telegram, серверы которого ' +
          'расположены за пределами России, — с такой передачей я тоже согласен.</span>' +
      '</label>' +
      '<div class="quiz__row"><button type="button" class="quiz__go" disabled>Отправить</button></div>' +
      '<p class="quiz__err" role="status"></p>' +
      '<label class="quiz__trap">Не заполняйте<input type="text" tabindex="-1" autocomplete="off"></label>';

    const chWrap = box.querySelector('.quiz__channels');
    const contact = box.querySelector('.quiz__contact');
    const ok = box.querySelector('#quizOk');
    const send = box.querySelector('.quiz__go');
    const err = box.querySelector('.quiz__err');
    const trap = box.querySelector('.quiz__trap input');
    let field = null;

    CHANNELS.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiz__ch';
      b.setAttribute('aria-pressed', 'false');
      b.textContent = c.id;
      b.addEventListener('click', () => {
        SND.click(1);
        S.channel = c.id;
        [...chWrap.children].forEach(x => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        contact.innerHTML = '<input class="quiz__field" type="text" maxlength="60" ' +
          'placeholder="' + esc(c.ph) + '" aria-label="Контакт в ' + esc(c.id) + '">';
        field = contact.querySelector('input');
        field.addEventListener('input', check);
        if (has) gsap.from(field, { autoAlpha: 0, y: 14, duration: .55, ease: 'expo.out' });
        field.focus();
        check();
      });
      chWrap.appendChild(b);
    });

    ok.addEventListener('change', check);

    function check() {
      send.disabled = !(ok.checked && S.channel && field && valid(field.value, S.channel));
    }

    send.addEventListener('click', async () => {
      if (send.disabled) return;
      err.textContent = '';
      send.disabled = true;
      send.textContent = 'Отправляю…';
      try {
        const r = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branch: S.branch,
            answers: S.answers,
            contact: { channel: S.channel, value: field.value.trim() },
            consent: true,
            files: S.files.map(f => ({ name: f.name, type: f.type, data: f.data })),
            elapsed: Date.now() - S.born,
            trap: trap.value
          })
        });
        if (!r.ok) throw new Error('http ' + r.status);
        thanks(box);
      } catch (e) {
        send.disabled = false;
        send.textContent = 'Отправить';
        err.innerHTML = 'Не отправилось. Напишите мне напрямую — ' +
          '<a href="https://t.me/ceoofmembers">@ceoofmembers</a>.';
      }
    });
  }

  function valid(v, channel) {
    v = (v || '').trim();
    if (!v) return false;
    const digits = v.replace(/\D/g, '');
    const isPhone = digits.length >= 10 && digits.length <= 15 && /^[+\d\s()\-]+$/.test(v);
    if (channel === 'WhatsApp') return isPhone;
    return isPhone || /^@?[a-zA-Z0-9_]{4,32}$/.test(v);
  }

  function thanks(box) {
    box.innerHTML =
      '<h3 class="quiz__q"><span class="m"><i>Заявка у меня.</i></span></h3>' +
      '<p class="quiz__hint">Отвечу в ' + esc(S.channel) + '. Обычно в тот же день, ' +
        'самое позднее — на следующий.</p>';
    if (railEl) railEl.style.width = '100%';
    reveal(box);
  }

  /* ─────────────────────── ПЕРЕХОДЫ ─────────────────────── */

  function answer(q, a) { S.answers.push({ q, a }); }

  function go(id) {
    S.history.push(S.id);
    S.id = id;
    swap();
  }

  function goBack() {
    if (!S.history.length) return;
    S.answers.pop();
    S.id = S.history.pop();
    if (S.id === 'start') { S.branch = ''; S.files.length = 0; }
    swap();
  }

  function swap() {
    const old = stage.firstElementChild;
    if (!old || !has) { draw(); return; }
    const h0 = stage.offsetHeight;
    gsap.to(old, {
      autoAlpha: 0, y: -18, duration: .3, ease: 'power2.in',
      onComplete() {
        draw();
        const h1 = stage.offsetHeight;
        gsap.fromTo(stage, { height: h0 },
          { height: h1, duration: .55, ease: 'expo.out', clearProps: 'height' });
      }
    });
  }

  /* маскированный выезд: строка выходит из-под обреза, а не проявляется */
  function reveal(box) {
    if (!has) return;
    const line = box.querySelector('.quiz__q i');
    const rest = [...box.children].filter(c => !c.classList.contains('quiz__q'));
    if (line) gsap.from(line, { yPercent: 100, duration: .95, ease: 'expo.out' });
    gsap.from(rest, { autoAlpha: 0, y: 20, duration: .8, ease: 'expo.out',
      stagger: .07, delay: .12 });
    const cards = box.querySelectorAll('.quiz__card');
    if (cards.length) gsap.from(cards, { autoAlpha: 0, y: 34, duration: 1,
      ease: 'expo.out', stagger: .07, delay: .18 });
    const opts = box.querySelectorAll('.quiz__opt');
    if (opts.length) gsap.from(opts, { autoAlpha: 0, x: -14, duration: .7,
      ease: 'expo.out', stagger: .05, delay: .16 });
  }

  function paintMeta() {
    const letter = S.id === 'start' || S.id === 'done' ? '' : S.id[0];
    const total = LEN[letter] || 4;
    const n = S.history.length;
    if (numEl) numEl.textContent = S.id === 'done' ? '' : String(n + 1).padStart(2, '0');
    if (railEl) railEl.style.width = Math.min(100, (n / total) * 100) + '%';
    if (metaEl) metaEl.textContent = S.id === 'done' ? 'Последний шаг' :
      (S.branch ? S.branch : 'Пара минут');
  }

  draw();
})();
