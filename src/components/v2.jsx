import { createElement, useId } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, ChevronLeft, ChevronRight, Plus, Inbox } from 'lucide-react';
import { getTodayString, toLocalISOString } from '../lib/utils';
import { PEOPLE, short } from '../lib/format';
import { Money, Segmented, SheetShell, StackTube } from './glass';

// ─── 各頁共用元件（3.0 玻璃版） ─────────────────────────────────────────────
// 原則：每頁最上面一張大玻璃卡放最重要的數字；清單是一組一組的玻璃清單，
// 點一列從下方浮出抽屜編輯；新增也用同一個抽屜。

// 切換年份（各頁共用）：最多到今年（未來的年份沒有資料）
export const YearSwitch = ({ year, onChange, suffix = '', max = new Date().getFullYear() }) => (
  <span className="inline-flex items-center gap-0.5 -ml-1.5">
    <button type="button" onClick={() => onChange(year - 1)} className="icon-btn !w-7 !h-7 text-slate-500" aria-label="前一年"><ChevronLeft className="w-4 h-4" strokeWidth={2.4} /></button>
    <span className="text-[13px] font-bold text-slate-600 tabular-nums">{year}{suffix}</span>
    <button type="button" onClick={() => year < max && onChange(year + 1)} disabled={year >= max} className="icon-btn !w-7 !h-7 text-slate-500" aria-label="下一年"><ChevronRight className="w-4 h-4" strokeWidth={2.4} /></button>
  </span>
);

