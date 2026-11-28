/* eslint-disable react-refresh/only-export-components -- 元件與 hook 同檔是刻意設計 */
import { createElement, useEffect, useLayoutEffect, useRef } from 'react';

// ─── 3.0「琉璃」共用元件：極光背景、會數數的金額、液體容器、試管進度條、滑動分段切換、抽屜外殼 ───

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0));

// 極光背景（放在 App 最底層）
export const Aurora = () => (
  <div className="aurora" aria-hidden="true"><i /><i /><i /><i /><i /></div>
);

// ─── 數字 ────────────────────────────────────────────────────────────────
// 會從上一次顯示的值「數」到新值。給 id 的話，切換分頁回來不會每次從 0 重數。
const lastShown = new Map();
export const Num = ({ value, digits = 0, id, duration = 900 }) => {
  const ref = useRef(null);
  const target = Number(value) || 0;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const show = (n) => { el.textContent = n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 }); };
    const from = id && lastShown.has(id) ? lastShown.get(id) : 0;
    let cur = from;
    if (reduceMotion() || from === target) { show(target); if (id) lastShown.set(id, target); return undefined; }
    show(from);
    const t0 = performance.now();
    let raf = 0;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - (1 - p) ** 4;
      cur = from + (target - from) * e;
      show(p < 1 ? (digits ? cur : Math.round(cur)) : target);
      if (p < 1) raf = requestAnimationFrame(tick);
      else cur = target;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); if (id) lastShown.set(id, cur); };
  }, [target, digits, id, duration]);
  return <span ref={ref} />;
};

// 金額：小一號、往上靠的「$」＋等寬數字。animate 會數數。
export const Money = ({ value, digits = 0, className = '', animate = false, id, sign = false, prefix = '$' }) => {
  const v = Number(value) || 0;
  const abs = Math.abs(v);
  return (
    <span className={`money ${className}`}>
      {v < 0 ? <span className="money-sign">−</span> : sign && v > 0 ? <span className="money-sign">+</span> : null}
      {prefix && <span className="money-cur">{prefix}</span>}
      {animate ? <Num value={abs} digits={digits} id={id} /> : <span>{abs.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 })}</span>}
    </span>
  );
};

// ─── 液體 ────────────────────────────────────────────────────────────────
const WAVE = 'M0 6 C 12.5 0 37.5 0 50 6 S 87.5 12 100 6 S 137.5 0 150 6 S 187.5 12 200 6 V 13 H 0 Z';
const Waves = () => (
  <>
    <svg className="liq-wave b" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true"><path d={WAVE} fill="currentColor" /></svg>
    <svg className="liq-wave a" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true"><path d={WAVE} fill="currentColor" /></svg>
  </>
);

// 玻璃容器裡裝著會晃的液體。pct：0–1 的水位；mark：0–1，在容器邊緣畫一道刻度（例如「今天應該剩多少」）
export const Vessel = ({ pct, tone = 'emerald', shape = 'round', className = '', style, mark = null, markLabel, children }) => {
  const m = mark === null ? null : clamp01(mark);
  // 圓形容器：刻度貼著圓的邊緣（越靠上下，邊緣越往內）
  const edge = m === null || shape !== 'round' ? 0 : (0.5 - Math.sqrt(Math.max(0, 0.25 - (0.5 - m) ** 2))) * 100;
  return (
    <div className={`relative shrink-0 ${className}`} style={style}>
      <div className={`vessel ${shape} tone-${tone} absolute inset-0`}>
        <div className="liq" style={{ '--p': clamp01(pct) }}><Waves /></div>
        <div className="vessel-shine" />
        {children && <div className="vessel-label">{children}</div>}
      </div>
      {m !== null && (
        <div className="absolute flex items-center gap-1 pointer-events-none" style={{ top: `${(1 - m) * 100}%`, right: `calc(${100 - edge}% - 5px)`, transform: 'translateY(-50%)' }} aria-hidden="true">
          {markLabel && <span className="text-[9.5px] leading-none font-bold text-slate-500 whitespace-nowrap">{markLabel}</span>}
          <span className="w-[11px] h-[2px] rounded-full bg-slate-700" />
        </div>
      )}
    </div>
  );
};

