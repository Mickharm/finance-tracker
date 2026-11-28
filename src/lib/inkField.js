// 紙白的背景：宣紙底色上，很淡的墨慢慢暈開；空氣裡有一點暖色的霧塵。
// 兩張畫布，都不跟手指互動，也不會發光：
//   field —— 低解析度的水墨（幾團霧＋兩層雲霧紋理），由瀏覽器放大後自然是糊的；每秒只重畫幾次
//   dust  —— 霧塵：邊緣完全化開的小點，慢慢往上飄
// 特效強度固定在「淡」。系統開了「減少動態效果」時只畫一張靜止的畫面；分頁在背景時暫停。

const K = 0.45;                       // 特效強度（淡）
const FIELD_W = 128;                  // 水墨畫布的寬度（像素）；高度依畫面比例
const FIELD_EVERY = 110;              // 水墨每隔幾毫秒重畫一次（移動很慢，不需要每一格都畫）
const DUST_EVERY = 32;                // 霧塵約每秒 30 格

const BASE = ['#F2F0EB', '#E7E4DD'];
// 幾團沒有邊緣的霧：白霧、兩抹淡墨、右上一點點金
const BLOBS = [
  { c: [255, 255, 255], a: 0.8, r: 0.95, x: 0.8, y: 0.1, sx: 0.12, sy: 0.08, sp: 0.07, ph: 0 },
  { c: [70, 68, 70], a: 0.17, r: 0.9, x: 0.12, y: 0.42, sx: 0.16, sy: 0.14, sp: 0.06, ph: 2 },
  { c: [100, 98, 98], a: 0.11, r: 0.8, x: 0.72, y: 0.9, sx: 0.14, sy: 0.08, sp: 0.08, ph: 4 },
  { c: [176, 140, 70], a: 0.1, r: 0.5, x: 0.92, y: 0.03, sx: 0.06, sy: 0.05, sp: 0.07, ph: 1 },
];
const INK_A = 0.22;                   // 墨的雲霧紋理
const MIST_A = 0.34;                  // 白霧的雲霧紋理
// 霧塵的顏色：淺色底上用暖金褐色（灰黑色的點看起來會像螢幕髒了）
const DUST_COLORS = [[150, 124, 78], [176, 142, 74], [122, 112, 98]];

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const rnd = (a, b) => a + Math.random() * (b - a);

// 可以無縫拼接的雲霧雜訊：只用低頻，放大後是柔的。invert 時取反相（當白霧用）
function makeNoise(color, invert) {
  const n = 64;
  const c = document.createElement('canvas');
  c.width = n; c.height = n;
  const g = c.getContext('2d');
  const img = g.createImageData(n, n);
  const octs = [[2, 0.5], [4, 0.32], [8, 0.18]].map(([s, w]) => {
    const a = new Float32Array(s * s);
    for (let i = 0; i < a.length; i++) a[i] = Math.random();
    return { s, w, a };
  });
  const at = (o, x, y) => o.a[(((y % o.s) + o.s) % o.s) * o.s + (((x % o.s) + o.s) % o.s)];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let v = 0;
      for (const o of octs) {
        const fx = (x / n) * o.s; const fy = (y / n) * o.s;
        const x0 = Math.floor(fx); const y0 = Math.floor(fy);
        const tx = fx - x0; const ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx); const sy = ty * ty * (3 - 2 * ty);
        v += o.w * ((at(o, x0, y0) * (1 - sx) + at(o, x0 + 1, y0) * sx) * (1 - sy) + (at(o, x0, y0 + 1) * (1 - sx) + at(o, x0 + 1, y0 + 1) * sx) * sy);
      }
      v = Math.max(0, Math.min(1, (v - 0.3) / 0.45));
      if (invert) v = 1 - v;
      const i = (y * n + x) * 4;
      img.data[i] = color[0]; img.data[i + 1] = color[1]; img.data[i + 2] = color[2];
      img.data[i + 3] = Math.round(v * v * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// 很軟的一團：中心淡淡的，邊緣完全化開
function makeSprite(color) {
  const s = document.createElement('canvas');
  s.width = 64; s.height = 64;
  const g = s.getContext('2d');
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, rgba(color, 0.85));
  rg.addColorStop(0.18, rgba(color, 0.42));
  rg.addColorStop(0.45, rgba(color, 0.12));
  rg.addColorStop(1, rgba(color, 0));
  g.fillStyle = rg;
  g.fillRect(0, 0, 64, 64);
  return s;
}

