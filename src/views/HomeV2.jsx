import { createElement, useMemo, useState } from 'react';
import { Sun, Moon, Users, Minus, ChevronRight } from 'lucide-react';
import { GLASS_CARD } from '../lib/constants';
import { getTodayString, toLocalISOString } from '../lib/utils';
import { makeFixedMatcher, bucketOf, budgetPlan, yearByMonth } from '../lib/budget';
import { mealStatusFor, isNoSpend } from '../lib/meals';

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;
const PEOPLE = [
  { key: 'myself', name: '士程', dot: 'bg-blue-400', text: 'text-blue-700', soft: 'bg-blue-50' },
  { key: 'partner', name: '佳欣', dot: 'bg-rose-400', text: 'text-rose-700', soft: 'bg-rose-50' },
];
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

const MealPill = ({ label, icon: Icon, status }) => {
  const look = {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    nospend: 'bg-slate-50 text-slate-500 border-dashed border-slate-300',
    together: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  }[status] || 'bg-white text-slate-300 border-slate-200';
  const text = { paid: '有記', nospend: '沒花', together: '一起' }[status] || '未記';
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${look}`}>
      {createElement(Icon, { className: "w-3 h-3" })}{label}<span className="opacity-70">{text}</span>
    </span>
  );
};

// 2.0 總覽：照「多常看」由上往下排 —
// 本月還能花多少 → 今天兩個人記了什麼、每餐有沒有交代 → 這週 → 今年
const HomeV2 = ({ transactions, settings, flexMonthly, selectedDate, onOpenDay, onOpenBudget, onEdit }) => {
  const [dayMode, setDayMode] = useState(0); // 0 今天、1 昨天
  const isFixed = useMemo(() => makeFixedMatcher(settings), [settings]);
  const plan = useMemo(() => budgetPlan(settings, flexMonthly), [settings, flexMonthly]);

  const year = selectedDate.getFullYear();
  const monthIdx = selectedDate.getMonth();
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && monthIdx === now.getMonth();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const dayOfMonth = isCurrentMonth ? now.getDate() : daysInMonth;

  const months = useMemo(() => yearByMonth(transactions, year, isFixed), [transactions, year, isFixed]);
  const mb = months[monthIdx];
  const flexLeft = plan.flex - mb.flex;
  const pace = mb.flex / dayOfMonth * daysInMonth;
  const spentPct = Math.min(100, (mb.flex / plan.flex) * 100);
  const timePct = (dayOfMonth / daysInMonth) * 100;

  // ── 今天／昨天
  const dayStr = (() => { const d = new Date(); d.setDate(d.getDate() - dayMode); return toLocalISOString(d); })();
  const dayTx = useMemo(() => transactions.filter((t) => t.date === dayStr), [transactions, dayStr]);

  // ── 這週（最近 7 天，到今天為止）
  const week = useMemo(() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = toLocalISOString(d);
      const list = transactions.filter((t) => t.date === ds);
      out.push({
        ds, wd: WEEK[d.getDay()], day: d.getDate(),
        flex: list.filter((t) => bucketOf(t, isFixed) === 'flex').reduce((s, t) => s + (Number(t.amount) || 0), 0),
        who: { myself: list.some((t) => t.payer !== 'partner'), partner: list.some((t) => t.payer === 'partner') },
        isToday: ds === getTodayString(),
      });
    }
    return out;
  }, [transactions, isFixed]);
  const weekMax = Math.max(1, ...week.map((d) => d.flex));
  const weekTotal = week.reduce((s, d) => s + d.flex, 0);

  // ── 今年
  const ytd = months.reduce((a, m) => ({ fixed: a.fixed + m.fixed, flex: a.flex + m.flex, annual: a.annual + m.annual }), { fixed: 0, flex: 0, annual: 0 });
  const ytdTotal = ytd.fixed + ytd.flex + ytd.annual;
  const bucketRows = [
    { key: 'fixed', label: '固定', used: ytd.fixed, budget: plan.fixed * 12, bar: 'bg-indigo-400' },
    { key: 'flex', label: '彈性', used: ytd.flex, budget: plan.flex * 12, bar: 'bg-emerald-400' },
    { key: 'annual', label: '年度', used: ytd.annual, budget: plan.annual, bar: 'bg-amber-400' },
  ];

  return (
    <div className="space-y-7 pb-24 animate-in fade-in duration-500">
      {/* ── 本月還能花（直接寫在紙上，不放卡片） */}
      <section className="px-1 pt-1">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold text-slate-500">{isCurrentMonth ? '本月還能花' : `${monthIdx + 1} 月彈性結餘`}</span>
          <button type="button" onClick={onOpenBudget} className="text-xs text-slate-400 flex items-center gap-0.5">彈性額度 {fmt(plan.flex)}<ChevronRight className="w-3 h-3" /></button>
        </div>
        <div className={`font-num text-5xl leading-tight mt-1 ${flexLeft < 0 ? 'text-rose-700' : 'text-slate-800'}`}>
          {flexLeft < 0 ? '−' : ''}{fmt(Math.abs(flexLeft))}
        </div>
        <div className="relative mt-3 h-2 rounded-full bg-slate-200/70 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${flexLeft < 0 ? 'bg-rose-400' : spentPct > timePct + 8 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${spentPct}%` }} />
        </div>
        {isCurrentMonth && (
          <div className="relative h-0">
            <span className="absolute -top-3 w-px h-3 bg-slate-500/60" style={{ left: `${timePct}%` }} />
          </div>
        )}
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>已花 <b className="text-slate-700 tabular-nums">{fmt(mb.flex)}</b>{isCurrentMonth && <span className="text-slate-400 ml-2">{dayOfMonth}/{daysInMonth} 天</span>}</span>
          {isCurrentMonth && <span className={pace > plan.flex ? 'text-rose-700 font-bold' : ''}>照這速度月底約 {fmt(pace)}</span>}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">本月另有固定 {fmt(mb.fixed)}{mb.annual > 0 ? `、年度 ${fmt(mb.annual)}` : ''}（不算在彈性裡）</div>
      </section>

      {/* ── 今天：兩個人、每一餐 */}
      <section className={`${GLASS_CARD} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-800">{dayMode === 0 ? '今天' : '昨天'}<span className="ml-2 text-xs font-normal text-slate-400" style={{ fontFamily: 'var(--font-sans)' }}>{Number(dayStr.slice(5, 7))}/{Number(dayStr.slice(8, 10))}</span></h3>
          <div className="flex bg-slate-100 rounded-full p-0.5">
            {['今天', '昨天'].map((l, i) => (
              <button key={l} type="button" onClick={() => setDayMode(i)} className={`px-3 py-0.5 rounded-full text-xs font-bold ${dayMode === i ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {PEOPLE.map((p) => {
            const mine = dayTx.filter((t) => (t.payer === 'partner' ? 'partner' : 'myself') === p.key);
            const st = mealStatusFor(dayTx, p.key);
            const total = mine.reduce((s, t) => s + (Number(t.amount) || 0), 0);
            return (
              <div key={p.key} className="min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-sm font-bold ${p.text} flex items-center gap-1.5`}><span className={`w-2 h-2 rounded-full ${p.dot}`} />{p.name}</span>
                  <span className="text-sm font-bold text-slate-700 tabular-nums">{fmt(total)}</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  <MealPill label="午" icon={Sun} status={st.lunch} />
                  <MealPill label="晚" icon={st.dinner === 'together' ? Users : Moon} status={st.dinner} />
                </div>
                <div className="space-y-1">
                  {mine.length === 0 && <div className="text-xs text-slate-300 py-1">還沒有紀錄</div>}
                  {mine.slice(0, 4).map((t) => (
                    <button key={t.id} type="button" onClick={() => onEdit && onEdit(t)} className={`w-full flex items-center justify-between gap-1 text-xs rounded-lg px-2 py-1 ${p.soft}`}>
                      <span className="truncate text-slate-600">{isNoSpend(t) ? <span className="flex items-center gap-1"><Minus className="w-3 h-3" />{t.note}</span> : t.note || t.category}</span>
                      <span className="tabular-nums text-slate-500 shrink-0">{fmt(Number(t.amount) || 0)}</span>
                    </button>
                  ))}
                  {mine.length > 4 && <button type="button" onClick={() => onOpenDay(dayStr)} className="text-[11px] text-slate-400 pl-2">還有 {mine.length - 4} 筆</button>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 這週 */}
      <section>
        <div className="flex items-baseline justify-between px-1 mb-2">
          <h3 className="text-base font-bold text-slate-800">這週</h3>
          <span className="text-xs text-slate-400">近 7 天彈性支出 <b className="text-slate-600 tabular-nums">{fmt(weekTotal)}</b></span>
        </div>
        <div className={`${GLASS_CARD} px-3 pt-4 pb-3`}>
          <div className="grid grid-cols-7 gap-1.5 items-end h-28">
            {week.map((d) => (
              <button key={d.ds} type="button" onClick={() => onOpenDay(d.ds)} className="flex flex-col items-center justify-end h-full gap-1">
                <span className="text-[10px] text-slate-400 tabular-nums">{d.flex ? (d.flex >= 1000 ? `${(d.flex / 1000).toFixed(1)}k` : d.flex) : ''}</span>
                <span className={`w-full rounded-md ${d.isToday ? 'bg-emerald-400' : 'bg-emerald-200'}`} style={{ height: `${Math.max(4, (d.flex / weekMax) * 64)}px` }} />
              </button>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5 mt-1.5">
            {week.map((d) => (
              <div key={d.ds} className="flex flex-col items-center gap-1">
                <span className={`text-[11px] font-bold ${d.isToday ? 'text-slate-800' : 'text-slate-400'}`}>{d.wd}</span>
                <span className="flex gap-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${d.who.myself ? 'bg-blue-400' : 'bg-slate-200'}`} />
                  <span className={`w-1.5 h-1.5 rounded-full ${d.who.partner ? 'bg-rose-400' : 'bg-slate-200'}`} />
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" />士程有記帳</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />佳欣有記帳</span>
          </div>
        </div>
      </section>

      {/* ── 今年 */}
      <section>
        <div className="flex items-baseline justify-between px-1 mb-2">
          <h3 className="text-base font-bold text-slate-800">{year} 年</h3>
          <button type="button" onClick={onOpenBudget} className="text-xs text-slate-400 flex items-center gap-0.5">預算設定<ChevronRight className="w-3 h-3" /></button>
        </div>
        <div className={`${GLASS_CARD} p-4`}>
          <div className="flex items-baseline justify-between">
            <span className="font-num text-2xl text-slate-800">{fmt(ytdTotal)}</span>
            <span className="text-xs text-slate-400">/ {fmt(plan.yearTotal)} {plan.yearTotal > 0 ? Math.round((ytdTotal / plan.yearTotal) * 100) : 0}%</span>
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
            {bucketRows.map((b) => (
              <span key={b.key} className={`${b.bar} h-full`} style={{ width: `${plan.yearTotal ? Math.min(100, (b.used / plan.yearTotal) * 100) : 0}%` }} />
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {bucketRows.map((b) => (
              <div key={b.key} className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-sm ${b.bar}`} />
                <span className="w-8 font-bold text-slate-600">{b.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${b.bar} ${b.used > b.budget ? 'opacity-100' : 'opacity-80'}`} style={{ width: `${b.budget ? Math.min(100, (b.used / b.budget) * 100) : 0}%` }} /></div>
                <span className={`tabular-nums w-[9.5rem] text-right ${b.used > b.budget ? 'text-rose-700 font-bold' : 'text-slate-500'}`}>{fmt(b.used)} / {fmt(b.budget)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeV2;
