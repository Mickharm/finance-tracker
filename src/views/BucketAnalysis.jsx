import { useMemo, useState } from 'react';
import { YearSwitch, PersonDot, Dot, Empty } from '../components/v2';
import { Money, StackTube, Tube } from '../components/glass';
import { makeFixedMatcher, budgetPlan, yearByMonth, bucketOf } from '../lib/budget';
import CategoryIcon from '../components/CategoryIcon';

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;
const k = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));
const BUCKETS = [
  { key: 'fixed', label: '固定', tone: 'indigo' },
  { key: 'flex', label: '彈性', tone: 'emerald' },
  { key: 'annual', label: '年度', tone: 'amber' },
];
const TONE_OF = { fixed: 'indigo', flex: 'emerald', annual: 'amber' };

// 3.0 分析（支出）：每月三色長條（點月份篩選）、兩人比例、分類排行
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
      const key = `${t.type}|${t.category}`;
      const e = m.get(key) || { type: t.type, group: t.group, category: t.category, sum: 0, n: 0, bucket: bucketOf(t, isFixed) };
      e.sum += Number(t.amount) || 0; e.n++;
      m.set(key, e);
    }
    return [...m.values()].sort((a, b) => b.sum - a.sum).slice(0, 8);
  }, [yearTx, isFixed]);
  const catMax = Math.max(1, ...cats.map((c) => c.sum));
  const scopeLabel = selMonth === null ? `${year} 年` : `${year} 年 ${selMonth + 1} 月`;
  const scope = selMonth === null
    ? months.reduce((a, m) => ({ fixed: a.fixed + m.fixed, flex: a.flex + m.flex, annual: a.annual + m.annual }), { fixed: 0, flex: 0, annual: 0 })
    : months[selMonth];
  const scopeTotal = scope.fixed + scope.flex + scope.annual;

  const go = (d) => { const ny = year + d; setYear(ny); setSelMonth(null); onRequestHistory && onRequestHistory(ny); };

  return (
    <div className="space-y-4 stagger">
      <section className="glass-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow flex items-center"><YearSwitch year={year} onChange={(ny) => go(ny - year)} suffix={selMonth === null ? ' 年支出' : ` 年 ${selMonth + 1} 月支出`} /></div>
            <div className="mt-1"><Money value={scopeTotal} animate id="analysis-total" className="text-[42px] leading-[1.05] money-ink" /></div>
          </div>
          {selMonth !== null && <button type="button" onClick={() => setSelMonth(null)} className="chip chip-sm shrink-0 mt-1">看全年</button>}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {BUCKETS.map((b) => (
            <div key={b.key} className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><Dot tone={b.tone} className="!w-2 !h-2" />{b.label}</div>
              <div className="font-num text-[17px] font-bold tabular-nums text-slate-800 mt-0.5 truncate">{fmt(scope[b.key])}</div>
            </div>
          ))}
        </div>

        <div className="relative h-44 mt-5">
          <div className="absolute left-0 right-0 z-10 border-t-[1.5px] border-dashed border-slate-600/55 pointer-events-none" style={{ bottom: `${flexLine}%` }} />
          <div className="absolute inset-0 grid grid-cols-12 gap-[5px] items-end">
            {months.map((m, i) => {
              const total = m.fixed + m.flex + m.annual;
              const on = selMonth === null || selMonth === i;
              return (
                <button key={i} type="button" onClick={() => setSelMonth(selMonth === i ? null : i)} className={`relative h-full flex items-end transition-opacity duration-300 ${on ? '' : 'opacity-30'}`} aria-label={`${i + 1} 月 ${fmt(total)}`} aria-pressed={selMonth === i}>
                  <span className="grow-y w-full flex flex-col-reverse overflow-hidden rounded-[7px]" style={{ height: `${(total / max) * 100}%`, '--i': i, transformOrigin: '50% 100%', boxShadow: selMonth === i ? '0 8px 16px -6px rgba(30,40,100,.45)' : undefined }}>
                    {BUCKETS.map((b) => <span key={b.key} className={`vbar !rounded-none tone-${b.tone}`} style={{ height: total ? `${(m[b.key] / total) * 100}%` : 0 }} />)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-12 gap-[5px] mt-1.5">
          {months.map((m, i) => <span key={i} className={`font-num text-center text-[10.5px] tabular-nums font-bold ${selMonth === i ? 'text-slate-900' : 'text-slate-400'}`}>{i + 1}</span>)}
        </div>
        <p className="text-[11px] text-slate-500 mt-3 text-center leading-relaxed"><span className="inline-block w-4 border-t-[1.5px] border-dashed border-slate-600/60 align-middle mr-1.5" />虛線是每月預算 <b className="font-num">{k(plan.fixed + plan.flex)}</b>（固定＋彈性）・點長條只看那個月<br /><span className="text-slate-400">年度支出集中在某個月是正常的，不代表那個月超支</span></p>
      </section>

      <section className="glass-card p-5">
        <h3 className="sec-title mb-3.5">兩個人<span className="ml-2 text-[13px] font-semibold text-slate-400">{scopeLabel}</span></h3>
        <StackTube height={12} parts={peopleTotal ? [{ key: 'm', value: people.myself.sum, tone: 'blue' }, { key: 'p', value: people.partner.sum, tone: 'rose' }] : []} />
        <div className="grid grid-cols-2 gap-3 mt-4">
          {[['myself', '士程', 'text-blue-700'], ['partner', '佳欣', 'text-rose-700']].map(([key, name, text]) => (
            <div key={key} className={`flex items-center gap-2.5 min-w-0 ${key === 'partner' ? 'flex-row-reverse text-right' : ''}`}>
              <PersonDot owner={key} />
              <div className="min-w-0">
                <div className={`text-xs font-bold ${text}`}>{name}・{peopleTotal ? Math.round((people[key].sum / peopleTotal) * 100) : 0}%</div>
                <div className="font-num text-[17px] font-bold tabular-nums text-slate-800 truncate">{fmt(people[key].sum)}</div>
                <div className="text-[11px] text-slate-400">{people[key].n} 筆</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">依記帳人計算（誰記的就算誰的），固定支出多半記在士程名下。</p>
      </section>

      <section className="glass-card p-5">
        <h3 className="sec-title mb-3.5">花最多的分類<span className="ml-2 text-[13px] font-semibold text-slate-400">{scopeLabel}</span></h3>
        <div className="space-y-3.5">
          {cats.map((c, i) => (
            <div key={`${c.type}|${c.category}`} className="flex items-center gap-3">
              <span className="font-num w-4 text-center text-xs font-bold text-slate-400">{i + 1}</span>
              <CategoryIcon category={c.category} group={c.group} type={c.type} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-semibold text-slate-800 truncate">{c.category}<span className="ml-1.5 text-[11px] font-semibold text-slate-400">{c.n} 筆</span></span>
                  <span className="font-num text-[15px] font-bold tabular-nums text-slate-800 shrink-0">{fmt(c.sum)}</span>
                </div>
                <Tube value={c.sum} max={catMax} tone={TONE_OF[c.bucket]} height={7} className="mt-1.5" />
              </div>
            </div>
          ))}
          {cats.length === 0 && <Empty>沒有資料</Empty>}
        </div>
      </section>
    </div>
  );
};

export default BucketAnalysis;
