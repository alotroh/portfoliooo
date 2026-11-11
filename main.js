gsap.registerPlugin(ScrollTrigger);

/* Звук подключается отдельным файлом. Если он не загрузился —
   на месте каждого вызова остаётся пустышка, и анимации работают
   как ни в чём не бывало. */
const SND = window.SND || { whoosh() {}, click() {}, drop() {} };

/* ═══════ 1. ИНЕРЦИОННЫЙ СКРОЛЛ ═══════ */
/* если CDN не отдал Lenis — сайт работает на нативном скролле, а не падает */
let lenis = null;
if (typeof Lenis === 'function') {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();                     // заперт до конца входа
  window.__lenis = lenis;
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
  if (!root) return [];
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
   одна буква. На узких экранах сужаем viewBox и кегль. */
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
    [r, m].forEach(el => el && el.setAttribute('width', narrow ? '560' : '1440'));
    const mask = svg.querySelector('mask');
    if (mask) mask.setAttribute('width', narrow ? '560' : '1440');
  }
  fit();
  addEventListener('resize', fit);
})();

/* ═══════ 3. ГЕРОЙ: ПРОЛЁТ СКВОЗЬ БУКВЫ ═══════
   Секция закреплена средствами CSS (высокая оболочка + sticky внутри),
   поэтому ScrollTrigger только прокручивает таймлайн и ничего не измеряет.
   Раньше здесь стоял pin — и на один кадр содержимое уезжало вбок.
   В хвосте по экрану один раз проходит кадровая полоса: это и есть
   стык с плёнкой — лента как будто сбилась и пошла дальше.            */
(function () {
  const roll = document.getElementById('roll');

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero', start: 'top top', end: 'bottom top',
      scrub: 1, invalidateOnRefresh: true
    }
  });

  /* Пустая секунда задаёт длину таймлайна, поэтому позиции ниже
     читаются как доли всей прокрутки героя. Первая половина — экран
     стоит и идёт пролёт, вторая — его выталкивает плёнка.
     Герой больше не гаснет в ноль: именно это давало чёрный экран
     на восьми процентах, когда анимация кончилась, а лента ещё не
     пришла. Теперь он уезжает живым. */
  tl.to({}, { duration: 1 }, 0)
    .to('#heroMedia',    { scale: 1.44, duration: .5,  ease: 'none' }, 0)
    .to('#knock',        { scale: 2.15, duration: .5,  ease: 'none' }, 0)
    .to('.hero__bottom', { yPercent: 75, opacity: 0, duration: .22, ease: 'none' }, 0)
    .to('#knock',        { opacity: 0,   duration: .2, ease: 'none' }, .3)
    .to('#heroMedia',    { opacity: .5,  duration: .3, ease: 'none' }, .52);

  if (roll) {
    tl.fromTo(roll,
      { yPercent: -150, opacity: 0 },
      { yPercent: 150, opacity: 1, duration: .22, ease: 'none', immediateRender: false }, .42)
      .to(roll, { opacity: 0, duration: .05, ease: 'none' }, .64);
  }
  tl.call(() => SND.whoosh(1.15), null, .44);
})();

/* ═══════ 4. ПОЯВЛЕНИЕ СЕКЦИИ РАБОТ ═══════ */
gsap.from('.field__head > *', {
  yPercent: 110, duration: 1, ease: 'expo.out', stagger: .07,
  scrollTrigger: { trigger: '.field', start: 'top 92%' }
});

const titleWords = splitWords(document.querySelector('.field__title'));
gsap.from(titleWords, {
  yPercent: 110, ease: 'none', stagger: .05,
  scrollTrigger: { trigger: '.field', start: 'top 88%', end: 'top 26%', scrub: 1 }
});

/* ═══════ 4b. ФОНОВОЕ ВИДЕО СЕКЦИИ ═══════ */
const fieldVideo = document.getElementById('fieldVideo');
if (fieldVideo && innerWidth <= 900) {
  fieldVideo.removeAttribute('src');      // не качаем файл на телефоне
  fieldVideo.load();
} else if (fieldVideo) {
  const show = () => document.body.classList.add('has-field-video');
  if (fieldVideo.readyState >= 2) show();
  fieldVideo.addEventListener('loadeddata', show);
  fieldVideo.addEventListener('error', () => {});
  fieldVideo.play().catch(() => {});
}

