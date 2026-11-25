import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GLASS_CARD } from '../lib/constants';
import { makeFixedMatcher, budgetPlan, yearByMonth, bucketOf } from '../lib/budget';
import CategoryIcon from '../components/CategoryIcon';

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;
const k = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));
const BUCKETS = [
  { key: 'fixed', label: '固定', bar: 'bg-indigo-300' },
  { key: 'flex', label: '彈性', bar: 'bg-emerald-300' },
  { key: 'annual', label: '年度', bar: 'bg-amber-300' },
];

// 2.0 分析頁上半：每月三色長條、兩人比例、今年分類排行
const BucketAnalysis = ({ transactions, settings, flexMonthly, onRequestHistory }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [selMonth, setSelMonth] = useState(null);
  const isFixed = useMemo(() => makeFixedMatcher(settings), [settings]);
  const plan = budgetPlan(settings, flexMonthly);
  const months = useMemo(() => yearByMonth(transactions, year, isFixed), [transactions, year, isFixed]);
  const max = Math.max(1, ...months.map((m) => m.fixed + m.flex + m.annual), plan.fixed + plan.flex);
  const flexLine = ((plan.fixed + plan.flex) / max) * 100;

  const yearTx = useMemo(() => transactions.filter((t) => String(t.date || '').startsWith(`${year}-`) && (selMonth === null || Number(String(t.date).slice(5, 7)) - 1 === selMonth)), [transactions, year, selMonth]);
  const people = useMemo(() => {
    const r = { myself: { sum: 0, n: 0 }, partner: { sum: 0, n: 0 } };
    for (const t of yearTx) { const p = t.payer === 'partner' ? 'partner' : 'myself'; r[p].sum += Number(t.amount) || 0; r[p].n++; }
    return r;
  }, [yearTx]);
  const peopleTotal = people.myself.sum + people.partner.sum;
  const cats = useMemo(() => {
    const m = new Map();
    for (const t of yearTx) {
      const key = `${t.type}|${t.group}|${t.category}`;
      const e = m.get(key) || { type: t.type, group: t.group, category: t.category, sum: 0, n: 0, bucket: bucketOf(t, isFixed) };
      e.sum += Number(t.amount) || 0; e.n++;
      m.set(key, e);
    }
    return [...m.values()].sort((a, b) => b.sum - a.sum).slice(0, 8);
  }, [yearTx, isFixed]);
  const catMax = Math.max(1, ...cats.map((c) => c.sum));
  const scopeLabel = selMonth === null ? `${year} 年` : `${year} 年 ${selMonth + 1} 月`;

  const go = (d) => { const ny = year + d; setYear(ny); setSelMonth(null); onRequestHistory && onRequestHistory(ny); };

  return (
    <div className="space-y-4">
      <section className={`${GLASS_CARD} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-800">每月支出</h3>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => go(-1)} className="p-1 rounded-full hover:bg-slate-100 text-slate-500" aria-label="前一年"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-bold text-slate-700 tabular-nums">{year}</span>
            <button type="button" onClick={() => go(1)} className="p-1 rounded-full hover:bg-slate-100 text-slate-500" aria-label="下一年"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-slate-500" />每月預算：固定＋彈性 {k(plan.fixed + plan.flex)}</div>
        <div className="relative h-40">
          <div className="absolute left-0 right-0 z-10 border-t border-dashed border-slate-500/70 pointer-events-none" style={{ bottom: `${flexLine}%` }} />
          <div className="absolute inset-0 grid grid-cols-12 gap-1 items-end">
            {months.map((m, i) => {
              const total = m.fixed + m.flex + m.annual;
              const on = selMonth === null || selMonth === i;
              return (
                <button key={i} type="button" onClick={() => setSelMonth(selMonth === i ? null : i)} className={`flex flex-col-reverse h-full justify-start transition-opacity ${on ? '' : 'opacity-35'}`} aria-label={`${i + 1} 月 ${fmt(total)}`}>
                  {BUCKETS.map((b) => <span key={b.key} className={`${b.bar} w-full first:rounded-b-sm last:rounded-t-sm`} style={{ height: `${(m[b.key] / max) * 100}%` }} />)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-12 gap-1 mt-1">
          {months.map((m, i) => <span key={i} className={`text-center text-[9px] tabular-nums ${selMonth === i ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>{i + 1}</span>)}
        </div>
        <div className="flex justify-center gap-4 mt-2 text-[11px] text-slate-500">
          {BUCKETS.map((b) => <span key={b.key} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-sm ${b.bar}`} />{b.label}</span>)}
        </div>
        {selMonth !== null && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 text-center">
            {BUCKETS.map((b) => <div key={b.key}><div className="text-[11px] text-slate-400">{b.label}</div><div className="text-sm font-bold tabular-nums text-slate-700">{fmt(months[selMonth][b.key])}</div></div>)}
          </div>
        )}
        <p className="text-[11px] text-slate-400 mt-2 text-center">點長條只看那個月；年度支出（枯色）集中在某個月是正常的，不代表那個月超支。</p>
      </section>

      <section className={`${GLASS_CARD} p-4`}>
        <h3 className="text-base font-bold text-slate-800 mb-3">兩個人<span className="ml-2 text-xs font-normal text-slate-400" style={{ fontFamily: 'var(--font-sans)' }}>{scopeLabel}</span></h3>
        <div className="h-3 rounded-full overflow-hidden flex bg-slate-100">
          <span className="bg-blue-300 h-full" style={{ width: `${peopleTotal ? (people.myself.sum / peopleTotal) * 100 : 50}%` }} />
          <span className="bg-rose-300 h-full flex-1" />
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-blue-700"><b>士程</b> {fmt(people.myself.sum)}・{people.myself.n} 筆</span>
          <span className="text-rose-700"><b>佳欣</b> {fmt(people.partner.sum)}・{people.partner.n} 筆</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">依記帳人計算（誰記的就算誰的），固定支出多半記在士程名下。</p>
      </section>

      <section className={`${GLASS_CARD} p-4`}>
        <h3 className="text-base font-bold text-slate-800 mb-3">花最多的分類<span className="ml-2 text-xs font-normal text-slate-400" style={{ fontFamily: 'var(--font-sans)' }}>{scopeLabel}</span></h3>
        <div className="space-y-2.5">
          {cats.map((c) => (
            <div key={`${c.type}|${c.group}|${c.category}`} className="flex items-center gap-2.5">
              <CategoryIcon category={c.category} group={c.group} type={c.type} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm"><span className="text-slate-700 truncate">{c.category}</span><span className="tabular-nums text-slate-700">{fmt(c.sum)}</span></div>
                <div className="h-1.5 mt-1 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${BUCKETS.find((b) => b.key === c.bucket).bar}`} style={{ width: `${(c.sum / catMax) * 100}%` }} /></div>
              </div>
            </div>
          ))}
          {cats.length === 0 && <div className="text-sm text-slate-400 text-center py-4">沒有資料</div>}
        </div>
      </section>
    </div>
  );
};

export default BucketAnalysis;
