/* ════════════════════════════════════════════════════
   Рябь по воде на герое.
   Видео уходит в текстуру, курсор оставляет за собой
   расходящиеся круги, которые смещают UV при выборке.
   Если WebGL недоступен — просто остаётся обычное видео.
   ════════════════════════════════════════════════════ */
(function () {
  const video = document.getElementById('heroVideo');
  const canvas = document.getElementById('ripple');
  const hero = document.getElementById('hero');
  if (!video || !canvas || !hero) return;

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false });
  if (!gl) return;

  const MAXP = 14;                      // сколько кругов живёт одновременно
  const LIFE = 2.0;                     // секунд на круг

  const VERT = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main(){
      vUv = aPos * 0.5 + 0.5;
      vUv.y = 1.0 - vUv.y;              // текстура видео идёт сверху вниз
      gl_Position = vec4(aPos, 0.0, 1.0);
    }`;

  const FRAG = `
    precision highp float;
    #define MAXP ${MAXP}
    #define LIFE ${LIFE.toFixed(1)}
    uniform sampler2D uTex;
    uniform vec2  uRes;
    uniform vec2  uTexRes;
    uniform float uTime;
    uniform vec3  uPts[MAXP];           // x, y, время рождения
    varying vec2 vUv;

    void main(){
      /* вписываем кадр по принципу object-fit: cover */
      float cAR = uRes.x / uRes.y;
      float tAR = uTexRes.x / uTexRes.y;
      vec2 s = vec2(1.0);
      if (cAR > tAR) s.y = tAR / cAR; else s.x = cAR / tAR;
      vec2 uv = (vUv - 0.5) * s + 0.5;

      vec2 asp = vec2(cAR, 1.0);
      vec2 disp = vec2(0.0);

      for (int i = 0; i < MAXP; i++) {
        vec3 p = uPts[i];
        if (p.z <= 0.0) continue;
        float age = uTime - p.z;
        if (age < 0.0 || age > LIFE) continue;

        vec2  d    = (vUv - p.xy) * asp;
        float dist = length(d) + 1e-5;
        float wave = sin(dist * 48.0 - age * 8.0);
        float env  = exp(-dist * 8.5) * exp(-age * 2.4);
        disp += (d / dist) * wave * env * 0.016;
      }

      vec3 col = texture2D(uTex, uv + disp * s).rgb;
      col += length(disp) * 2.4;        // блик на гребне волны
      gl_FragColor = vec4(col, 1.0);
    }`;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('ripple shader:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('ripple link:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  /* полноэкранный треугольник-квад */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTex = gl.getUniformLocation(prog, 'uTex');
  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTexRes = gl.getUniformLocation(prog, 'uTexRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uPts = gl.getUniformLocation(prog, 'uPts');

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(uTex, 0);

  /* ── кольцевой буфер точек ── */
  const pts = new Float32Array(MAXP * 3);
  let head = 0, lastX = -1, lastY = -1;

  function addPoint(nx, ny) {
    const i = head * 3;
    pts[i] = nx; pts[i + 1] = ny; pts[i + 2] = performance.now() / 1000;
    head = (head + 1) % MAXP;
  }

  hero.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    if (lastX >= 0 && Math.hypot(nx - lastX, ny - lastY) < 0.014) return;
    lastX = nx; lastY = ny;
    addPoint(nx, ny);
  }, { passive: true });

  /* ── размер ── */
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  addEventListener('resize', resize);

  /* ── не жжём GPU, когда герой не на экране ── */
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 })
    .observe(hero);

  let ready = false;

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;

    if (video.readyState >= 2 && video.videoWidth) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.uniform2f(uTexRes, video.videoWidth, video.videoHeight);
      if (!ready) { ready = true; document.body.classList.add('has-ripple'); }
    }
    if (!ready) return;

    resize();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, performance.now() / 1000);
    gl.uniform3fv(uPts, pts);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  frame();
})();