/* ═══════ 4c. ЛЕТАЮЩИЕ КАРТОЧКИ ═══════ */
const stage = document.getElementById('stage');
const cards = gsap.utils.toArray('.card');
const num = (el, p, def) => parseFloat(getComputedStyle(el).getPropertyValue(p)) || def;

cards.forEach(c => { c.style.zIndex = String(Math.round(num(c, '--s', 1) * 10)); });

/* Собираются по мере прокрутки, начиная с того момента, когда секция
   только показалась из-под плёнки — поэтому пустого экрана между
   телефоном и карточками нет. */
gsap.to(cards, {
  '--in': 1, opacity: 1, ease: 'none', stagger: .07,
  scrollTrigger: { trigger: '.field', start: 'top bottom', end: 'top 18%', scrub: 1 }
});

cards.forEach(c => {
  const d = num(c, '--d', .5);
  gsap.fromTo(c, { '--sz': -80 * d }, {
    '--sz': 85 * d, ease: 'none',
    scrollTrigger: { trigger: '.field', start: 'top bottom', end: 'bottom top', scrub: 1 }
  });
});

/* Дрейф по трём осям. Периоды несоразмерны (1 : 0.73 : 1.31),
   поэтому сумма движений почти не повторяется. */
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
  if (!fieldOn || !stage) return;
  const r = stage.getBoundingClientRect();
  const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
  const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
  par.forEach(p => { p.x(-dx * 90 * p.d); p.y(-dy * 60 * p.d); });
}, { passive: true });

/* ховер: карточка выпрямляется и выходит вперёд */
cards.forEach(c => {
  if (c.classList.contains('card--back')) return;
  c.addEventListener('pointerenter', () => {
    SND.click(cards.indexOf(c));
    gsap.to(c, { '--open': 1, duration: .85, ease: 'expo.out' });
  });
  c.addEventListener('pointerleave', () =>
    gsap.to(c, { '--open': 0, duration: 1.1, ease: 'expo.out' }));
});

/* ═══════ 5. ПОДВАЛ ═══════ */
gsap.from('.foot__big', {
  yPercent: 55, opacity: 0, ease: 'none',
  scrollTrigger: { trigger: '.foot', start: 'top 92%', end: 'top 42%', scrub: 1 }
});

/* ═══════ 6. КУРСОР ═══════ */
const cursor = document.getElementById('cursor');
const cursorTxt = document.getElementById('cursorTxt');
let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;

addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

(function loop() {
  cx += (mx - cx) * .16;
  cy += (my - cy) * .16;
  if (cursor) cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
  requestAnimationFrame(loop);
})();

document.querySelectorAll('a').forEach(a => {
  if (a.classList.contains('nav__ico')) return;      // у значков свой ховер
  const word = a.classList.contains('card') ? 'Открыть' : 'Перейти';
  a.addEventListener('mouseenter', () => {
    cursorTxt.textContent = word;
    cursor.classList.add('is-big');
  });
  a.addEventListener('mouseleave', () => cursor.classList.remove('is-big'));
});

/* ═══════ 7. ЯКОРИ ═══════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    scrollLock.to(a.getAttribute('href'));
  });
});


/* ═══════════════════════════════════════════════════════════
   ВХОД: РАКОРД С ОТСЧЁТОМ
   Чёрно-белый, но не мёртвый: дышит лампа проектора, стрелка
   обходит круг, цифры щёлкают 3 → 2 → 1, на нуле вспышка.
   ═══════════════════════════════════════════════════════════ */