// 頁首大玻璃卡：標籤、會數數的大數字、一行說明，下面可以再放圖或比例條（children）
// amount 給數字會有數數動畫；也可以用 value 直接給已排版好的內容
export const Hero = ({ label, value, amount, digits = 0, prefix = '$', sub, action, tone = '', tint = '', id, children }) => (
  <section className={`glass-card ${tint} p-5`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="eyebrow">{label}</div>
        <div className={`mt-1.5 truncate ${tone}`}>
          {amount !== undefined
            ? <Money value={amount} digits={digits} prefix={prefix} animate id={id} className={`text-[42px] leading-[1.05] ${tone ? '' : 'money-ink'}`} />
            : <span className="money text-[42px] leading-[1.05]">{value}</span>}
        </div>
        {sub && <div className="text-[13px] leading-snug text-slate-500 mt-2">{sub}</div>}
      </div>
      {action}
    </div>
    {children && <div className="mt-4">{children}</div>}
  </section>
);

// 頁首右上的主要操作（記收入、買入…）
export const HeroButton = ({ icon, label, onClick }) => (
  <button type="button" onClick={onClick} className="btn btn-ink shrink-0 pl-3 pr-3.5 py-2 text-[13px]">
    {icon && createElement(icon, { className: 'w-3.5 h-3.5', strokeWidth: 2.6 })}{label}
  </button>
);

export const Section = ({ title, extra, children, className = '' }) => (
  <section className={className}>
    <div className="flex items-center justify-between gap-3 px-1.5 mb-2.5 min-h-[26px]">
      <h3 className="sec-title min-w-0">{title}</h3>
      {extra}
    </div>
    {children}
  </section>
);

export const LinkButton = ({ children, onClick }) => (
  <button type="button" onClick={onClick} className="press text-[13px] font-semibold text-slate-500 flex items-center gap-0.5 px-1 py-0.5 rounded-lg">{children}</button>
);

// 區塊標題右邊的圓形「＋」
export const AddButton = ({ onClick, label }) => (
  <button type="button" onClick={onClick} className="icon-btn btn-glass !w-7 !h-7" aria-label={label}><Plus className="w-4 h-4" strokeWidth={2.6} /></button>
);

// 色點（圖例用）
export const Dot = ({ tone, className = '' }) => (
  <span className={`tone-${tone} inline-block w-2.5 h-2.5 rounded-full shrink-0 ${className}`} style={{ background: 'linear-gradient(150deg, var(--a), var(--b))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6), 0 2px 4px -1px var(--glow)' }} />
);

// 玻璃清單裡的一列。沒有 onClick 時用 div（裡面可以再放按鈕，例如「刪除」）
export const Row = ({ left, title, sub, right, rightSub, onClick, muted = false }) => createElement(
  onClick ? 'button' : 'div',
  { ...(onClick ? { type: 'button', onClick } : {}), className: 'row' },
  <>
    {left}
    <div className="flex-1 min-w-0">
      <div className={`text-[15px] leading-snug font-semibold truncate ${muted ? 'text-slate-400' : 'text-slate-800'}`}>{title}</div>
      {sub && <div className="text-xs text-slate-500 truncate mt-0.5">{sub}</div>}
    </div>
    <div className="text-right shrink-0">
      <div className={`font-num text-[15px] leading-snug tabular-nums font-bold ${muted ? 'text-slate-400' : 'text-slate-800'}`}>{right}</div>
      {rightSub && <div className="font-num text-xs tabular-nums font-semibold mt-0.5">{rightSub}</div>}
    </div>
  </>,
);

export const Divided = ({ children, className = '' }) => (
  <div className={`glass-card r-tile list ${className}`}>{children}</div>
);

export const Empty = ({ children }) => (
  <div className="flex flex-col items-center gap-2 text-center text-[13px] text-slate-400 py-8">
    <Inbox className="w-6 h-6 text-slate-300" strokeWidth={1.6} />
    <span>{children}</span>
  </div>
);

// 人像球：士＝藍、欣＝粉
export const PersonDot = ({ owner, size = 'w-9 h-9 text-sm' }) => {
  const who = owner === 'partner' ? 'partner' : 'myself';
  return <span className={`orb-icon ${who === 'partner' ? 'orb-her' : 'orb-me'} ${size} font-bold`}>{PEOPLE[who].short}</span>;
};

// 圖示球：tone＝emerald／indigo／amber／blue／rose／red／cyan／slate
export const IconDot = ({ icon, tone = 'slate', size = 'w-9 h-9' }) => (
  <span className={`orb-icon orb-${tone} ${size}`}>{createElement(icon, { className: 'w-[17px] h-[17px]', strokeWidth: 2 })}</span>
);

// 分段切換
export const Seg = ({ options, value, onChange, size = 'md' }) => (
  <Segmented options={options} value={value} onChange={onChange} size={size} />
);

// 一排可選的小籤（分類、帳戶…）
export const Chips = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(([k, label]) => (
      <button key={String(k)} type="button" onClick={() => onChange(k)} aria-pressed={value === k} className="chip">{label}</button>
    ))}
  </div>
);

export const PersonPick = ({ value, onChange }) => (
  <div className="grid grid-cols-2 gap-2.5">
    {Object.entries(PEOPLE).map(([k, p]) => {
      const on = value === k;
      return (
        <button key={k} type="button" onClick={() => onChange(k)} aria-pressed={on}
          className={`press flex items-center gap-2.5 p-2 pr-3 rounded-[20px] transition-all ${on ? `glass-card !rounded-[20px] ${p.tint}` : 'glass-well opacity-60'}`}>
          <PersonDot owner={k} size="w-8 h-8 text-[13px]" />
          <span className={`text-[15px] font-bold ${on ? p.text : 'text-slate-500'}`}>{p.name}</span>
        </button>
      );
    })}
  </div>
);