// ─── 試管進度條 ──────────────────────────────────────────────────────────
// value / max 的比例；marker：0–1，在條上畫一道刻度
export const Tube = ({ value, max = 1, tone = 'emerald', className = '', height = 10, marker = null, alert = false }) => {
  const w = max > 0 ? clamp01(value / max) * 100 : 0;
  return (
    <div className={`relative ${className}`}>
      <div className={`tube ${alert ? 'budget-alert-glow' : ''}`} style={{ height }}>
        <span className={`tube-fill tone-${tone}`} style={{ width: `${w}%` }} />
      </div>
      {marker !== null && (
        <span className="absolute w-[2px] rounded-full bg-slate-700/70 pointer-events-none" style={{ left: `calc(${clamp01(marker) * 100}% - 1px)`, top: -3, bottom: -3 }} aria-hidden="true" />
      )}
    </div>
  );
};

// 多段堆疊的試管：parts = [{ key, value, tone }]
export const StackTube = ({ parts, total, className = '', height = 10 }) => {
  const sum = total ?? parts.reduce((s, p) => s + Math.max(0, p.value), 0);
  return (
    <div className={`tube stack ${className}`} style={{ height }}>
      {sum > 0 && parts.map((p) => (
        <span key={p.key} className={`tube-fill tone-${p.tone}`} style={{ width: `${(Math.max(0, p.value) / sum) * 100}%` }} />
      ))}
    </div>
  );
};

// ─── 分段切換（玻璃片會滑到選中的那一格） ───────────────────────────────
// options: [[key, label, Icon?], ...]
export const Segmented = ({ options, value, onChange, size = 'md', float = false, scroll = false, className = '', label }) => {
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const ready = useRef(false);
  useLayoutEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return undefined;
    const place = () => {
      const on = track.querySelector('[aria-pressed="true"]');
      if (!on) { thumb.style.opacity = '0'; return; }
      if (!ready.current) thumb.style.transition = 'none';
      thumb.style.opacity = '1';
      thumb.style.width = `${on.offsetWidth}px`;
      thumb.style.transform = `translateX(${on.offsetLeft}px)`;
      if (!ready.current) { void thumb.offsetWidth; thumb.style.transition = ''; ready.current = true; }
      if (scroll && track.scrollWidth > track.clientWidth) {
        const want = on.offsetLeft - (track.clientWidth - on.offsetWidth) / 2;
        track.scrollTo({ left: Math.max(0, want), behavior: 'smooth' });
      }
    };
    place();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    ro?.observe(track);
    return () => ro?.disconnect();
  }, [value, options.length, scroll]);
  return (
    <div ref={trackRef} className={`seg ${size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : ''} ${float ? 'float' : ''} ${scroll ? 'scroll' : ''} ${className}`} role="group" aria-label={label}>
      <span ref={thumbRef} className="seg-thumb" aria-hidden="true" />
      {options.map(([k, text, icon]) => (
        <button key={String(k)} type="button" className="seg-btn" aria-pressed={value === k} onClick={() => onChange(k)}>
          {icon && createElement(icon, { className: 'w-3.5 h-3.5', strokeWidth: 2.2 })}{text}
        </button>
      ))}
    </div>
  );
};

// ─── 離場動畫 ────────────────────────────────────────────────────────────
// 元件被 React 卸載的那一刻，把畫面上的節點複製一份留在原地播離場動畫。
// 這樣呼叫端照常 setState(null) 關閉，不用為了動畫延後卸載。
// play(ghost)：對分身播放動畫，回傳要等待的 Animation（或陣列）。
export const useGhostExit = (ref, play) => {
  const playRef = useRef(play);
  useEffect(() => { playRef.current = play; });
  useLayoutEffect(() => {
    const el = ref.current;
    return () => {
      if (!el || !el.parentNode || reduceMotion() || typeof el.animate !== 'function') return;
      const parent = el.parentNode;
      const ghost = el.cloneNode(true);
      ghost.classList.add('ghost');
      ghost.setAttribute('aria-hidden', 'true');
      // 捲動位置不會跟著複製，補上
      const src = el.querySelectorAll('[data-keep-scroll]');
      const dst = ghost.querySelectorAll('[data-keep-scroll]');
      const tops = [...src].map((n) => n.scrollTop);
      queueMicrotask(() => {
        if (el.isConnected) return; // 沒有真的被卸載（開發模式的重複執行）
        parent.appendChild(ghost);
        dst.forEach((n, i) => { n.scrollTop = tops[i] || 0; });
        const done = () => ghost.remove();
        try {
          const anims = [].concat(playRef.current(ghost) || []).filter(Boolean);
          if (!anims.length) return done();
          Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(done);
          setTimeout(done, 900);
        } catch { done(); }
      });
    };
  }, [ref]);
};