(function () {
  const leader = document.getElementById('leader');
  const word   = document.getElementById('leaderWord');
  const sub    = document.getElementById('leaderSub');
  const frame  = document.getElementById('leaderFrame');
  const count  = document.getElementById('leaderCount');
  const flash  = document.getElementById('leaderFlash');
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

  /* короткая вспышка кадра */
  const blink = (o, d) => {
    if (!flash) return;
    gsap.fromTo(flash, { opacity: 0 }, { opacity: o, duration: d, yoyo: true, repeat: 1, ease: 'none' });
  };

  let shown = 3;

  gsap.timeline({
    onComplete() {
      removeEventListener('wheel', block);
      removeEventListener('touchmove', block);
      leader.remove();
      scrollLock.off();          // прокрутку отпускает вход
      ScrollTrigger.refresh();
    }
  })
    /* 1. проступают служебные отметки ракорда */
    .to('.leader__corner', { autoAlpha: 1, duration: .5, ease: 'power2.out', stagger: .12 })

    /* 2. стрелка обходит круг, тем же сектором проявляя имя,
          а цифра отсчёта щёлкает на каждой трети */
    .to(sweep, {
      v: 360, duration: 2.3, ease: 'power1.inOut',
      onUpdate() {
        leader.style.setProperty('--sw', sweep.v);
        if (frame) frame.textContent =
          'кадр ' + String(Math.round(sweep.v / 3)).padStart(3, '0');

        /* Вспышки на каждой цифре убраны: при таком темпе это читалось
           как мигание лампы, а не как отсчёт. Остался щелчок и сама
           цифра, которая встаёт на место. */
        const next = Math.max(1, 3 - Math.floor(sweep.v / 120));
        if (count && next !== shown) {
          shown = next;
          count.textContent = next;
          gsap.fromTo(count,
            { scale: 1.35, opacity: 0 },
            { scale: 1, opacity: 1, duration: .45, ease: 'expo.out' });
        }
      }
    }, '-=.25')

    /* 3. ноль: вспышка, имя остаётся целиком.
          Маску на этом месте снимаем совсем: оставлять сектор в 360°
          незачем, а любая ошибка округления там стоила бы отрезанной
          буквы в самом конце входа. */
    .add(() => {
      blink(.78, .09);
      word.style.webkitMaskImage = 'none';
      word.style.maskImage = 'none';
    })
    .to(count, { autoAlpha: 0, duration: .35, ease: 'power2.out' }, '<')
    .to(sub, { autoAlpha: 1, yPercent: 0, duration: .8, ease: 'expo.out' }, '-=.3')
    .addLabel('slide', '+=.45')

    /* 4. ракорд уезжает влево, герой приходит справа */
    .call(() => SND.whoosh(1.25), null, 'slide')
    .to(leader,    { xPercent: -100, duration: 1.1, ease: 'expo.inOut' }, 'slide')
    .to(heroParts, { xPercent: 0,    duration: 1.1, ease: 'expo.inOut' }, 'slide')
    /* 5. и сам герой собирается */
    .from('#heroMedia', { scale: 1.2, duration: 2, ease: 'expo.out' }, 'slide+=.25')
    .from('#knockText', { scale: 1.12, duration: 1.6, ease: 'expo.out' }, 'slide+=.33')
    .from('.nav > *', { yPercent: -130, opacity: 0, duration: .85, ease: 'expo.out', stagger: .07 }, 'slide+=.4')
    .from('.hero__line', { scaleX: 0, duration: 1.1, ease: 'expo.out' }, 'slide+=.5')
    .from('.hero__meta .line__in', { yPercent: 110, duration: .9, ease: 'expo.out', stagger: .07 }, 'slide+=.55');
})();


/* ═══════════════════════════════════════════════════════════
   ПЛЁНКА → ТЕЛЕФОН
   Лента бежит сама по себе, кадр слегка водит в окне проектора,
   а работы не растворяются, а сменяют друг друга протяжкой —
   предыдущая уходит влево, следующая приходит справа со вспышкой.
   ═══════════════════════════════════════════════════════════ */