// 大字金額輸入（原生數字鍵盤，自動加千分位）
export const MoneyInput = ({ value, onChange, autoFocus, prefix = '$', placeholder = '0', decimals = false }) => {
  const shown = value === '' || value === null || value === undefined ? '' : (decimals ? String(value) : Number(value).toLocaleString());
  return (
    <div className="field flex items-baseline justify-end gap-1.5 !py-2.5 !px-4 !rounded-[20px]">
      <span className="font-num text-[22px] font-semibold text-slate-400">{prefix}</span>
      <input inputMode={decimals ? 'decimal' : 'numeric'} autoFocus={autoFocus} value={shown} placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.]/g, '');
          if (raw === '') return onChange('');
          if (decimals) return onChange(raw);
          const n = Number(raw.split('.')[0]);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="font-num text-[40px] leading-tight font-bold tracking-tight text-right text-slate-900 tabular-nums bg-transparent outline-none min-w-0 w-full" />
    </div>
  );
};

// 一般文字輸入
export const TextInput = ({ value, onChange, className = '', ...props }) => (
  <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...props} className={`field ${className}`} />
);

// 日期輸入（原生選擇器）
export const DateInput = ({ value, onChange }) => (
  <input type="date" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} className="field !w-auto tabular-nums font-num font-semibold" />
);

export const SmallInput = ({ label, suffix, ...props }) => (
  <label className="block min-w-0">
    {label && <span className="block eyebrow mb-1.5 truncate">{label}</span>}
    <span className="field field-row">
      <input {...props} className="tabular-nums font-num font-semibold text-slate-800" />
      {suffix && <span className="text-xs font-semibold text-slate-400">{suffix}</span>}
    </span>
  </label>
);

export const Field = ({ label, children }) => (
  <div>
    <div className="eyebrow mb-1.5">{label}</div>
    {children}
  </div>
);

// 今天／昨天＋日期選擇
export const DatePick = ({ value, onChange }) => {
  const today = getTodayString();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = toLocalISOString(y);
  const opts = [[today, '今天'], [yesterday, '昨天']];
  const custom = value !== today && value !== yesterday;
  return (
    <div className="flex items-center gap-2">
      {opts.map(([d, l]) => (
        <button key={d} type="button" onClick={() => onChange(d)} aria-pressed={value === d} className="chip">{l}</button>
      ))}
      <label className={`chip relative tabular-nums ${custom ? 'on' : ''}`}>
        {custom ? value.replace(/-/g, '/') : '其他日期'}
        <input type="date" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} className="absolute inset-0 opacity-0" />
      </label>
    </div>
  );
};

// 底部抽屜：把手＋標題列＋可捲內容＋固定底部按鈕；鍵盤出現時整張往上推
// 用 portal 掛到 body，z-[55]：比頁首、導覽高，但比確認刪除的對話框低。
export const Sheet = ({ title, onClose, children, onSubmit, submitLabel = '儲存', submitDisabled = false, onDelete, deleteLabel = '刪除' }) => createPortal(
  <SheetShell onClose={onClose}>
    <div className="flex items-center justify-between gap-3 pl-6 pr-4 pt-1 pb-3">
      <h3 className="text-[20px] font-bold tracking-tight text-slate-900 truncate">{title}</h3>
      <button type="button" onClick={onClose} className="icon-btn glass-well !w-8 !h-8 text-slate-500 shrink-0" aria-label="關閉"><X className="w-4 h-4" strokeWidth={2.6} /></button>
    </div>
    <div data-keep-scroll className="px-5 pb-4 overflow-y-auto space-y-4 flex-1 scrollbar-hide">{children}</div>
    {(onSubmit || onDelete) && (
      <div className="px-5 pt-1 pb-5 flex gap-2.5">
        {onDelete && (
          <button type="button" onClick={onDelete} className="btn btn-danger px-4 h-[52px] text-sm"><Trash2 className="w-4 h-4" />{deleteLabel}</button>
        )}
        {onSubmit && (
          <button type="button" onClick={onSubmit} disabled={submitDisabled} className="btn btn-ink flex-1 h-[52px] text-base min-w-0"><span className="truncate">{submitLabel}</span></button>
        )}
      </div>
    )}
  </SheetShell>,
  document.body,
);

