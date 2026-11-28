import { createElement, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Search, Sun, Moon, Package, LayoutList, CalendarDays } from 'lucide-react';
import { getTodayString, toLocalISOString } from '../lib/utils';
import { isNoSpend } from '../lib/meals';
import { makeFixedMatcher, bucketOf } from '../lib/budget';
import CategoryIcon from '../components/CategoryIcon';
import { Money, Segmented } from '../components/glass';
import { Empty } from '../components/v2';

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const PayerTag = ({ payer }) => (
  <span className={`tag ${payer === 'partner' ? 'tag-rose' : 'tag-blue'}`}>{payer === 'partner' ? '佳欣' : '士程'}</span>
);

const BUCKET = { fixed: ['固定', 'text-indigo-600'], flex: ['彈性', 'text-emerald-600'], annual: ['年度', 'text-amber-600'] };
const amountOf = (t) => Number(t.amount) || 0;
const sumOf = (list) => list.reduce((s, t) => s + amountOf(t), 0);

// 一筆紀錄：分類＋屬於哪一桶（固定／彈性／年度），不顯示舊版的群組
const TxRow = ({ t, bucket, onEdit, onDelete }) => (
  <div onClick={() => onEdit && onEdit(t)} className="flex items-center gap-3 px-2 py-2 rounded-2xl cursor-pointer transition-colors active:bg-slate-900/5">
    <CategoryIcon category={t.category} group={t.group} type={t.type} size="sm" />
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[15px] leading-snug font-semibold text-slate-800 truncate">{t.note || t.category}</span>
        <PayerTag payer={t.payer} />
        {t.together && <span className="tag tag-indigo">一起</span>}
      </div>
      <div className="text-xs text-slate-500 truncate mt-0.5">{t.category}{bucket && <span className={`font-semibold ${BUCKET[bucket][1]}`}>・{BUCKET[bucket][0]}</span>}</div>
    </div>
    <span className={`font-num tabular-nums font-bold shrink-0 ${isNoSpend(t) ? 'text-slate-400 text-[13px]' : 'text-slate-800 text-[15px]'}`}>{isNoSpend(t) ? '沒花錢' : fmt(amountOf(t))}</span>
    {onDelete && (
      <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="icon-btn !w-7 !h-7 -mr-1 text-slate-300 active:text-red-500" aria-label="刪除"><X className="w-4 h-4" strokeWidth={2.4} /></button>
    )}
  </div>
);

