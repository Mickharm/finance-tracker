// 紙白的背景：宣紙底色上，很淡的墨慢慢暈開。
// 一張低解析度的畫布：幾團沒有邊緣的霧＋兩層雲霧紋理，由瀏覽器放大後自然是糊的；每秒只重畫幾次。
// 不跟手指互動、不發光、沒有粒子。特效強度固定在「淡」。
// 系統開了「減少動態效果」時只畫一張靜止的畫面；分頁在背景時暫停。

const K = 0.45;                       // 特效強度（淡）
const FIELD_W = 128;                  // 畫布的寬度（像素）；高度依畫面比例
const FIELD_EVERY = 110;              // 每隔幾毫秒重畫一次（移動很慢，不需要每一格都畫）

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

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

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

// 開始繪製，回傳停止用的函式
export function startInk(field) {
  const ctx = field.getContext('2d');
  if (!ctx) return () => {};
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const noiseInk = makeNoise([14, 13, 16], false);
  const noiseMist = makeNoise([255, 255, 255], true);
  const k = Math.min(1.4, 0.6 + 0.42 * K);

  const layout = () => {
    const box = field.parentElement.getBoundingClientRect();
    const w = Math.max(1, Math.round(box.width));
    const h = Math.max(1, Math.round(box.height));
    field.width = FIELD_W;
    field.height = Math.max(64, Math.round((FIELD_W * h) / w));
  };

  const tile = (img, ox, oy, s, alpha) => {
    ctx.globalAlpha = alpha;
    const x0 = (((ox % s) + s) % s) - s;
    const y0 = (((oy % s) + s) % s) - s;
    for (let x = x0; x < field.width; x += s) for (let y = y0; y < field.height; y += s) ctx.drawImage(img, x, y, s, s);
    ctx.globalAlpha = 1;
  };

  // t：秒
  const draw = (t) => {
    const w = field.width; const h = field.height;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, BASE[0]); g.addColorStop(1, BASE[1]);
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const u = t * 2.2;
    for (const b of BLOBS) {
      const x = (b.x + b.sx * Math.sin(u * b.sp + b.ph)) * w;
      const y = (b.y + b.sy * Math.cos(u * b.sp * 0.83 + b.ph * 1.7)) * h;
      const r = b.r * w * (1 + 0.08 * Math.sin(u * 0.05 + b.ph));
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, rgba(b.c, Math.min(1, b.a * k)));
      rg.addColorStop(0.5, rgba(b.c, b.a * k * 0.42));
      rg.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    }
    const s = w * 1.6;
    const drift = t * (w / 46);                 // 約 46 秒飄過一個畫面寬
    tile(noiseInk, drift, drift * 0.5, s, INK_A * k);
    tile(noiseMist, -drift * 0.8, drift * 0.34 + 40, s * 1.25, MIST_A * k);
  };

  let raf = 0; let running = false;
  let t0 = 0; let last = -1e9;
  const tick = (now) => {
    if (!running) return;
    if (now - last >= FIELD_EVERY) { draw((now - t0) / 1000); last = now; }
    raf = requestAnimationFrame(tick);
  };
  const play = () => {
    if (running || reduce || document.hidden) return;
    running = true;
    if (!t0) t0 = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const pause = () => { running = false; cancelAnimationFrame(raf); };
  const onVisibility = () => { if (document.hidden) pause(); else play(); };
  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { layout(); draw(reduce || !t0 ? 20 : (performance.now() - t0) / 1000); }, 160);
  };

  layout();
  draw(reduce ? 20 : 0);
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
