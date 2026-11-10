gsap.registerPlugin(ScrollTrigger);

/* ═══════ 1. ИНЕРЦИОННЫЙ СКРОЛЛ ═══════ */
/* если CDN не отдал Lenis — сайт работает на нативном скролле, а не падает */
let lenis = null;
if (typeof Lenis === 'function') {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();                     // заперт до конца прелоадера
  window.__lenis = lenis;           // чтобы внешние элементы умели прокручивать страницу
} else {
  console.warn('Lenis не загрузился — нативный скролл');
  document.documentElement.style.overflow = 'hidden';
}
const scrollLock = {
  off: () => lenis ? lenis.start() : (document.documentElement.style.overflow = ''),
  to: sel => lenis
    ? lenis.scrollTo(sel, { duration: 1.4 })
    : document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth' })
};

/* ═══════ 1b. ВИДЕО: ЗАПАСНОЙ ФОН ═══════ */
const heroVideo = document.getElementById('heroVideo');
if (heroVideo) {
  heroVideo.addEventListener('error', () => document.body.classList.add('no-video'));
  heroVideo.play().catch(() => {/* автоплей заблокирован — кадр всё равно виден */});
} else {
  document.body.classList.add('no-video');
}

/* ═══════ 2. ПОСЛОВНАЯ РАЗБИВКА ═══════ */
function splitWords(root) {
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const parts = n.textContent.split(/(\s+)/);
        if (!parts.some(p => p.trim())) return;
        const frag = document.createDocumentFragment();
        parts.forEach(p => {
          if (!p.trim()) { frag.appendChild(document.createTextNode(p)); return; }
          const outer = document.createElement('span');
          outer.className = 'w';
          const inner = document.createElement('span');
          inner.className = 'wi';
          inner.textContent = p;
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(root);
  return root.querySelectorAll('.wi');
}

/* ═══════ 2b. ВЫБИВКА ПОД ШИРИНУ ЭКРАНА ═══════
   SVG кроется по принципу slice, и на телефоне из слова оставалась
   одна буква. Поэтому на узких экранах сужаем viewBox и кегль —
   слово снова читается целиком и по-прежнему бьётся о края. */
(function () {
  const svg = document.getElementById('knock');
  const txt = document.getElementById('knockText');
  if (!svg || !txt) return;

  function fit() {
    const narrow = innerWidth < 900;
    svg.setAttribute('viewBox', narrow ? '0 0 560 900' : '0 0 1440 900');
    txt.setAttribute('x', narrow ? '280' : '720');
    txt.setAttribute('y', narrow ? '520' : '545');
    txt.setAttribute('font-size', narrow ? '132' : '400');
    txt.setAttribute('letter-spacing', narrow ? '-5' : '-14');
    const r = svg.querySelector('rect[mask]');
    const m = svg.querySelector('mask rect');
    [r, m].forEach(el => {
      if (!el) return;
      el.setAttribute('width', narrow ? '560' : '1440');
    });
    const mask = svg.querySelector('mask');
    if (mask) mask.setAttribute('width', narrow ? '560' : '1440');
  }
  fit();
  addEventListener('resize', fit);
})();

/* ═══════ 3. ВХОД ═══════
   Прелоадер со счётчиком убран: роль входа взяло на себя красочное
   интро (блок «КРАСОЧНОЕ ИНТРО» ниже), оно же отпускает прокрутку. */

/* ═══════ 4. ГЕРОЙ: ПРОЛЁТ СКВОЗЬ БУКВЫ ═══════
   Герой прибивается к экрану, и прокрутка проводит камеру внутрь слова:
   фон наезжает, буквы разрастаются и растворяются, экран уходит в чистый фон.
   Поэтому стыка с секцией работ больше нет — её просто неоткуда взять.      */
gsap.timeline({
  scrollTrigger: {
    trigger: '.hero', start: 'top top', end: '+=78%',
    pin: true, pinSpacing: true, scrub: 1, anticipatePin: 1,
    /* закреплённые секции обязаны пересчитываться раньше обычных,
       иначе триггеры ниже считают позиции без их отступа */
    refreshPriority: 10
  }
})
  .to('#heroMedia',    { scale: 1.44, duration: 1,   ease: 'none' }, 0)
  .to('#knock',        { scale: 2.15, duration: 1,   ease: 'none' }, 0)
  .to('.hero__bottom', { yPercent: 75, opacity: 0, duration: .42, ease: 'none' }, 0)
  .to('#knock',        { opacity: 0,  duration: .40, ease: 'none' }, .58)
  .to('#heroMedia',    { opacity: 0,  duration: .26, ease: 'none' }, .76);

/* ═══════ 5. ПОЯВЛЕНИЕ СЕКЦИЙ ═══════ */
gsap.from('.field__head > *', {
  yPercent: 110, duration: 1, ease: 'expo.out', stagger: .07,
  scrollTrigger: { trigger: '.field', start: 'top 82%' }
});

const titleWords = splitWords(document.querySelector('.field__title'));
gsap.from(titleWords, {
  yPercent: 110, ease: 'none', stagger: .06,
  scrollTrigger: { trigger: '.field', start: 'top 88%', end: 'top 38%', scrub: 1 }
});

/* ═══════ 5b. ФОНОВОЕ ВИДЕО СЕКЦИИ ═══════ */
const fieldVideo = document.getElementById('fieldVideo');
if (fieldVideo && innerWidth <= 900) {
  fieldVideo.removeAttribute('src');      // не качаем файл на телефоне
  fieldVideo.load();
} else if (fieldVideo) {
  const show = () => document.body.classList.add('has-field-video');
  if (fieldVideo.readyState >= 2) show();
  fieldVideo.addEventListener('loadeddata', show);
  fieldVideo.addEventListener('error', () => {});   // нет файла — остаётся градиент
  fieldVideo.play().catch(() => {});
}

/* ═══════ 5c. ЛЕТАЮЩИЕ КАРТОЧКИ ═══════ */
const stage = document.getElementById('stage');
const cards = gsap.utils.toArray('.card');
const num = (el, p, def) => parseFloat(getComputedStyle(el).getPropertyValue(p)) || def;

/* ближние карточки перекрывают дальние */
cards.forEach(c => { c.style.zIndex = String(Math.round(num(c, '--s', 1) * 10)); });

/* Проявление привязано к самой прокрутке (scrub), а не к одному срабатыванию:
   карточки собираются по мере того, как ты крутишь, и собираются обратно назад. */
gsap.to(cards, {
  '--in': 1, opacity: 1, ease: 'none', stagger: .08,
  scrollTrigger: { trigger: '.field', start: 'top 92%', end: 'top 22%', scrub: 1 }
});

/* Пролёт по глубине: пока секция идёт мимо, карточки выходят на зрителя.
   Дальние двигаются слабее — объём держится. */
cards.forEach(c => {
  const d = num(c, '--d', .5);
  /* небольшой диапазон: на больших значениях перспектива раздувает
     карточки, и они наезжают на заголовок секции */
  gsap.fromTo(c, { '--sz': -80 * d }, {
    '--sz': 85 * d, ease: 'none',
    scrollTrigger: { trigger: '.field', start: 'top bottom', end: 'bottom top', scrub: 1 }
  });
});

/* Дрейф по трём осям. Периоды намеренно несоразмерны (1 : 0.73 : 1.31),
   поэтому сумма движений почти не повторяется и поле не выглядит заведённым. */
const float = (el, prop, amp, dur) => {
  const t = gsap.to(el, {
    [prop]: amp, duration: dur, ease: 'sine.inOut', yoyo: true, repeat: -1
  });
  t.progress(Math.random());
};

cards.forEach((c, i) => {
  const dur = num(c, '--dur', 20) / 2;
  const s = i % 2 ? -1 : 1;
  float(c, '--fy', s * gsap.utils.random(16, 30), dur);
  float(c, '--fx', -s * gsap.utils.random(9, 19), dur * 0.73);
  float(c, '--wob', s * gsap.utils.random(1.4, 3.2), dur * 1.31);
});

/* параллакс: дальние смещаются слабее ближних */
const par = cards.map(c => ({
  x: gsap.quickTo(c, '--px', { duration: .9, ease: 'power3' }),
  y: gsap.quickTo(c, '--py', { duration: .9, ease: 'power3' }),
  d: num(c, '--d', .5)
}));

let fieldOn = false;
ScrollTrigger.create({
  trigger: '.field', start: 'top bottom', end: 'bottom top',
  onToggle: s => { fieldOn = s.isActive; }
});

addEventListener('pointermove', e => {
  if (!fieldOn) return;
  const r = stage.getBoundingClientRect();
  const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
  const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
  par.forEach(p => { p.x(-dx * 90 * p.d); p.y(-dy * 60 * p.d); });
}, { passive: true });

/* ховер: карточка выпрямляется и выходит вперёд */
cards.forEach(c => {
  if (c.classList.contains('card--back')) return;
  c.addEventListener('pointerenter', () =>
    gsap.to(c, { '--open': 1, duration: .85, ease: 'expo.out' }));
  c.addEventListener('pointerleave', () =>
    gsap.to(c, { '--open': 0, duration: 1.1, ease: 'expo.out' }));
});

/* манифест набирается по словам ровно по мере прокрутки */
const sayWords = splitWords(document.querySelector('.say__p'));
gsap.from(sayWords, {
  yPercent: 110, ease: 'none', stagger: .04,
  scrollTrigger: { trigger: '.say', start: 'top 82%', end: 'bottom 72%', scrub: 1 }
});

/* подвал: слово выезжает и доезжает ровно к низу страницы */
gsap.from('.foot__big', {
  yPercent: 55, opacity: 0, ease: 'none',
  scrollTrigger: { trigger: '.foot', start: 'top 92%', end: 'top 42%', scrub: 1 }
});

/* ═══════ 7. КУРСОР ═══════ */
const cursor = document.getElementById('cursor');
const cursorTxt = document.getElementById('cursorTxt');
let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;

addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

(function loop() {
  cx += (mx - cx) * .16;
  cy += (my - cy) * .16;
  cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
  requestAnimationFrame(loop);
})();

document.querySelectorAll('a').forEach(a => {
  const word = a.classList.contains('card') ? 'Открыть' : 'Перейти';
  a.addEventListener('mouseenter', () => {
    cursorTxt.textContent = word;
    cursor.classList.add('is-big');
  });
  a.addEventListener('mouseleave', () => cursor.classList.remove('is-big'));
});

/* ═══════ 8. ЯКОРИ ═══════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    scrollLock.to(a.getAttribute('href'));
  });
});


/* ═══════════════════════════════════════════════════════════
   ДЕМО-слой: интро краской, плёнка → телефон → конфетти,
   прогресс-полоса. Удаляется вместе с demo.html / demo.css.
   ═══════════════════════════════════════════════════════════ */

/* ───────────── 1. ВХОД: РАКОРД ───────────── */
(function () {
  const leader = document.getElementById('leader');
  const word   = document.getElementById('leaderWord');
  const sub    = document.getElementById('leaderSub');
  const frame  = document.getElementById('leaderFrame');
  if (!leader || !word || typeof gsap === 'undefined') return;

  scrollTo(0, 0);
  const block = e => e.preventDefault();
  addEventListener('wheel', block, { passive: false });
  addEventListener('touchmove', block, { passive: false });

  /* --sw держим на самом .leader: от него наследуются и стрелка,
     и коническая маска на имени — они всегда идут одним сектором */
  const sweep = { v: 0 };
  leader.style.setProperty('--sw', 0);
  gsap.set(sub, { autoAlpha: 0, yPercent: 40 });
  gsap.set('.leader__corner', { autoAlpha: 0 });

  const heroParts = ['#heroMedia', '#knock', '.hero__bottom'];
  gsap.set(heroParts, { xPercent: 100 });

  gsap.timeline({
    onComplete() {
      removeEventListener('wheel', block);
      removeEventListener('touchmove', block);
      leader.remove();
      scrollLock.off();          // прокрутку отпускает вход
    }
  })
    /* 1. проступают служебные отметки ракорда */
    .to('.leader__corner', { autoAlpha: 1, duration: .5, ease: 'power2.out', stagger: .12 })
    /* 2. стрелка обходит круг и тем же сектором проявляет имя */
    .to(sweep, {
      v: 360, duration: 2.05, ease: 'power2.inOut',
      onUpdate() {
        leader.style.setProperty('--sw', sweep.v);
        if (frame) frame.textContent =
          'кадр ' + String(Math.round(sweep.v / 3)).padStart(3, '0');
      }
    }, '-=.25')
    .to(sub, { autoAlpha: 1, yPercent: 0, duration: .8, ease: 'expo.out' }, '-=.55')
    .addLabel('slide', '+=.4')
    /* 3. ракорд уезжает влево, герой приходит справа */
    .to(leader,    { xPercent: -100, duration: 1.1, ease: 'expo.inOut' }, 'slide')
    .to(heroParts, { xPercent: 0,    duration: 1.1, ease: 'expo.inOut' }, 'slide')
    /* 4. и сам герой собирается: фон из масштаба, буквы следом */
    .from('#heroMedia', { scale: 1.2, duration: 2, ease: 'expo.out' }, 'slide+=.25')
    .from('#knockText', { scale: 1.12, duration: 1.6, ease: 'expo.out' }, 'slide+=.33')
    .from('.nav > *', { yPercent: -130, opacity: 0, duration: .85, ease: 'expo.out', stagger: .07 }, 'slide+=.4')
    .from('.hero__line', { scaleX: 0, duration: 1.1, ease: 'expo.out' }, 'slide+=.5')
    .from('.hero__meta .line__in', { yPercent: 110, duration: .9, ease: 'expo.out', stagger: .07 }, 'slide+=.55');
})();


/* ───────────── 2. ПЛЁНКА → ТЕЛЕФОН → КОНФЕТТИ ───────────── */
(function () {
  const sec    = document.getElementById('reel');
  const stage  = document.getElementById('reelStage');
  const mid    = sec && sec.querySelector('.reel__mid');
  const film   = document.getElementById('reelFilm');
  const head   = sec && sec.querySelector('.reel__head');
  const foot   = sec && sec.querySelector('.reel__foot');
  const phone  = document.getElementById('reelPhone');
  const screen = sec && sec.querySelector('.phone__screen');
  const notch  = sec && sec.querySelector('.phone__notch');
  const shots  = [...document.querySelectorAll('.reel__deck .shot')];
  const num    = document.getElementById('reelNum');
  const nameEl = document.getElementById('reelName');
  const catEl  = document.getElementById('reelCat');
  const vid    = document.getElementById('phoneVid');
  if (!sec || !shots.length || typeof gsap === 'undefined') return;

  const N = shots.length;
  if (vid) vid.play().catch(() => {});

  /* центрирование отдаём GSAP, иначе его transform затрёт CSS-translate */
  gsap.set(shots, { xPercent: -50, yPercent: -50 });
  gsap.set(shots.slice(1), { autoAlpha: 0, scale: 1.05 });
  gsap.set(phone, { xPercent: -50, yPercent: -50, scale: .45, autoAlpha: 0 });

  /* ── подпись под кадром ── */
  let active = -1;
  function setMeta(i) {
    if (i === active || !shots[i]) return;
    active = i;
    const s = shots[i];
    num.textContent = String(i + 1).padStart(2, '0');
    gsap.killTweensOf([nameEl, catEl]);
    gsap.to([nameEl, catEl], {
      autoAlpha: 0, y: -12, duration: .2, ease: 'power2.in',
      onComplete() {
        nameEl.textContent = s.dataset.name;
        catEl.textContent  = s.dataset.cat;
        gsap.fromTo([nameEl, catEl], { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: .55, ease: 'expo.out', stagger: .05 });
      }
    });
  }
  nameEl.textContent = shots[0].dataset.name;
  catEl.textContent  = shots[0].dataset.cat;
  active = 0;

  /* разлёт по кругу — считаем от текущего размера сцены */
  function scatter(i) {
    const r = mid.getBoundingClientRect();
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(a) * r.width * .25, y: Math.sin(a) * r.height * .3 };
  }

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: sec, start: 'top top', end: '+=560%',
      /* Закрепляем саму секцию, а не вложенный .reel__stage.
         При закреплении внутреннего блока ScrollTrigger переносит его
         в распорку и считает ширину заново — на кадр содержимое уезжало
         вбок, а следующий скролл возвращал его на место.
         pinType:'fixed' задаём явно, чтобы Lenis не включил transform. */
      pin: sec, pinType: 'fixed',
      scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
      refreshPriority: 9          /* после героя, но раньше всего, что ниже */
    },
    onUpdate() {                       // активен тот кадр, что сейчас виднее
      let best = 0, bo = -1;
      shots.forEach((s, i) => {
        const o = +gsap.getProperty(s, 'opacity');
        if (o > bo) { bo = o; best = i; }
      });
      /* после сбора в телефон все кадры прозрачны — подпись не трогаем,
         иначе она откатывается на первую работу */
      if (bo > .25) setMeta(best);
    }
  });

  /* ── АКТ 1 ── кадры меняются на одном и том же месте */
  for (let i = 1; i < N; i++) {
    tl.addLabel('sw' + i);
    tl.to(shots[i - 1], { autoAlpha: 0, scale: .95, ease: 'power2.inOut', duration: 1 }, 'sw' + i);
    tl.to(shots[i],     { autoAlpha: 1, scale: 1,   ease: 'power2.inOut', duration: 1 }, 'sw' + i);
    tl.to({}, { duration: .4 });       // пауза, чтобы кадр прочитался
  }

  /* ── АКТ 2 ── плёнка гаснет, все работы вылетают карточками */
  tl.addLabel('fly', '+=.25');
  tl.to(film, { autoAlpha: 0, ease: 'power2.inOut', duration: .7 }, 'fly');
  tl.to(shots, {
    autoAlpha: 1, scale: .5,
    x: i => scatter(i).x, y: i => scatter(i).y,
    rotation: i => (i % 2 ? 1 : -1) * (7 + i * 2.5),
    ease: 'power2.out', duration: 1.1, stagger: .05
  }, 'fly');

  /* ── и собираются в телефон ── */
  tl.addLabel('gather', '+=.15');
  tl.to(shots, {
    x: 0, y: 0, rotation: 0, scale: .13, autoAlpha: 0,
    ease: 'power3.inOut', duration: 1.2, stagger: { each: .05, from: 'end' }
  }, 'gather');
  tl.to(phone, { scale: 1, autoAlpha: 1, ease: 'expo.out', duration: .95 }, 'gather+=.5');

  /* ── АКТ 3 ── пауза на телефоне */
  tl.to({}, { duration: .7 });

  /* ── АКТ 4 ── ныряем внутрь экрана телефона.
     Корпус и подписи гаснут, экран разрастается на весь кадр и теряет
     скругление — тот же жест, что пролёт сквозь буквы в герое.
     Таймлайн кончается вместе с пином, поэтому сразу идут карточки. */
  tl.addLabel('dive');
  tl.to([notch, head, foot], { autoAlpha: 0, ease: 'power2.in', duration: .45 }, 'dive');
  tl.to(phone, { borderWidth: 0, boxShadow: 'none', duration: .45 }, 'dive');
  tl.to(screen, {
    scale: 20, borderRadius: 0, ease: 'power2.in', duration: 1.45
  }, 'dive+=.1');

  /* Видео гасим по ходу увеличения: иначе последние кадры нырка —
     это логотип во всю ширину, а он при таком масштабе разваливается.
     Экран уходит в цвет страницы, и стык с карточками не виден. */
  if (vid) tl.to(vid, { autoAlpha: 0, ease: 'power2.in', duration: .75 }, 'dive+=.5');
  tl.to(screen, { backgroundColor: '#0b0b0c', ease: 'power2.in', duration: .75 }, 'dive+=.5');

  tl.to(mid, { autoAlpha: 0, ease: 'power1.in', duration: .45 }, 'dive+=1.15');

  /* Пин этой секции создаётся уже после триггеров из main.js, и те
     остаются посчитанными без нашего отступа — анимация карточек
     успевает отыграть, пока лента ещё держит экран. Пересчитываем. */
  addEventListener('load', () => setTimeout(() => ScrollTrigger.refresh(), 400));
  setTimeout(() => ScrollTrigger.refresh(), 1200);
})();