// 3.0 明細：月曆每格顯示當天金額（顏色深淺＝花多少）；也可切成卡片（依日期分組）＋搜尋
const LedgerView = ({ transactions, settings, focusDate, onFocusConsumed, deleteTransaction, onEdit, onAddExpense, onRequestHistory }) => {
  // 每次進明細都從「這個月」開始（不跟總覽翻到的月份走）；從總覽點某天進來則跳到那天
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [asList, setAsList] = useState(false);
  const [query, setQuery] = useState('');

  // 從總覽點某一天進來：跳到那天並打開當日明細
  const [prevFocus, setPrevFocus] = useState(null);
  if (focusDate !== prevFocus) {
    setPrevFocus(focusDate);
    if (focusDate) {
      const d = new Date(`${focusDate}T00:00:00`);
      setViewDate(d);
      setSelectedDay(d.getDate());
      setAsList(false);
    }
  }
  useEffect(() => { if (focusDate && onFocusConsumed) onFocusConsumed(); }, [focusDate, onFocusConsumed]);

  const isFixed = useMemo(() => makeFixedMatcher(settings), [settings]);
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
  const monthTx = useMemo(() => transactions.filter((t) => String(t.date || '').startsWith(prefix)), [transactions, prefix]);
  const byDay = useMemo(() => {
    const map = new Map();
    for (const t of monthTx) { const k = t.date; if (!map.has(k)) map.set(k, []); map.get(k).push(t); }
    return map;
  }, [monthTx]);
  const monthTotal = sumOf(monthTx);
  // 月曆熱度：以這個月「不含年度支出」最高的一天為滿格
  const dayMax = useMemo(() => Math.max(1, ...[...byDay.values()].map((list) => sumOf(list.filter((t) => t.type !== 'annual')))), [byDay]);

  const changeMonth = (dir) => {
    const d = new Date(y, m + dir, 1);
    setViewDate(d);
    setSelectedDay(null);
    onRequestHistory && onRequestHistory(d.getFullYear());
  };

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const startDay = new Date(y, m, 1).getDay();
  const todayStr = getTodayString();

  const weeks = [];
  let row = Array(startDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    row.push(d);
    if (row.length === 7) { weeks.push(row); row = []; }
  }
  if (row.length) weeks.push([...row, ...Array(7 - row.length).fill(null)]);

  const selectedStr = selectedDay ? toLocalISOString(new Date(y, m, selectedDay)) : null;
  const selectedTx = selectedStr ? (byDay.get(selectedStr) || []) : [];
  const groupsOfDay = [
    ['lunch', '午餐', Sun, selectedTx.filter((t) => t.meal === 'lunch')],
    ['dinner', '晚餐', Moon, selectedTx.filter((t) => t.meal === 'dinner')],
    ['other', '其他', Package, selectedTx.filter((t) => t.meal !== 'lunch' && t.meal !== 'dinner')],
  ].filter(([, , , list]) => list.length);

  // 清單＋搜尋（備註、分類、金額）
  const trimmed = query.trim().toLowerCase();
  const listTx = useMemo(() => {
    if (!trimmed) return monthTx;
    const num = Number(trimmed.replace(/[$,]/g, ''));
    return transactions.filter((t) => {
      if (Number.isFinite(num) && trimmed.replace(/[$,]/g, '') !== '' && Number(t.amount) === num) return true;
      return `${t.note || ''} ${t.category || ''}`.toLowerCase().includes(trimmed);
    }).slice(0, 200);
  }, [trimmed, monthTx, transactions]);
  const listByDate = useMemo(() => {
    const map = new Map();
    for (const t of listTx) { if (!map.has(t.date)) map.set(t.date, []); map.get(t.date).push(t); }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [listTx]);

  return (
    <div className="space-y-4 stagger">
      <section className="glass-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow">{y} 年 {m + 1} 月支出</div>
            <div className="mt-1.5"><Money value={monthTotal} animate id={`ledger-${prefix}`} className="text-[42px] leading-[1.05] money-ink" /></div>
            <div className="text-[13px] text-slate-500 mt-2">{monthTx.length} 筆・有記帳 {byDay.size} 天</div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={() => changeMonth(-1)} className="icon-btn btn-glass !w-11 !h-11" aria-label="上個月"><ChevronLeft className="w-5 h-5" strokeWidth={2.4} /></button>
            <button type="button" onClick={() => changeMonth(1)} className="icon-btn btn-glass !w-11 !h-11" aria-label="下個月"><ChevronRight className="w-5 h-5" strokeWidth={2.4} /></button>
          </div>
        </div>
      </section>

      <Segmented size="lg" options={[[false, '月曆', CalendarDays], [true, '卡片', LayoutList]]} value={asList} onChange={setAsList} />

      {asList ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-[18px] h-[18px] text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.2} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜尋備註、分類或金額" className="field !pl-11 !pr-10 !rounded-[20px] !py-3.5" />
            {query && <button type="button" onClick={() => setQuery('')} className="icon-btn !w-7 !h-7 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-label="清除搜尋"><X className="w-4 h-4" strokeWidth={2.4} /></button>}
          </div>
          {trimmed && <div className="text-[13px] text-slate-500 px-1.5">找到 {listTx.length} 筆{listTx.length >= 200 ? '（只顯示前 200 筆）' : ''}，合計 <b className="font-num text-slate-800">{fmt(sumOf(listTx))}</b></div>}
          {listByDate.length === 0 && <Empty>沒有紀錄</Empty>}
          {listByDate.map(([date, list]) => (
            <div key={date} className="glass-card r-tile p-2">
              <div className="flex items-baseline justify-between px-2 pt-1.5 pb-1">
                <span className="text-[13px] font-bold text-slate-700">{Number(date.slice(5, 7))}/{Number(date.slice(8, 10))}<span className="ml-1.5 font-semibold text-slate-400">週{WEEK[new Date(`${date}T00:00:00`).getDay()]}{date.slice(0, 4) !== String(y) ? `・${date.slice(0, 4)}` : ''}</span></span>
                <span className="font-num text-[13px] font-bold tabular-nums text-slate-500">{fmt(sumOf(list))}</span>
              </div>
              {list.map((t) => <TxRow key={t.id} t={t} bucket={bucketOf(t, isFixed)} onEdit={onEdit} onDelete={deleteTransaction} />)}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="glass-card p-2">
            <div className="grid grid-cols-7 pt-1.5 pb-1">
              {WEEK.map((d, i) => <div key={d} className={`text-center text-[11px] font-bold ${i === 0 || i === 6 ? 'text-slate-400' : 'text-slate-500'}`}>{d}</div>)}
            </div>
            {weeks.map((wk, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {wk.map((d, di) => {
                  if (!d) return <div key={`p${di}`} className="h-[62px]" />;
                  const ds = toLocalISOString(new Date(y, m, d));
                  const list = byDay.get(ds) || [];
                  const total = sumOf(list);
                  const hasAnnual = list.some((t) => t.type === 'annual');
                  const isSel = selectedDay === d;
                  const isToday = ds === todayStr;
                  const heat = total > 0 ? Math.min(1, 0.18 + 0.82 * Math.min(1, total / dayMax)) : 0;
                  return (
                    <button key={d} type="button" onClick={() => setSelectedDay(d)} className={`cal-cell ${isSel ? 'sel' : ''}`} aria-pressed={isSel}>
                      {total > 0 && !isSel && <span className={`cal-heat ${hasAnnual ? 'annual' : ''}`} style={{ '--h': heat }} />}
                      <span className={`relative font-num text-[13px] font-bold w-6 h-6 grid place-items-center rounded-full ${isToday ? 'btn-ink' : ds > todayStr ? 'text-slate-400' : 'text-slate-700'}`}>{d}</span>
                      <span className={`relative font-num text-[10.5px] leading-none font-bold tabular-nums ${total > 0 ? (hasAnnual ? 'text-amber-700' : 'text-slate-600') : 'text-transparent'}`}>{total >= 10000 ? `${(total / 1000).toFixed(0)}k` : total.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="flex items-center justify-center gap-4 pt-2 pb-1.5 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[4px] bg-emerald-300" />顏色越深花越多</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[4px] bg-amber-300" />含年度支出</span>
            </div>
          </div>

          {selectedDay && (
            <div key={selectedStr} className="glass-card p-3 fade-up">
              <div className="flex items-center justify-between px-2 pt-1 mb-1.5">
                <div className="text-[15px] font-bold text-slate-800">{m + 1} 月 {selectedDay} 日<span className="ml-1.5 text-[13px] font-semibold text-slate-400">週{WEEK[new Date(y, m, selectedDay).getDay()]}・{selectedTx.length} 筆</span></div>
                <Money value={sumOf(selectedTx)} className="text-[22px] text-slate-900" />
              </div>
              {selectedTx.length === 0 && <div className="text-center py-5 text-slate-400 text-[13px]">這天沒有紀錄</div>}
              {groupsOfDay.map(([k, label, Icon, list]) => (
                <div key={k} className="mb-1">
                  <div className="flex items-center gap-1 px-2 pt-2 pb-0.5 text-[11px] font-bold text-slate-400">{createElement(Icon, { className: 'w-3 h-3', strokeWidth: 2.4 })}{label}</div>
                  {list.map((t) => <TxRow key={t.id} t={t} bucket={bucketOf(t, isFixed)} onEdit={onEdit} onDelete={deleteTransaction} />)}
                </div>
              ))}
              <button type="button" onClick={() => onAddExpense && onAddExpense(selectedStr)} className="btn btn-dashed w-full mt-2 h-12 text-sm">
                <Plus className="w-4 h-4" strokeWidth={2.6} />在這天記一筆
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LedgerView;
