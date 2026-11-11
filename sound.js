/* ═══════════════════════════════════════════════════════════
   ЗВУК

   Один звук: клик на карточке под курсором. Переходы и капли
   на первом экране убраны — сайт звучит только там, где человек
   что-то делает руками.

   Файл проигрывается через Web Audio, а не через <audio>:
   он может звучать внахлёст, когда ведёшь по карточкам быстро,
   громкость считается на лету, а задержки между движением и
   звуком нет.

   Браузер не даёт запустить звук до первого действия человека,
   поэтому всё просыпается на первом касании колеса, клике или
   клавише — то есть ровно тогда, когда он начинает смотреть.
   ═══════════════════════════════════════════════════════════ */
window.SND = (function () {

  const KEY = 'troha-sound';
  let on = localStorage.getItem(KEY) !== 'off';

  /* src — путь, vol — громкость, gap — минимум между повторами,
     чтобы при быстром движении по полю звук не сыпался очередью */
  const LIB = {
    click: { src: 'media/sfx/click.mp3', vol: .34, gap: 70 }
  };

  let ctx = null, master = null;
  const buf = {};        // раскодированные файлы
  const last = {};       // когда каждый звучал в прошлый раз
  let loading = false;

  /* ─── контекст и загрузка ─── */
  function build() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;

    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = on ? 1 : 0;

    /* мягкий ограничитель: два-три звука разом не должны драть ухо */
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 5;
    master.connect(comp);
    comp.connect(ctx.destination);

    load();
    return true;
  }

  function load() {
    if (loading) return;
    loading = true;
    Object.keys(LIB).forEach(async name => {
      try {
        const res = await fetch(LIB[name].src);
        if (!res.ok) throw new Error(res.status + ' ' + LIB[name].src);
        buf[name] = await ctx.decodeAudioData(await res.arrayBuffer());
      } catch (e) {
        console.warn('звук не загрузился:', name, e.message);
      }
    });
  }

  /* ─── проигрывание ─── */
  function play(name, rate, gain) {
    if (!on || !ctx || !buf[name]) return;
    if (document.visibilityState === 'hidden') return;
    if (ctx.state === 'suspended') ctx.resume();

    const cfg = LIB[name];
    const t = performance.now();
    if (t - (last[name] || 0) < cfg.gap) return;
    last[name] = t;

    const src = ctx.createBufferSource();
    src.buffer = buf[name];
    src.playbackRate.value = rate || 1;

    const g = ctx.createGain();
    g.gain.value = cfg.vol * (gain == null ? 1 : gain);

    src.connect(g); g.connect(master);
    src.start();
  }

  /* Карточка под курсором. Высоту тона разводим по шести ступеням:
     один и тот же файл, повторённый подряд без изменений, выдаёт
     себя с головой, когда ведёшь по полю. */
  const STEP = [1, 1.06, 1.12, .96, 1.03, 1.09];
  function click(i) {
    play('click', STEP[(i || 0) % STEP.length], 1);
  }

  /* ─── включение / выключение ─── */
  function apply(fade) {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(on ? 1 : 0, t + (fade || .3));
  }

  function toggle() {
    on = !on;
    localStorage.setItem(KEY, on ? 'on' : 'off');
    if (on) { build(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
    apply();
    paint();
    return on;
  }

  /* ─── кнопка ─── */
  let btn = null;
  function paint() {
    if (!btn) return;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Выключить звук' : 'Включить звук');
    const t = btn.querySelector('.snd__txt');
    if (t) t.textContent = on ? 'Звук' : 'Без звука';
  }

  document.addEventListener('DOMContentLoaded', () => {
    btn = document.getElementById('snd');
    if (btn) { btn.addEventListener('click', toggle); paint(); }
  });

  /* первое действие человека — рождение контекста */
  const wake = () => {
    if (on) { build(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
  };
  ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach(ev =>
    addEventListener(ev, wake, { passive: true }));

  /* ушли со вкладки — глушим, вернулись — возвращаем */
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(0, ctx.currentTime);
    } else apply(.35);
  });

  return { click, toggle, isOn: () => on };
})();
