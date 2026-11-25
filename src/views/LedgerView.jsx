import { createElement, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Search, Sun, Moon, Package, List, CalendarDays } from 'lucide-react';
import { GLASS_CARD } from '../lib/constants';
import { getTodayString, toLocalISOString } from '../lib/utils';
import { makeFixedMatcher, bucketOf } from '../lib/budget';
import { dayMeals, hasMealData, isNoSpend } from '../lib/meals';
import CategoryIcon from '../components/CategoryIcon';

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const MODES = [['heat', '濃淡'], ['amount', '金額'], ['meal', '用餐']];
const HEAT = ['', 'bg-emerald-50', 'bg-emerald-100', 'bg-emerald-200', 'bg-emerald-300'];

const MealSquare = ({ status, tone }) => {
  const look = {
    paid: tone === 'partner' ? 'bg-rose-300' : 'bg-blue-300',
    nospend: 'bg-white border border-dashed border-slate-400',
    together: 'bg-indigo-300',
  }[status] || 'bg-slate-100';
  return <span className={`h-2 rounded-[3px] ${look}`} />;
};

const PayerTag = ({ payer }) => (
  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${payer === 'partner' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
    {payer === 'partner' ? '佳欣' : '士程'}
  </span>
);

const TxRow = ({ t, onEdit, onDelete }) => (
  <div onClick={() => onEdit && onEdit(t)} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
    <CategoryIcon category={t.category} group={t.group} type={t.type} size="sm" />
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold text-slate-700 truncate">{t.note || t.category}</span>
        <PayerTag payer={t.payer} />
        {t.together && <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-indigo-100 text-indigo-700">一起</span>}
      </div>
      <div className="text-[11px] text-slate-400 truncate">{t.group} / {t.category}</div>
    </div>
    <span className={`text-sm tabular-nums font-medium shrink-0 ${isNoSpend(t) ? 'text-slate-400' : 'text-slate-600'}`}>{isNoSpend(t) ? '沒花錢' : fmt(Number(t.amount) || 0)}</span>
    {onDelete && (
      <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="p-1 text-slate-300 hover:text-rose-500" aria-label="刪除"><X className="w-3.5 h-3.5" /></button>
    )}
  </div>
);

// 2.0 明細：日曆一格只顯示一種資訊（濃淡／金額／用餐），每週小計；也可切成清單＋搜尋
const LedgerView = ({ transactions, settings, selectedDate, focusDate, onFocusConsumed, deleteTransaction, onEdit, onAddExpense, onRequestHistory }) => {
  const [viewDate, setViewDate] = useState(selectedDate);
  const [selectedDay, setSelectedDay] = useState(null);
  const [mode, setMode] = useState('heat');
  const [asList, setAsList] = useState(false);
  const [query, setQuery] = useState('');
  // 外部月份改變時跟著換（render 期間調整 state，避免 effect 連鎖重繪）
  const [prevSelected, setPrevSelected] = useState(selectedDate);
  if (selectedDate !== prevSelected) { setPrevSelected(selectedDate); setViewDate(selectedDate); }

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
  const monthTotal = monthTx.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  // 濃淡：依當天「彈性」支出在本月的位置分 4 階（固定、年度不影響顏色，另外用小點標年度）
  const flexOf = (list) => list.filter((t) => bucketOf(t, isFixed) === 'flex').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const flexDays = [...byDay.values()].map(flexOf).filter((v) => v > 0).sort((a, b) => a - b);
  const q = (p) => flexDays.length ? flexDays[Math.min(flexDays.length - 1, Math.floor(p * flexDays.length))] : 0;
  const cuts = [q(0.25), q(0.5), q(0.8)];
  const heatLevel = (v) => (v <= 0 ? 0 : v <= cuts[0] ? 1 : v <= cuts[1] ? 2 : v <= cuts[2] ? 3 : 4);

  const changeMonth = (dir) => {
    const d = new Date(y, m + dir, 1);
    setViewDate(d);
    setSelectedDay(null);
    onRequestHistory && onRequestHistory(d.getFullYear());
  };

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const startDay = new Date(y, m, 1).getDay();
  const todayStr = getTodayString();

  // 依週切成列，每列後面接一條小計
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
      return `${t.note || ''} ${t.category || ''} ${t.group || ''}`.toLowerCase().includes(trimmed);
    }).slice(0, 200);
  }, [trimmed, monthTx, transactions]);
  const listByDate = useMemo(() => {
    const map = new Map();
    for (const t of listTx) { if (!map.has(t.date)) map.set(t.date, []); map.get(t.date).push(t); }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [listTx]);

  return (
    <div className="pb-24 animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-3 px-1">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{y} 年 {m + 1} 月</h2>
          <div className="text-xs text-slate-400 mt-0.5">本月支出 <span className="font-bold text-slate-600 tabular-nums">{fmt(monthTotal)}</span></div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => changeMonth(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 active:scale-95" aria-label="上個月"><ChevronLeft className="w-5 h-5" /></button>
          <button type="button" onClick={() => changeMonth(1)} className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 active:scale-95" aria-label="下個月"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex flex-1 bg-slate-100 rounded-full p-0.5">
          {MODES.map(([k, l]) => (
            <button key={k} type="button" onClick={() => { setMode(k); setAsList(false); }}
              className={`flex-1 py-1 rounded-full text-xs font-bold transition-all ${!asList && mode === k ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>{l}</button>
          ))}
        </div>
        <button type="button" onClick={() => setAsList(!asList)} aria-pressed={asList}
          className={`p-2 rounded-full border transition-all ${asList ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`} aria-label={asList ? '切回日曆' : '切成清單'}>
          {asList ? <CalendarDays className="w-4 h-4" /> : <List className="w-4 h-4" />}
        </button>
      </div>

      {asList ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜尋備註、分類或金額（搜全部已載入的紀錄）"
              className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-9 py-3 text-sm outline-none focus:border-blue-400" />
            {query && <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" aria-label="清除搜尋"><X className="w-4 h-4" /></button>}
          </div>
          {trimmed && <div className="text-xs text-slate-400 px-1">找到 {listTx.length} 筆{listTx.length >= 200 ? '（只顯示前 200 筆）' : ''}，合計 {fmt(listTx.reduce((s, t) => s + (Number(t.amount) || 0), 0))}</div>}
          {listByDate.length === 0 && <div className="text-center text-sm text-slate-400 py-10">沒有紀錄</div>}
          {listByDate.map(([date, list]) => (
            <div key={date} className={`${GLASS_CARD} p-2`}>
              <div className="flex justify-between px-2 pt-1 pb-1.5 text-xs font-bold text-slate-500">
                <span>{Number(date.slice(5, 7))}/{Number(date.slice(8, 10))}（{WEEK[new Date(`${date}T00:00:00`).getDay()]}）{date.slice(0, 4) !== String(y) ? ` ${date.slice(0, 4)}` : ''}</span>
                <span className="tabular-nums">{fmt(list.reduce((s, t) => s + (Number(t.amount) || 0), 0))}</span>
              </div>
              {list.map((t) => <TxRow key={t.id} t={t} onEdit={onEdit} onDelete={deleteTransaction} />)}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className={`${GLASS_CARD} p-0`}>
            <div className="grid grid-cols-7 border-b border-slate-100">
              {WEEK.map((d) => <div key={d} className="py-2 text-center text-xs font-bold text-slate-400">{d}</div>)}
            </div>
            {weeks.map((wk, wi) => {
              const wkTotal = wk.reduce((s, d) => s + (d ? (byDay.get(toLocalISOString(new Date(y, m, d))) || []).reduce((a, t) => a + (Number(t.amount) || 0), 0) : 0), 0);
              return (
                <div key={wi} className="border-b border-slate-100 last:border-b-0">
                  <div className="grid grid-cols-7">
                    {wk.map((d, di) => {
                      if (!d) return <div key={`p${di}`} className="h-16" />;
                      const ds = toLocalISOString(new Date(y, m, d));
                      const list = byDay.get(ds) || [];
                      const total = list.reduce((s, t) => s + (Number(t.amount) || 0), 0);
                      const flex = flexOf(list);
                      const hasAnnual = list.some((t) => t.type === 'annual');
                      const isSel = selectedDay === d;
                      const isToday = ds === todayStr;
                      const meals = mode === 'meal' ? dayMeals(list) : null;
                      return (
                        <button key={d} type="button" onClick={() => setSelectedDay(d)}
                          className={`h-16 p-1 flex flex-col items-stretch justify-between relative transition-colors ${mode === 'heat' ? HEAT[heatLevel(flex)] : ''} ${isSel ? 'ring-2 ring-inset ring-blue-300' : ''}`}>
                          <div className="flex justify-between items-start">
                            <span className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>{d}</span>
                            {hasAnnual && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 mr-0.5" title="有年度支出" />}
                          </div>
                          {mode === 'amount' && total > 0 && (
                            <span className={`text-[10px] font-bold tabular-nums text-right ${hasAnnual ? 'text-amber-700' : 'text-slate-600'}`}>{total >= 10000 ? `${(total / 1000).toFixed(0)}k` : total.toLocaleString()}</span>
                          )}
                          {mode === 'meal' && (
                            hasMealData(list) || ds <= todayStr ? (
                              <div className="grid grid-cols-2 gap-0.5 px-0.5">
                                <MealSquare status={meals.myself.lunch} tone="myself" />
                                <MealSquare status={meals.myself.dinner} tone="myself" />
                                <MealSquare status={meals.partner.lunch} tone="partner" />
                                <MealSquare status={meals.partner.dinner} tone="partner" />
                              </div>
                            ) : <span />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {mode !== 'meal' && wkTotal > 0 && (
                    <div className="text-right text-[10px] text-slate-400 px-2 pb-1 -mt-0.5 tabular-nums">週小計 {fmt(wkTotal)}</div>
                  )}
                </div>
              );
            })}
          </div>

          {mode === 'heat' && (
            <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400 px-1">
              少 {HEAT.slice(1).map((c) => <span key={c} className={`w-3 h-3 rounded-sm ${c}`} />)} 多（彈性支出）
              <span className="ml-2 w-1.5 h-1.5 rounded-full bg-amber-400" /> 年度
            </div>
          )}
          {mode === 'meal' && (
            <div className="mt-2 px-1 text-[10px] text-slate-400 space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span>每格：上排士程、下排佳欣；左午餐、右晚餐</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-[3px] bg-blue-300" />士程有記</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-[3px] bg-rose-300" />佳欣有記</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-[3px] bg-indigo-300" />一起吃</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-[3px] border border-dashed border-slate-400" />沒花錢</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-[3px] bg-slate-100" />沒交代</span>
              </div>
              <div>只有 2.0 起記帳時標了午餐／晚餐的紀錄才看得出來。</div>
            </div>
          )}

          {selectedDay && (
            <div className={`${GLASS_CARD} p-3 mt-4 animate-in fade-in duration-200`}>
              <div className="flex items-center justify-between px-1 mb-2">
                <div className="text-sm font-bold text-slate-700">{m + 1}/{selectedDay}（{WEEK[new Date(y, m, selectedDay).getDay()]}）· {selectedTx.length} 筆</div>
                <div className="font-num text-lg text-slate-800">{fmt(selectedTx.reduce((s, t) => s + (Number(t.amount) || 0), 0))}</div>
              </div>
              {selectedTx.length === 0 && <div className="text-center py-5 text-slate-400 text-sm">這天沒有紀錄</div>}
              {groupsOfDay.map(([k, label, Icon, list]) => (
                <div key={k} className="mb-1">
                  <div className="flex items-center gap-1 px-2 pt-1.5 text-[11px] font-bold text-slate-400">{createElement(Icon, { className: 'w-3 h-3' })}{label}</div>
                  {list.map((t) => <TxRow key={t.id} t={t} onEdit={onEdit} onDelete={deleteTransaction} />)}
                </div>
              ))}
              <button type="button" onClick={() => onAddExpense && onAddExpense(selectedStr)}
                className="w-full mt-2 py-2.5 border border-dashed border-slate-300 rounded-xl text-slate-500 text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50">
                <Plus className="w-4 h-4" />在這天記一筆
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LedgerView;