/* ───────────── 3. ФИНАЛ: ЛИСТ НАЕЗЖАЕТ НА КАРТОЧКИ ───────────── */
(function () {
  const about = document.getElementById('about');
  const sheet = document.getElementById('aboutSheet');
  const stage = document.getElementById('stage');
  if (!about || !sheet || typeof gsap === 'undefined') return;

  /* лист выезжает снизу и перекрывает поле карточек */
  gsap.fromTo(sheet, { yPercent: 14 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: about, start: 'top bottom', end: 'top 32%', scrub: 1 }
  });

  /* карточки под ним уходят в тень — появляется ощущение слоя */
  if (stage) gsap.to(stage, {
    autoAlpha: .45, ease: 'none',
    scrollTrigger: { trigger: about, start: 'top 92%', end: 'top 42%', scrub: 1 }
  });

  gsap.from('.about__head > *', {
    yPercent: 110, duration: .9, ease: 'expo.out', stagger: .07,
    scrollTrigger: { trigger: about, start: 'top 72%' }
  });
  gsap.from('.about__txt', {
    y: 26, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .1,
    scrollTrigger: { trigger: '.about__cols', start: 'top 86%' }
  });
  gsap.from('.fact', {
    y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .08,
    scrollTrigger: { trigger: '.about__facts', start: 'top 88%' }
  });
  gsap.from('.about__cta', {
    y: 24, autoAlpha: 0, duration: .9, ease: 'expo.out',
    scrollTrigger: { trigger: '.about__cta', start: 'top 92%' }
  });
})();


