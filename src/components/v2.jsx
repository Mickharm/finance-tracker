import { createElement, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTodayString, toLocalISOString } from '../lib/utils';
import { PEOPLE, short } from '../lib/format';

// ─── 2.0 共用小元件：收入、資產各頁統一的版型與操作 ─────────────────────────
// 原則：重點數字直接寫在紙上（不包卡片）；一頁一張圖；清單是一列一列，
// 點一列就從下方拉出抽屜編輯；新增也用同一個抽屜。

// 切換年份（各頁共用）：按鈕夠大好點；最多到今年（未來的年份沒有資料）
export const YearSwitch = ({ year, onChange, suffix = '', max = new Date().getFullYear() }) => (
  <span className="inline-flex items-center -ml-2">
    <button type="button" onClick={() => onChange(year - 1)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 active:bg-slate-100" aria-label="前一年"><ChevronLeft className="w-4 h-4" /></button>
    <span className="text-sm font-bold text-slate-700 tabular-nums">{year}{suffix}</span>
    <button type="button" onClick={() => year < max && onChange(year + 1)} disabled={year >= max}
      className={`w-8 h-8 flex items-center justify-center rounded-full active:bg-slate-100 ${year >= max ? 'text-slate-200' : 'text-slate-500'}`} aria-label="下一年"><ChevronRight className="w-4 h-4" /></button>
  </span>
);

// 頁首大數字
export const Hero = ({ label, value, sub, action, tone = 'text-slate-800' }) => (
  <section className="px-1 pt-1">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-400 tracking-wide">{label}</div>
        <div className={`font-num text-[38px] leading-tight tabular-nums mt-0.5 truncate ${tone}`}>{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
      {action}
    </div>
  </section>
);

// 頁首右上的主要操作（記一筆收入、存入…）
export const HeroButton = ({ icon, label, onClick, tone = 'bg-slate-800 text-white' }) => (
  <button type="button" onClick={onClick} className={`shrink-0 mt-1 flex items-center gap-1 pl-3 pr-3.5 py-2 rounded-full text-xs font-bold shadow-sm active:scale-95 transition-transform ${tone}`}>
    {icon && createElement(icon, { className: 'w-3.5 h-3.5' })}{label}
  </button>
);

export const Section = ({ title, extra, children, className = '' }) => (
  <section className={className}>
    <div className="flex items-baseline justify-between px-1 mb-2">
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      {extra}
    </div>
    {children}
  </section>
);

export const LinkButton = ({ children, onClick }) => (
  <button type="button" onClick={onClick} className="text-xs font-bold text-slate-500 flex items-center gap-0.5 px-1 py-0.5 rounded hover:text-slate-700">{children}</button>
);

// 紙卡裡的一列
// 沒有 onClick 時用 div（裡面可以再放按鈕，例如「刪除」）
export const Row = ({ left, title, sub, right, rightSub, onClick, muted = false }) => createElement(
  onClick ? 'button' : 'div',
  {
    ...(onClick ? { type: 'button', onClick } : {}),
    className: `w-full flex items-center gap-3 px-3 py-2.5 text-left ${onClick ? 'active:bg-slate-50 hover:bg-slate-50/70' : ''} transition-colors`,
  },
  <>
    {left}
    <div className="flex-1 min-w-0">
      <div className={`text-sm font-bold truncate ${muted ? 'text-slate-400' : 'text-slate-700'}`}>{title}</div>
      {sub && <div className="text-[11px] text-slate-400 truncate">{sub}</div>}
    </div>
    <div className="text-right shrink-0">
      <div className={`text-sm tabular-nums font-bold ${muted ? 'text-slate-400' : 'text-slate-700'}`}>{right}</div>
      {rightSub && <div className="text-[11px] tabular-nums">{rightSub}</div>}
    </div>
  </>,
);

export const Divided = ({ children, className = '' }) => (
  <div className={`glass-card-fx border rounded-2xl divide-y divide-slate-100 overflow-hidden ${className}`}>{children}</div>
);

export const Empty = ({ children }) => <div className="text-center text-sm text-slate-400 py-8">{children}</div>;

export const PersonDot = ({ owner }) => (
  <span className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-xs font-bold ${owner === 'partner' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>{PEOPLE[owner === 'partner' ? 'partner' : 'myself'].short}</span>
);

export const IconDot = ({ icon, tone = 'bg-slate-100 text-slate-500' }) => (
  <span className={`w-7 h-7 shrink-0 rounded-full grid place-items-center ${tone}`}>{createElement(icon, { className: 'w-3.5 h-3.5' })}</span>
);

// 分段切換
export const Seg = ({ options, value, onChange, size = 'sm' }) => (
  <div className="flex bg-slate-100 rounded-full p-0.5">
    {options.map(([k, label]) => (
      <button key={String(k)} type="button" onClick={() => onChange(k)} aria-pressed={value === k}
        className={`flex-1 ${size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm'} rounded-full font-bold transition-all whitespace-nowrap px-2 ${value === k ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>{label}</button>
    ))}
  </div>
);

// 一排可選的小籤（分類、帳戶…）
export const Chips = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(([k, label]) => (
      <button key={String(k)} type="button" onClick={() => onChange(k)}
        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95 ${value === k ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>{label}</button>
    ))}
  </div>
);

export const PersonPick = ({ value, onChange }) => (
  <div className="flex gap-2">
    {Object.entries(PEOPLE).map(([k, p]) => (
      <button key={k} type="button" onClick={() => onChange(k)}
        className={`flex-1 py-2 rounded-2xl border text-sm font-bold transition-all ${value === k ? p.on : 'bg-white border-slate-200 text-slate-400'}`}>{p.name}</button>
    ))}
  </div>
);

// 大字金額輸入（原生數字鍵盤，自動加千分位）
export const MoneyInput = ({ value, onChange, autoFocus, prefix = '$', placeholder = '0', decimals = false }) => {
  const shown = value === '' || value === null || value === undefined ? '' : (decimals ? String(value) : Number(value).toLocaleString());
  return (
    <div className="flex items-baseline justify-end gap-1 border-b-2 border-slate-200 focus-within:border-slate-500 transition-colors pb-1">
      <span className="font-num text-2xl text-slate-400">{prefix}</span>
      <input inputMode={decimals ? 'decimal' : 'numeric'} autoFocus={autoFocus} value={shown} placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.]/g, '');
          if (raw === '') return onChange('');
          if (decimals) return onChange(raw);
          const n = Number(raw.split('.')[0]);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="font-num text-[38px] leading-tight text-right text-slate-800 tabular-nums bg-transparent outline-none min-w-0 w-full" />
    </div>
  );
};

export const SmallInput = ({ label, suffix, ...props }) => (
  <label className="block">
    {label && <span className="block text-[11px] font-bold text-slate-400 mb-1">{label}</span>}
    <span className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-3 focus-within:border-slate-400">
      <input {...props} className="flex-1 min-w-0 py-2.5 bg-transparent outline-none text-sm tabular-nums text-slate-700" />
      {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
    </span>
  </label>
);

export const Field = ({ label, children }) => (
  <div>
    <div className="text-[11px] font-bold text-slate-400 mb-1.5">{label}</div>
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
    <div className="flex items-center gap-1.5">
      {opts.map(([d, l]) => (
        <button key={d} type="button" onClick={() => onChange(d)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border ${value === d ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>{l}</button>
      ))}
      <label className={`relative px-3 py-1.5 rounded-full text-xs font-bold border tabular-nums ${custom ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>
        {custom ? value.replace(/-/g, '/') : '其他日期'}
        <input type="date" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} className="absolute inset-0 opacity-0" />
      </label>
    </div>
  );
};

// 底部抽屜：標題列＋可捲內容＋固定底部按鈕；鍵盤出現時整張往上推
export const Sheet = ({ title, onClose, children, onSubmit, submitLabel = '儲存', submitDisabled = false, onDelete, deleteLabel = '刪除' }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const vv = window.visualViewport;
    if (!el || !vv) return undefined;
    const onResize = () => {
      const kb = window.innerHeight - vv.height - vv.offsetTop;
      el.style.marginBottom = kb > 50 ? `${kb}px` : '';
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);
  // 用 portal 掛到 body：<main> 自成一層（z-10），抽屜放在裡面會被頁首、底部導覽蓋住。
  // z-[55]：比頁首、導覽高，但比確認刪除的對話框（z-60）低。
  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-end justify-center">
      <div className="absolute inset-0 bg-slate-900/30 animate-in fade-in duration-200" onClick={onClose} />
      <div ref={ref} className="relative w-full max-w-md bg-[#FDFDFB] rounded-t-[28px] shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 -mr-1.5 rounded-full text-slate-400 hover:bg-slate-100" aria-label="關閉"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 pb-3 overflow-y-auto space-y-4 flex-1">{children}</div>
        {(onSubmit || onDelete) && (
          <div className="px-5 pt-2 flex gap-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {onDelete && (
              <button type="button" onClick={onDelete} className="px-4 py-3.5 rounded-2xl border border-rose-200 text-rose-600 text-sm font-bold flex items-center gap-1 active:scale-95"><Trash2 className="w-4 h-4" />{deleteLabel}</button>
            )}
            {onSubmit && (
              <button type="button" onClick={onSubmit} disabled={submitDisabled}
                className="flex-1 py-3.5 rounded-2xl bg-slate-800 text-white text-base font-bold disabled:bg-slate-200 disabled:text-slate-400 active:scale-[0.98] transition-transform">{submitLabel}</button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

// 一條橫向堆疊比例條
export const StackBar = ({ parts, height = 'h-3' }) => {
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0);
  return (
    <div className={`${height} rounded-full overflow-hidden flex bg-slate-100`}>
      {total > 0 && parts.map((p) => <span key={p.key} className={`${p.bar} h-full`} style={{ width: `${(Math.max(0, p.value) / total) * 100}%` }} />)}
    </div>
  );
};

// 折線（面積）圖：points = [{ x: label, y }]；可標一個「現在」點
export const LineChart = ({ points, height = 120, color = '#557AA3', formatY = short, highlightLast = true, baseline = null }) => {
  if (!points || points.length < 2) return <div className="text-xs text-slate-400 text-center py-8">累積兩筆以上紀錄後顯示趨勢</div>;
  const W = 320; const H = height; const padT = 14; const padB = 18;
  const ys = points.map((p) => p.y);
  const lo = Math.min(...ys, baseline ?? Infinity); const hi = Math.max(...ys, baseline ?? -Infinity);
  const range = hi - lo || 1;
  const X = (i) => 4 + (i / (points.length - 1)) * (W - 8);
  const Y = (v) => padT + (1 - (v - lo) / range) * (H - padT - padB);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const area = `${line} L${X(points.length - 1)},${H - padB} L${X(0)},${H - padB} Z`;
  const gid = `g${color.replace('#', '')}`;
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.22" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {baseline !== null && <line x1="0" x2={W} y1={Y(baseline)} y2={Y(baseline)} stroke="#B9B6AE" strokeDasharray="3 3" strokeWidth="1" />}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {highlightLast && <circle cx={X(points.length - 1)} cy={Y(last.y)} r="3.5" fill={color} stroke="#FDFDFB" strokeWidth="1.5" />}
      <text x="4" y={H - 4} fontSize="10" fill="#9C9690">{points[0].x}</text>
      <text x={W - 4} y={H - 4} fontSize="10" fill="#9C9690" textAnchor="end">{last.x}</text>
      <text x={W - 4} y="10" fontSize="10" fill="#9C9690" textAnchor="end">{formatY(hi)}</text>
    </svg>
  );
};