// 一條橫向堆疊比例條：parts = [{ key, value, tone }]
export const StackBar = ({ parts, height = 10 }) => <StackTube parts={parts} height={height} />;

// 單調三次曲線（不會衝過資料點）
const smoothPath = (pts) => {
  const n = pts.length;
  if (n < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const dx = []; const m = []; const t = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / (dx[i] || 1); }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i]; const b = t[i + 1] / m[i]; const s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + t[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(pts[i + 1][1] - t[i + 1] * h).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
};

// 折線（面積）圖：points = [{ x: label, y }]；線會「畫」出來，最後一點有光暈
export const LineChart = ({ points, height = 132, color = '#5F7FA3', color2, formatY = short, highlightLast = true, baseline = null }) => {
  const uid = useId().replace(/:/g, '');
  if (!points || points.length < 2) return <div className="text-[13px] text-slate-400 text-center py-9">累積兩筆以上紀錄後顯示趨勢</div>;
  const W = 320; const H = height; const padT = 18; const padB = 20;
  const ys = points.map((p) => p.y);
  const lo = Math.min(...ys, baseline ?? Infinity); const hi = Math.max(...ys, baseline ?? -Infinity);
  const range = hi - lo || 1;
  const X = (i) => 6 + (i / (points.length - 1)) * (W - 12);
  const Y = (v) => padT + (1 - (v - lo) / range) * (H - padT - padB);
  const xy = points.map((p, i) => [X(i), Y(p.y)]);
  const line = smoothPath(xy);
  const area = `${line} L${X(points.length - 1).toFixed(1)},${H - padB} L${X(0).toFixed(1)},${H - padB} Z`;
  const last = points[points.length - 1];
  const [lx, ly] = xy[xy.length - 1];
  const c2 = color2 || color;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height }} role="img">
      <defs>
        <linearGradient id={`a${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient>
        <linearGradient id={`l${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={c2} stopOpacity="0.55" /><stop offset="100%" stopColor={color} /></linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={padT + f * (H - padT - padB)} y2={padT + f * (H - padT - padB)} className="chart-grid" strokeWidth="1" strokeDasharray="2 5" />)}
      {baseline !== null && <line x1="0" x2={W} y1={Y(baseline)} y2={Y(baseline)} stroke="#9E9A93" strokeDasharray="3 3" strokeWidth="1" />}
      <path d={area} fill={`url(#a${uid})`} className="fade-up" style={{ animationDelay: '0.35s', animationDuration: '0.9s' }} />
      <path d={line} fill="none" stroke={color} strokeOpacity="0.28" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" pathLength="1" style={{ strokeDasharray: 1, '--len': 1, animation: 'draw 1.3s var(--ease-out) backwards', filter: 'blur(4px)' }} />
      <path d={line} fill="none" stroke={`url(#l${uid})`} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" pathLength="1" style={{ strokeDasharray: 1, '--len': 1, animation: 'draw 1.3s var(--ease-out) backwards' }} />
      {highlightLast && (
        <g className="pop" style={{ animationDelay: '1.05s', transformOrigin: `${lx}px ${ly}px` }}>
          <circle cx={lx} cy={ly} r="9" fill={color} opacity="0.2" style={{ transformOrigin: `${lx}px ${ly}px`, animation: 'breathe 2.6s ease-in-out infinite' }} />
          <circle cx={lx} cy={ly} r="4.5" fill="#fff" stroke={color} strokeWidth="2.6" />
        </g>
      )}
      <text x="6" y={H - 5} fontSize="10.5" fontWeight="600" fill="#9E9A93">{points[0].x}</text>
      <text x={W - 6} y={H - 5} fontSize="10.5" fontWeight="600" fill="#9E9A93" textAnchor="end">{last.x}</text>
      <text x="6" y="11" fontSize="10.5" fontWeight="600" fill="#9E9A93">最高 {formatY(hi)}</text>
    </svg>
  );
};