const EXIT_EASE = 'cubic-bezier(0.4, 0, 0.9, 0.6)';
export const sheetExit = (ghost) => {
  const scrim = ghost.querySelector('[data-scrim]');
  const panel = ghost.querySelector('[data-panel]');
  return [
    scrim?.animate([{ opacity: 0 }], { duration: 260, easing: 'ease', fill: 'forwards' }),
    panel?.animate([{ transform: 'translate3d(0, 110%, 0)' }], { duration: 300, easing: EXIT_EASE, fill: 'forwards' }),
  ];
};
export const modalExit = (ghost) => {
  const scrim = ghost.querySelector('[data-scrim]');
  const panel = ghost.querySelector('[data-panel]');
  return [
    scrim?.animate([{ opacity: 0 }], { duration: 200, easing: 'ease', fill: 'forwards' }),
    panel?.animate([{ opacity: 0, transform: 'scale(0.9)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' }),
  ];
};

// ─── 抽屜外殼 ────────────────────────────────────────────────────────────
// 浮在畫面底部的玻璃抽屜：進場彈上來、離場滑下去、鍵盤出現時往上推（avoidKeyboard）、
// 抓住上緣的把手往下拉可以關閉。
export const SheetShell = ({ onClose, children, z = 'z-[55]', panelClassName = '', panelStyle, avoidKeyboard = true }) => {
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const scrimRef = useRef(null);
  const drag = useRef(null);
  useGhostExit(rootRef, sheetExit);

  // 鍵盤高度 → --kb（iOS 鍵盤不會縮小版面，要自己往上推）
  useEffect(() => {
    const el = panelRef.current;
    const vv = window.visualViewport;
    if (!avoidKeyboard || !el || !vv) return undefined;
    const onResize = () => {
      const kb = window.innerHeight - vv.height - vv.offsetTop;
      el.style.setProperty('--kb', kb > 50 ? `${kb}px` : '0px');
    };
    onResize();
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [avoidKeyboard]);

  const onDown = (e) => {
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (panelRef.current) panelRef.current.style.transition = 'none';
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const raw = e.clientY - d.y;
    d.dy = raw > 0 ? raw : raw / 5; // 往上拉有阻力
    if (panelRef.current) panelRef.current.style.transform = `translate3d(0, ${d.dy}px, 0)`;
    if (scrimRef.current) scrimRef.current.style.opacity = String(Math.max(0.25, 1 - Math.max(0, d.dy) / 420));
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const v = d.dy / Math.max(1, performance.now() - d.t);
    if (d.dy > 110 || (d.dy > 36 && v > 0.55)) { onClose(); return; }
    const p = panelRef.current;
    if (p) { p.style.transition = 'transform 0.5s var(--spring-soft)'; p.style.transform = ''; setTimeout(() => { if (p) p.style.transition = ''; }, 520); }
    if (scrimRef.current) scrimRef.current.style.opacity = '';
  };

  return (
    <div ref={rootRef} className={`sheet-root ${z}`}>
      <div ref={scrimRef} data-scrim className="sheet-scrim" onClick={onClose} />
      <div ref={panelRef} data-panel className={`sheet-panel ${panelClassName}`} style={panelStyle} role="dialog" aria-modal="true">
        <div className="sheet-grab" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-hidden="true" />
        {children}
      </div>
    </div>
  );
};