(function () {
  const sec    = document.getElementById('reel');
  const mid    = sec && sec.querySelector('.reel__mid');
  const film   = document.getElementById('reelFilm');
  const gate   = document.getElementById('reelGate');
  const head   = sec && sec.querySelector('.reel__head');
  const foot   = sec && sec.querySelector('.reel__foot');
  const flash  = document.getElementById('reelFlash');
  const phone  = document.getElementById('reelPhone');
  const screen = sec && sec.querySelector('.phone__screen');
  const notch  = sec && sec.querySelector('.phone__notch');
  const shots  = [...document.querySelectorAll('.reel__deck .shot')];
  const numEl  = document.getElementById('reelNum');
  const nameEl = document.getElementById('reelName');
  const catEl  = document.getElementById('reelCat');
  const vid    = document.getElementById('phoneVid');
  if (!sec || !shots.length || typeof gsap === 'undefined') return;

  const N = shots.length;
  if (vid) vid.play().catch(() => {});

  /* ── 1. ЛЕНТА БЕЖИТ ──
     Перфорацию и краевые метки двигаем сами, а не CSS-анимацией:
     скорость нужно менять на лету, а смена animation-duration
     заставляет анимацию прыгать. */
  const runners = [
    ...sec.querySelectorAll('.reel__perf'),
    ...sec.querySelectorAll('.reel__edge')
  ];
  const steps = runners.map(el => el.classList.contains('reel__perf') ? 46 : 68);
  const film$ = { speed: 74, pos: 0 };          // пикселей в секунду
  let last = performance.now(), filmOn = true;

  (function runFilm(now) {
    requestAnimationFrame(runFilm);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!filmOn) return;
    film$.pos -= film$.speed * dt;
    runners.forEach((el, i) => {
      el.style.backgroundPositionX = (film$.pos % steps[i]) + 'px';
    });
  })(last);

  ScrollTrigger.create({
    trigger: sec, start: 'top bottom', end: 'bottom top',
    onToggle: s => { filmOn = s.isActive; }        // не крутим ленту вне экрана
  });

  /* ── 2. КАДР ВОДИТ В ОКНЕ ──
     Настоящая плёнка никогда не стоит ровно: даём ей дрожь на
     доли пикселя со случайной амплитудой. */
  if (gate) {
    gsap.to(gate, {
      duration: .2, repeat: -1, repeatRefresh: true, ease: 'none',
      x: () => gsap.utils.random(-1.7, 1.7),
      y: () => gsap.utils.random(-2.6, 2.6)
    });
  }

  /* стартовые позиции: все кадры в центре, виден первый */
  gsap.set(shots, { xPercent: -50, yPercent: -50 });
  gsap.set(shots.slice(1), { autoAlpha: 0 });
  gsap.set(phone, { xPercent: -50, yPercent: -50, scale: .45, autoAlpha: 0 });

  /* ── подпись под кадром ── */
  let active = -1;
  function setMeta(i) {
    if (i === active || !shots[i]) return;
    active = i;
    const s = shots[i];
    numEl.textContent = String(i + 1).padStart(2, '0');
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
      trigger: sec, start: 'top top', end: 'bottom bottom',
      scrub: 1, invalidateOnRefresh: true
    },
    onUpdate() {                       // активен тот кадр, что сейчас виднее
      let best = 0, bo = -1;
      shots.forEach((s, i) => {
        const o = +gsap.getProperty(s, 'opacity');
        if (o > bo) { bo = o; best = i; }
      });
      if (bo > .25) setMeta(best);
    }
  });

  /* ── АКТ 1 ── протяжка: кадр уходит влево, следующий приходит справа */
  for (let i = 1; i < N; i++) {
    const L = 'sw' + i;
    tl.addLabel(L);

    /* лента дёргает: разгон на протяжке и торможение на кадре */
    tl.to(film$, { speed: 460, duration: .3, ease: 'power2.in' }, L)
      .to(film$, { speed: 74,  duration: .7, ease: 'power3.out' }, L + '+=.3');

    tl.to(shots[i - 1], {
      xPercent: -170, autoAlpha: 0, filter: 'blur(7px)',
      duration: 1, ease: 'power2.inOut'
    }, L);

    tl.fromTo(shots[i],
      { xPercent: 70, autoAlpha: 0, filter: 'blur(7px)' },
      { xPercent: -50, autoAlpha: 1, filter: 'blur(0px)',
        duration: 1, ease: 'power2.inOut', immediateRender: false }, L);

    /* вспышка затвора ровно в момент склейки */
    if (flash) tl.to(flash, {
      opacity: .4, duration: .14, yoyo: true, repeat: 1, ease: 'none'
    }, L + '+=.36');

    tl.to({}, { duration: .55 });      // пауза, чтобы кадр прочитался
  }

  /* ── АКТ 2 ── плёнка гаснет, все работы вылетают карточками */
  tl.addLabel('fly', '+=.3');
  tl.call(() => SND.whoosh(.85), null, 'fly');
  tl.to(film, { autoAlpha: 0, ease: 'power2.inOut', duration: .7 }, 'fly');
  tl.to(film$, { speed: 900, duration: .5, ease: 'power2.in' }, 'fly');
  tl.to(shots, {
    autoAlpha: 1, scale: .5, filter: 'blur(0px)',
    xPercent: -50, yPercent: -50,
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

  /* ── АКТ 4 ── ныряем внутрь экрана.
     Корпус и подписи гаснут, экран разрастается на весь кадр.
     Дальше его просто накрывает секция карточек, которая едет
     сверху своим отрицательным отступом — пустого экрана между
     ними больше нет и резкой склейки тоже. */
  tl.addLabel('dive');
  tl.call(() => SND.whoosh(1.3), null, 'dive');
  tl.to([notch, head, foot], { autoAlpha: 0, ease: 'power2.in', duration: .45 }, 'dive');
  tl.to(phone, { borderWidth: 0, boxShadow: 'none', duration: .45 }, 'dive');
  tl.to(screen, { scale: 20, borderRadius: 0, ease: 'power2.in', duration: 1.6 }, 'dive+=.1');

  /* Видео гасим по ходу увеличения: иначе последние кадры нырка —
     это логотип во всю ширину, а он при таком масштабе разваливается. */
  if (vid) tl.to(vid, { autoAlpha: 0, ease: 'power2.in', duration: .8 }, 'dive+=.55');
  tl.to(screen, { backgroundColor: '#0b0b0c', ease: 'power2.in', duration: .8 }, 'dive+=.55');

  /* Хвоста после нырка нет намеренно: пустой чёрный экран между
     телефоном и карточками брался именно отсюда. Таймлайн кончается
     вместе с секцией, а последнюю треть нырка уже накрывает поле
     карточек, которое едет снизу своим отрицательным отступом. */
})();