// 開始繪製。dust 可以是 null（只畫水墨，例如開啟畫面）。回傳停止用的函式
export function startInk(field, dust) {
  const fctx = field.getContext('2d');
  const dctx = dust ? dust.getContext('2d') : null;
  if (!fctx) return () => {};
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const noiseInk = makeNoise([14, 13, 16], false);
  const noiseMist = makeNoise([255, 255, 255], true);
  const sprites = DUST_COLORS.map(makeSprite);
  const k = Math.min(1.4, 0.6 + 0.42 * K);

  let W = 0; let H = 0; let dpr = 1;
  let motes = [];

  const layout = () => {
    const box = field.parentElement.getBoundingClientRect();
    W = Math.max(1, Math.round(box.width));
    H = Math.max(1, Math.round(box.height));
    field.width = FIELD_W;
    field.height = Math.max(64, Math.round((FIELD_W * H) / W));
    if (dust) {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      dust.width = Math.round(W * dpr);
      dust.height = Math.round(H * dpr);
      const count = Math.max(8, Math.round(90 * K * (W / 380)));
      motes = Array.from({ length: count }, () => ({
        x: rnd(0, W), y: rnd(0, H), r: 2 + Math.random() ** 2 * 9,
        vx: rnd(-0.05, 0.09), vy: -rnd(0.02, 0.09), a: rnd(0.14, 0.42),
        ph: rnd(0, 6.28), sp: rnd(0.5, 1.3), s: sprites[(Math.random() * sprites.length) | 0],
      }));
    }
  };

  const tile = (img, ox, oy, s, alpha) => {
    fctx.globalAlpha = alpha;
    const x0 = (((ox % s) + s) % s) - s;
    const y0 = (((oy % s) + s) % s) - s;
    for (let x = x0; x < field.width; x += s) for (let y = y0; y < field.height; y += s) fctx.drawImage(img, x, y, s, s);
    fctx.globalAlpha = 1;
  };

  // t：秒
  const drawField = (t) => {
    const w = field.width; const h = field.height;
    const g = fctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, BASE[0]); g.addColorStop(1, BASE[1]);
    fctx.globalAlpha = 1; fctx.fillStyle = g; fctx.fillRect(0, 0, w, h);
    const u = t * 2.2;
    for (const b of BLOBS) {
      const x = (b.x + b.sx * Math.sin(u * b.sp + b.ph)) * w;
      const y = (b.y + b.sy * Math.cos(u * b.sp * 0.83 + b.ph * 1.7)) * h;
      const r = b.r * w * (1 + 0.08 * Math.sin(u * 0.05 + b.ph));
      const rg = fctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, rgba(b.c, Math.min(1, b.a * k)));
      rg.addColorStop(0.5, rgba(b.c, b.a * k * 0.42));
      rg.addColorStop(1, rgba(b.c, 0));
      fctx.fillStyle = rg; fctx.fillRect(0, 0, w, h);
    }
    const s = w * 1.6;
    const drift = t * (w / 46);                 // 約 46 秒飄過一個畫面寬
    tile(noiseInk, drift, drift * 0.5, s, INK_A * k);
    tile(noiseMist, -drift * 0.8, drift * 0.34 + 40, s * 1.25, MIST_A * k);
  };

  // dt：以 1/60 秒為單位；t：秒
  const drawDust = (dt, t) => {
    if (!dctx) return;
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dctx.clearRect(0, 0, W, H);
    for (const p of motes) {
      p.x += (p.vx + Math.sin(t * 0.6 * p.sp + p.ph) * 0.08) * dt;
      p.y += (p.vy + Math.cos(t * 0.45 * p.sp + p.ph) * 0.05) * dt;
      const m = p.r * 2 + 10;
      if (p.x < -m) p.x = W + m; else if (p.x > W + m) p.x = -m;
      if (p.y < -m) p.y = H + m; else if (p.y > H + m) p.y = -m;
      dctx.globalAlpha = p.a * (0.7 + 0.3 * Math.sin(t * 0.9 * p.sp + p.ph)) * 0.9;
      const s = p.r * 2.4;
      dctx.drawImage(p.s, p.x - s / 2, p.y - s / 2, s, s);
    }
    dctx.globalAlpha = 1;
  };

  let raf = 0; let running = false;
  let t0 = 0; let lastField = -1e9; let lastDust = 0;
  const tick = (now) => {
    if (!running) return;
    const t = (now - t0) / 1000;
    if (now - lastField >= FIELD_EVERY) { drawField(t); lastField = now; }
    if (now - lastDust >= DUST_EVERY) { drawDust(Math.min(6, (now - lastDust) / 16.667), t); lastDust = now; }
    raf = requestAnimationFrame(tick);
  };
  const play = () => {
    if (running || reduce || document.hidden) return;
    running = true;
    const now = performance.now();
    if (!t0) t0 = now;
    lastDust = now;
    raf = requestAnimationFrame(tick);
  };
  const pause = () => { running = false; cancelAnimationFrame(raf); };
  const onVisibility = () => { if (document.hidden) pause(); else play(); };
  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { layout(); drawField(reduce ? 20 : (performance.now() - t0) / 1000); if (reduce) drawDust(0, 8); }, 160);
  };

  layout();
  drawField(reduce ? 20 : 0);
  if (reduce) drawDust(0, 8);
  play();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', onResize);
  return () => {
    pause();
    clearTimeout(resizeTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', onResize);
  };
}
