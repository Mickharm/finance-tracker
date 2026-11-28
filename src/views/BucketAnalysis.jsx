import { useMemo, useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { YearSwitch, PersonDot, Dot, Empty } from '../components/v2';
import { Money, StackTube, Tube } from '../components/glass';
import { makeFixedMatcher, budgetPlan, yearByMonth, bucketOf } from '../lib/budget';
import { isNoSpend } from '../lib/meals';
import CategoryIcon from '../components/CategoryIcon';

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;
const k = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));
const amountOf = (t) => Number(t.amount) || 0;
const sumOf = (list) => list.reduce((s, t) => s + amountOf(t), 0);
const monthOf = (t) => Number(String(t.date).slice(5, 7)) - 1;
const catKeyOf = (t) => `${t.type}|${t.category}`;
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const BUCKETS = [
  { key: 'fixed', label: '固定', tone: 'indigo' },
  { key: 'flex', label: '彈性', tone: 'emerald' },
  { key: 'annual', label: '年度', tone: 'amber' },
];
const TONE_OF = { fixed: 'indigo', flex: 'emerald', annual: 'amber' };
const BUCKET_TEXT = { fixed: ['固定', 'text-indigo-700'], flex: ['彈性', 'text-emerald-700'], annual: ['年度', 'text-amber-700'] };
const PAGE = 40; // 搜尋結果一次顯示幾筆

// 把命中的字包成 <mark>，一眼看出是哪裡對上的
const highlight = (text, query) => {
  const src = String(text ?? '');
  if (!query) return src;
  const lower = src.toLowerCase();
  const needle = query.toLowerCase();
  if (!lower.includes(needle)) return src;
  const parts = [];
  let cursor = 0;
  let key = 0;
  for (let idx = lower.indexOf(needle, cursor); idx !== -1; idx = lower.indexOf(needle, cursor)) {
    if (idx > cursor) parts.push(src.slice(cursor, idx));
    parts.push(<mark key={key++} className="search-hit">{src.slice(idx, idx + needle.length)}</mark>);
    cursor = idx + needle.length;
  }
  if (cursor < src.length) parts.push(src.slice(cursor));
  return parts;
};

const Stat = ({ label, children }) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">{label}</div>
    <div className="font-num text-[17px] font-bold tabular-nums text-slate-800 mt-0.5 truncate">{children}</div>
  </div>
);