/* ═══════════════════════════════════════════════════════════
   ФИНАЛ: ЛИСТ НАЕЗЖАЕТ НА КАРТОЧКИ
   ═══════════════════════════════════════════════════════════ */
(function () {
  const about = document.getElementById('about');
  const sheet = document.getElementById('aboutSheet');
  const stage = document.getElementById('stage');
  if (!about || !sheet || typeof gsap === 'undefined') return;

  /* Наезд делаем коротким: раньше лист полз от низа экрана почти до
     самого верха — полтора оборота колеса ты смотрел на пустую бумагу.
     Теперь он доезжает, пока ещё наполовину за кадром, и дальше ты
     просто читаешь. */
  gsap.fromTo(sheet, { yPercent: 9 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: about, start: 'top bottom', end: 'top 62%', scrub: 1 }
  });

  if (stage) gsap.to(stage, {
    autoAlpha: .45, ease: 'none',
    scrollTrigger: { trigger: about, start: 'top 92%', end: 'top 42%', scrub: 1 }
  });

  gsap.from('.about__head > *', {
    yPercent: 110, duration: .9, ease: 'expo.out', stagger: .07,
    scrollTrigger: { trigger: about, start: 'top 72%' }
  });

  /* Текст набирается одним проигрыванием, а не по ходу прокрутки:
     на scrub он подолгу висел набранным наполовину и читался как
     недогруженный. */
  const leadWords = splitWords(document.querySelector('.about__lead'));
  gsap.from(leadWords, {
    yPercent: 115, duration: .95, ease: 'expo.out', stagger: .035,
    scrollTrigger: { trigger: '.about__lead', start: 'top 86%' }
  });

  gsap.from('.about__txt', {
    y: 26, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .1,
    scrollTrigger: { trigger: '.about__cols', start: 'top 86%' }
  });
  gsap.from('.fact', {
    y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .08,
    scrollTrigger: { trigger: '.about__facts', start: 'top 88%' }
  });
  gsap.from('.about__links > *', {
    y: 24, autoAlpha: 0, duration: .9, ease: 'expo.out', stagger: .08,
    scrollTrigger: { trigger: '.about__links', start: 'top 92%' }
  });
})();


/* ═══════════════════════════════════════════════════════════
   ПРОГРЕСС-ПОЛОСА
   ═══════════════════════════════════════════════════════════ */
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

/* пересчёт после загрузки шрифтов и видео */
addEventListener('load', () => setTimeout(() => ScrollTrigger.refresh(), 300));