/* ───────────── 4. ПРОГРЕСС-ПОЛОСА ───────────── */
(function () {
  const track = document.getElementById('progTrack');
  const fill  = document.getElementById('progFill');
  const knob  = document.getElementById('progKnob');
  const pct   = document.getElementById('progPct');
  if (!track) return;

  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);

  function render() {
    const p = Math.min(1, Math.max(0, scrollY / maxScroll()));
    fill.style.width = (p * 100) + '%';
    knob.style.left  = (p * 100) + '%';
    pct.textContent  = Math.round(p * 100) + '%';
  }
  addEventListener('scroll', render, { passive: true });
  addEventListener('resize', render);
  render();

  /* тащим: если Lenis доступен — через него, иначе нативно */
  let dragging = false;
  function seek(clientX) {
    const r = track.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const y = p * maxScroll();
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true });
    else scrollTo(0, y);
    render();
  }
  track.addEventListener('pointerdown', e => {
    dragging = true; track.classList.add('is-drag');
    track.setPointerCapture(e.pointerId); seek(e.clientX);
  });
  track.addEventListener('pointermove', e => { if (dragging) seek(e.clientX); });
  const stop = () => { dragging = false; track.classList.remove('is-drag'); };
  track.addEventListener('pointerup', stop);
  track.addEventListener('pointercancel', stop);
})();