// 3.0 分析（支出）：每月三色長條（點月份篩選）、兩人比例、分類排行。
// 最上面可以搜尋：打字（名稱、分類、金額）或點一個分類，整頁的圖表都只算符合的紀錄，最下面列出每一筆。
const BucketAnalysis = ({ transactions, settings, flexMonthly, onRequestHistory, onEdit }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [selMonth, setSelMonth] = useState(null);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState(null); // 選中的分類：`${type}|${category}`
  const [shown, setShown] = useState(PAGE);
  const isFixed = useMemo(() => makeFixedMatcher(settings), [settings]);
  const plan = budgetPlan(settings, flexMonthly);

  const yearAll = useMemo(() => transactions.filter((t) => String(t.date || '').startsWith(`${year}-`)), [transactions, year]);

  // 這一年用過的分類（給上方的分類小籤），花最多的排前面
  const catList = useMemo(() => {
    const m = new Map();
    for (const t of yearAll) {
      const key = catKeyOf(t);
      const e = m.get(key) || { key, type: t.type, group: t.group, category: t.category, sum: 0 };
      e.sum += amountOf(t);
      m.set(key, e);
    }
    return [...m.values()].sort((a, b) => b.sum - a.sum);
  }, [yearAll]);
  const catObj = cat ? catList.find((c) => c.key === cat) || null : null;

  // ── 搜尋：範圍＝上方選的年份。純數字同時比對金額；帶 - 或 / 才比對日期
  const trimmed = query.trim();
  const searching = !!trimmed || !!catObj;
  const matched = useMemo(() => {
    if (!trimmed && !catObj) return yearAll;
    const needle = trimmed.toLowerCase();
    const isAmountQuery = /^[\d.,$\s]+$/.test(trimmed);
    const digits = trimmed.replace(/[^\d]/g, '');
    const matchDate = /[-/]/.test(trimmed);
    const hits = [];
    for (const t of yearAll) {
      if (catObj && catKeyOf(t) !== catObj.key) continue;
      let exact = false;
      if (trimmed) {
        const amountStr = String(Math.round(amountOf(t)));
        const amountHit = isAmountQuery && digits.length > 0 && amountStr.includes(digits);
        const date = String(t.date || '');
        const text = `${t.category || ''} ${t.note || ''}${matchDate ? ` ${date} ${date.replace(/-/g, '/')} ${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}` : ''}`.toLowerCase();
        if (!amountHit && !text.includes(needle)) continue;
        exact = amountHit && amountStr === digits;
      }
      hits.push({ t, exact });
    }
    // 金額完全相符的排最前面，其餘依日期由新到舊
    return hits
      .sort((a, b) => (a.exact !== b.exact ? (a.exact ? -1 : 1) : String(b.t.date || '').localeCompare(String(a.t.date || ''))))
      .map((h) => h.t);
  }, [yearAll, trimmed, catObj]);

  const months = useMemo(() => yearByMonth(matched, year, isFixed), [matched, year, isFixed]);
  const monthBudget = plan.fixed + plan.flex;
  const max = Math.max(1, ...months.map((m) => m.fixed + m.flex + m.annual), searching ? 0 : monthBudget);
  const flexLine = (monthBudget / max) * 100;

  // 目前範圍內的紀錄（全年，或點了某個月）
  const scopeTx = useMemo(() => (selMonth === null ? matched : matched.filter((t) => monthOf(t) === selMonth)), [matched, selMonth]);
  const people = useMemo(() => {
    const r = { myself: { sum: 0, n: 0 }, partner: { sum: 0, n: 0 } };
    for (const t of scopeTx) { const p = t.payer === 'partner' ? 'partner' : 'myself'; r[p].sum += amountOf(t); r[p].n++; }
    return r;
  }, [scopeTx]);
  const peopleTotal = people.myself.sum + people.partner.sum;
  const cats = useMemo(() => {
    const m = new Map();
    for (const t of scopeTx) {
      const key = catKeyOf(t);
      const e = m.get(key) || { key, type: t.type, group: t.group, category: t.category, sum: 0, n: 0, bucket: bucketOf(t, isFixed) };
      e.sum += amountOf(t); e.n++;
      m.set(key, e);
    }
    return [...m.values()].sort((a, b) => b.sum - a.sum).slice(0, 8);
  }, [scopeTx, isFixed]);
  const catMax = Math.max(1, ...cats.map((c) => c.sum));
  const scopeLabel = selMonth === null ? `${year} 年` : `${year} 年 ${selMonth + 1} 月`;
  const scope = selMonth === null
    ? months.reduce((a, m) => ({ fixed: a.fixed + m.fixed, flex: a.flex + m.flex, annual: a.annual + m.annual }), { fixed: 0, flex: 0, annual: 0 })
    : months[selMonth];
  const scopeTotal = scope.fixed + scope.flex + scope.annual;
  // 搜尋時：佔同一段期間全部支出的比例
  const scopeAllTotal = sumOf(selMonth === null ? yearAll : yearAll.filter((t) => monthOf(t) === selMonth));
  const share = scopeAllTotal > 0 ? (scopeTotal / scopeAllTotal) * 100 : 0;
  const biggest = scopeTx.reduce((mx, t) => Math.max(mx, amountOf(t)), 0);

  const go = (d) => { const ny = year + d; setYear(ny); setSelMonth(null); setShown(PAGE); onRequestHistory && onRequestHistory(ny); };
  const changeQuery = (v) => { setQuery(v); setShown(PAGE); };
  const pickCat = (key) => { setCat(key === cat ? null : key); setShown(PAGE); };
  const pickMonth = (i) => { setSelMonth(selMonth === i ? null : i); setShown(PAGE); };
  const clearSearch = () => { setQuery(''); setCat(null); setShown(PAGE); };

  return (
    <div className="space-y-4 stagger">
      {/* ── 搜尋：打字，或點一個分類 */}
      <div>
        <div className="relative">
          <Search className="w-[18px] h-[18px] text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.2} />
          <input value={query} onChange={(e) => changeQuery(e.target.value)} placeholder={`搜尋 ${year} 年支出：名稱、分類或金額`} enterKeyHint="search"
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            className="field !pl-11 !pr-10 !rounded-[20px] !py-3.5" aria-label="搜尋支出" />
          {query && <button type="button" onClick={() => changeQuery('')} className="icon-btn !w-7 !h-7 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-label="清除文字"><X className="w-4 h-4" strokeWidth={2.4} /></button>}
        </div>
        {catList.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pt-3 pb-3 -mb-3" role="group" aria-label="依分類篩選">
            <button type="button" onClick={() => pickCat(cat)} aria-pressed={!catObj} className="chip chip-sm shrink-0">全部分類</button>
            {catList.map((c) => (
              <button key={c.key} type="button" onClick={() => pickCat(c.key)} aria-pressed={cat === c.key} className="chip chip-sm !p-1 !pr-2.5 shrink-0">
                <CategoryIcon category={c.category} group={c.group} type={c.type} size="xs" />{c.category}
              </button>
            ))}
          </div>
        )}
      </div>

      <section className="glass-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow flex items-center"><YearSwitch year={year} onChange={(ny) => go(ny - year)} suffix={`${selMonth === null ? ' 年' : ` 年 ${selMonth + 1} 月`}${searching ? '・搜尋結果' : '支出'}`} /></div>
            {searching && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {trimmed && <span className="tag tag-amber !text-[11px]">「{trimmed}」</span>}
                {catObj && <span className="tag tag-slate !text-[11px]">{catObj.category}</span>}
              </div>
            )}
            <div className="mt-1.5"><Money value={scopeTotal} animate id="analysis-total" className="text-[42px] leading-[1.05] money-ink" /></div>
            {searching && <div className="text-[13px] text-slate-500 mt-2">佔{selMonth === null ? '全年' : '當月'}支出 <b className="font-num text-slate-700">{share.toFixed(1)}%</b></div>}
          </div>
          {searching
            ? <button type="button" onClick={clearSearch} className="chip chip-sm shrink-0 mt-1"><X className="w-3.5 h-3.5" strokeWidth={2.6} />清除</button>
            : selMonth !== null && <button type="button" onClick={() => pickMonth(selMonth)} className="chip chip-sm shrink-0 mt-1">看全年</button>}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {searching ? (
            <>
              <Stat label="筆數">{scopeTx.length.toLocaleString()}</Stat>
              <Stat label="平均每筆">{fmt(scopeTx.length ? scopeTotal / scopeTx.length : 0)}</Stat>
              <Stat label="最高一筆">{fmt(biggest)}</Stat>
            </>
          ) : BUCKETS.map((b) => <Stat key={b.key} label={<><Dot tone={b.tone} className="!w-2 !h-2" />{b.label}</>}>{fmt(scope[b.key])}</Stat>)}
        </div>

        <div className="relative h-44 mt-5">
          {!searching && <div className="absolute left-0 right-0 z-10 border-t-[1.5px] border-dashed border-slate-600/55 pointer-events-none" style={{ bottom: `${flexLine}%` }} />}
          <div className="absolute inset-0 grid grid-cols-12 gap-[5px] items-end">
            {months.map((m, i) => {
              const total = m.fixed + m.flex + m.annual;
              const on = selMonth === null || selMonth === i;
              return (
                <button key={i} type="button" onClick={() => pickMonth(i)} className={`relative h-full flex items-end transition-opacity duration-300 ${on ? '' : 'opacity-30'}`} aria-label={`${i + 1} 月 ${fmt(total)}`} aria-pressed={selMonth === i}>
                  <span className="grow-y w-full flex flex-col-reverse overflow-hidden rounded-[7px]" style={{ height: `${(total / max) * 100}%`, '--i': i, transformOrigin: '50% 100%', boxShadow: selMonth === i ? '0 8px 16px -6px rgba(46,49,51,.5)' : undefined }}>
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
        {searching ? (
          <p className="text-[11px] text-slate-500 mt-3 text-center">符合搜尋的紀錄，每個月花了多少・點長條只看那個月</p>
        ) : (
          <p className="text-[11px] text-slate-500 mt-3 text-center leading-relaxed"><span className="inline-block w-4 border-t-[1.5px] border-dashed border-slate-600/60 align-middle mr-1.5" />虛線是每月預算 <b className="font-num">{k(monthBudget)}</b>（固定＋彈性）・點長條只看那個月<br /><span className="text-slate-400">年度支出集中在某個月是正常的，不代表那個月超支</span></p>
        )}
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

      {/* 已經選了單一分類時，排行只會有一列，就不顯示了 */}
      {!catObj && (
        <section className="glass-card p-5">
          <h3 className="sec-title mb-1">{searching ? '落在哪些分類' : '花最多的分類'}<span className="ml-2 text-[13px] font-semibold text-slate-400">{scopeLabel}</span></h3>
          <p className="text-[11px] text-slate-400 mb-3.5">點一個分類，整頁只看它</p>
          <div className="space-y-1">
            {cats.map((c, i) => (
              <button key={c.key} type="button" onClick={() => pickCat(c.key)} className="press w-full flex items-center gap-3 text-left py-1.5">
                <span className="font-num w-4 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                <CategoryIcon category={c.category} group={c.group} type={c.type} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-semibold text-slate-800 truncate">{highlight(c.category, trimmed)}<span className="ml-1.5 text-[11px] font-semibold text-slate-400">{c.n} 筆</span></span>
                    <span className="font-num text-[15px] font-bold tabular-nums text-slate-800 shrink-0">{fmt(c.sum)}</span>
                  </div>
                  <Tube value={c.sum} max={catMax} tone={TONE_OF[c.bucket]} height={7} className="mt-1.5" />
                </div>
              </button>
            ))}
            {cats.length === 0 && <Empty>沒有資料</Empty>}
          </div>
        </section>
      )}

      {/* ── 搜尋時：列出每一筆 */}
      {searching && (
        <section className="glass-card p-3">
          <div className="flex items-baseline justify-between px-2 pt-1.5 pb-1">
            <h3 className="sec-title">符合的紀錄<span className="ml-2 text-[13px] font-semibold text-slate-400">{scopeLabel}</span></h3>
            <span className="font-num text-[13px] font-bold tabular-nums text-slate-500">{scopeTx.length} 筆</span>
          </div>
          {scopeTx.length === 0 ? (
            <Empty>{scopeLabel}找不到符合的支出，可以切換上方年份，或換個關鍵字</Empty>
          ) : (
            <>
              {scopeTx.slice(0, shown).map((t) => {
                const d = String(t.date || '');
                const [bLabel, bText] = BUCKET_TEXT[bucketOf(t, isFixed)];
                return (
                  <button key={t.id} type="button" onClick={() => onEdit && onEdit(t)} className="w-full flex items-center gap-3 px-2 py-2 rounded-2xl text-left transition-colors active:bg-slate-900/5">
                    <CategoryIcon category={t.category} group={t.group} type={t.type} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[15px] leading-snug font-semibold text-slate-800 truncate">{highlight(t.note || t.category, trimmed)}</span>
                        <span className={`tag ${t.payer === 'partner' ? 'tag-rose' : 'tag-blue'}`}>{t.payer === 'partner' ? '佳欣' : '士程'}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        <span className="font-num">{Number(d.slice(5, 7))}/{Number(d.slice(8, 10))}</span> 週{WEEK[new Date(`${d}T00:00:00`).getDay()]}・{highlight(t.category, trimmed)}<span className={`font-semibold ${bText}`}>・{bLabel}</span>
                      </div>
                    </div>
                    <span className={`font-num tabular-nums font-bold shrink-0 ${isNoSpend(t) ? 'text-slate-400 text-[13px]' : 'text-slate-800 text-[15px]'}`}>{isNoSpend(t) ? '沒花錢' : fmt(amountOf(t))}</span>
                  </button>
                );
              })}
              {scopeTx.length > shown && (
                <button type="button" onClick={() => setShown(shown + PAGE)} className="press w-full py-3 text-[13px] font-semibold text-slate-500 flex items-center justify-center gap-1">
                  再顯示 {Math.min(PAGE, scopeTx.length - shown)} 筆<ChevronDown className="w-4 h-4" strokeWidth={2.4} />
                </button>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
};

export default BucketAnalysis;
