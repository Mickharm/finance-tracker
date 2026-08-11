import { useState, useEffect, useMemo } from 'react';
import { X, Search, PieChart, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card } from '../components/ui';
import { GLASS_CARD, GLASS_INPUT } from '../lib/constants';
import { formatDetailedDate } from '../lib/utils';

const SEARCH_RESULT_LIMIT = 30; // 手機上一次最多渲染幾筆搜尋結果

// 把命中的字串片段包成 <mark>，讓使用者一眼看到是哪裡對上的
const highlightMatch = (text, query) => {
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


const VisualizationView = ({ transactions, settings, onRequestHistory, onEdit }) => {
  const [baseYear, setBaseYear] = useState(new Date().getFullYear());
  const [compareYear, setCompareYear] = useState(new Date().getFullYear() - 1);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // Drill-down state: month — default to current month for monthly reconciliation

  const [searchQuery, setSearchQuery] = useState(''); // 支出搜尋：金額或部分名稱
  const [selectedFilter, setSelectedFilter] = useState(null); // { type: 'group'|'category', value: string }
  const [sortMode, setSortMode] = useState('budget'); // 'amount' | 'budget' — budget order is the monthly reconciliation default
  const [expandedGroups, setExpandedGroups] = useState({}); // { groupName: boolean }

  useEffect(() => {
    // Dynamic History Loading: Ensure data for selected years is loaded
    if (onRequestHistory) {
      onRequestHistory(baseYear);
      onRequestHistory(compareYear);
    }
  }, [onRequestHistory, baseYear, compareYear]);

  const generateYearOptions = () => { const currentY = new Date().getFullYear(); const startY = 2020; const years = []; for (let y = currentY + 1; y >= startY; y--) { years.push(y); } return years; };
  const availableYears = useMemo(() => generateYearOptions(), []);

  const getMonthlyData = (year) => { const months = Array(12).fill(0); transactions.forEach(t => { const d = new Date(t.date); if (d.getFullYear() === year) { months[d.getMonth()] += Number(t.amount); } }); return months; };
  const baseData = useMemo(() => getMonthlyData(baseYear), [transactions, baseYear]);
  const compareData = useMemo(() => getMonthlyData(compareYear), [transactions, compareYear]);
  const maxVal = isCompareMode ? Math.max(...baseData, ...compareData, 1) : Math.max(...baseData, 1);

  // Filter breakdown data based on selected month or full year
  const breakdownData = useMemo(() => {
    if (isCompareMode) return [];

    const isBudgetSort = sortMode === 'budget';
    const stats = {};
    let total = 0;

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (d.getFullYear() === baseYear) {
        if (selectedMonth !== null && d.getMonth() !== selectedMonth) return; // Filter by month if selected

        const amount = Number(t.amount);
        total += amount;

        if (isBudgetSort) {
          // Hierarchical: Group -> Category
          const groupKey = t.group || '其他';
          if (!stats[groupKey]) stats[groupKey] = { value: 0, items: {} };
          stats[groupKey].value += amount;
          stats[groupKey].items[t.category] = (stats[groupKey].items[t.category] || 0) + amount;
        } else {
          // Flat: Category
          stats[t.category] = (stats[t.category] || 0) + amount;
        }
      }
    });

    if (!isBudgetSort) {
      // Flat Amount Sort
      return Object.entries(stats)
        .map(([name, value]) => ({ name, value, percent: total > 0 ? (value / total) * 100 : 0 }))
        .sort((a, b) => b.value - a.value);
    } else {
      // Budget Sort: Hierarchical
      // Order: Monthly Groups -> Annual Groups -> Others
      const monthlyOrder = (settings?.monthlyGroups || []).map(g => g.name);
      const annualOrder = (settings?.annualGroups || []).map(g => g.name);
      const fullOrder = [...monthlyOrder, ...annualOrder];

      // Build Item Order Map (Category -> Index inside Group)
      const itemOrderMap = {};
      [...(settings?.monthlyGroups || []), ...(settings?.annualGroups || [])].forEach(g => {
        g.items.forEach((item, idx) => { itemOrderMap[item.name] = idx; });
      });

      return Object.entries(stats).map(([gName, data]) => ({
        name: gName,
        value: data.value,
        percent: total > 0 ? (data.value / total) * 100 : 0,
        items: Object.entries(data.items).map(([cName, val]) => ({
          name: cName,
          value: val,
          percent: data.value > 0 ? (val / data.value) * 100 : 0
        })).sort((a, b) => {
          // Sort Items by Budget Order
          const idxA = itemOrderMap[a.name];
          const idxB = itemOrderMap[b.name];
          if (idxA === undefined && idxB === undefined) return b.value - a.value;
          if (idxA === undefined) return 1;
          if (idxB === undefined) return -1;
          return idxA - idxB;
        })
      })).sort((a, b) => {
        // Sort Groups
        let idxA = fullOrder.indexOf(a.name);
        let idxB = fullOrder.indexOf(b.name);
        if (idxA === -1 && idxB === -1) return b.value - a.value;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }
  }, [transactions, baseYear, isCompareMode, selectedMonth, sortMode, settings]);

  const monthlyDiffs = useMemo(() => { if (!isCompareMode) return []; return baseData.map((val, idx) => ({ month: idx + 1, base: val, compare: compareData[idx], diff: val - compareData[idx] })); }, [baseData, compareData, isCompareMode]);

  // Get detailed transactions for selected month/category
  const detailedTransactions = useMemo(() => {
    if (selectedMonth === null && selectedFilter === null) return [];

    return transactions.filter(t => {
      const d = new Date(t.date);
      const matchYear = d.getFullYear() === baseYear;
      const matchMonth = selectedMonth !== null ? d.getMonth() === selectedMonth : true;

      let matchFilter = true;
      if (selectedFilter) {
        if (selectedFilter.type === 'group') matchFilter = (t.group || '其他') === selectedFilter.value;
        else if (selectedFilter.type === 'category') matchFilter = t.category === selectedFilter.value;
      }

      return matchYear && matchMonth && matchFilter;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, baseYear, selectedMonth, selectedFilter]);

  // ─── 支出搜尋（範圍＝上方選擇的年份，不受月份／分類篩選影響）───────────────
  const trimmedQuery = searchQuery.trim();
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return [];

    const needle = trimmedQuery.toLowerCase();
    // 純數字（可帶 $ , . 空白）→ 同時比對金額；帶中英文的一律只當名稱搜尋
    const isAmountQuery = /^[\d.,$\s]+$/.test(trimmedQuery);
    const digits = trimmedQuery.replace(/[^\d]/g, '');
    // 帶 - 或 / 才比對日期，避免純數字把整月的紀錄都撈進來
    const matchDate = /[-/]/.test(trimmedQuery);

    const hits = [];
    transactions.forEach(t => {
      if (new Date(t.date).getFullYear() !== baseYear) return;

      const amountStr = String(Math.round(Number(t.amount) || 0));
      const amountHit = isAmountQuery && digits.length > 0 && amountStr.includes(digits);
      const text = `${t.category || ''} ${t.group || ''} ${t.note || ''}${matchDate ? ` ${t.date || ''}` : ''}`.toLowerCase();
      if (!amountHit && !text.includes(needle)) return;

      hits.push({ t, exact: amountHit && amountStr === digits });
    });

    // 金額完全相符的排最前面，其餘依日期由新到舊
    return hits
      .sort((a, b) => (a.exact !== b.exact ? (a.exact ? -1 : 1) : String(b.t.date || '').localeCompare(String(a.t.date || ''))))
      .map(h => h.t);
  }, [transactions, baseYear, trimmedQuery]);

  const searchTotal = useMemo(() => searchResults.reduce((sum, t) => sum + Number(t.amount || 0), 0), [searchResults]);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">{isCompareMode ? '年度支出比較' : '年度支出分析'}</h2>
          <div className="flex items-center gap-2">
            {!isCompareMode && (
              <button
                onClick={() => { setSortMode(prev => prev === 'amount' ? 'budget' : 'amount'); setSelectedFilter(null); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${sortMode === 'budget' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {sortMode === 'budget' ? '排序: 預算' : '排序: 金額'}
              </button>
            )}
            <button onClick={() => { setIsCompareMode(!isCompareMode); setSelectedMonth(null); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isCompareMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {isCompareMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />} 比較模式
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">{isCompareMode ? '主年份' : '選擇年份'}</label>
            <select value={baseYear} onChange={(e) => { setBaseYear(Number(e.target.value)); setSelectedMonth(null); setSelectedFilter(null); }} className={`w-full ${GLASS_INPUT} px-3 py-2 font-bold text-slate-700`}>{availableYears.map(y => (<option key={y} value={y}>{y}</option>))}</select>
          </div>
          {isCompareMode && (<div className="flex-1 animate-in slide-in-from-right-2 duration-200"><label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">對比年份</label><select value={compareYear} onChange={(e) => setCompareYear(Number(e.target.value))} className={`w-full ${GLASS_INPUT} px-3 py-2 font-bold text-slate-500`}>{availableYears.map(y => (<option key={y} value={y}>{y}</option>))}</select></div>)}
        </div>

        <div className="h-64 flex items-end justify-between gap-0.5 mt-4 relative overflow-x-auto">
          {/* Background Grid */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div className="border-t border-dashed border-slate-100 w-full h-px"></div>
            <div className="border-t border-dashed border-slate-100 w-full h-px"></div>
            <div className="border-t border-dashed border-slate-100 w-full h-px"></div>
            <div className="border-t border-slate-200 w-full h-px"></div>
          </div>

          {baseData.map((val, idx) => (
            <div
              key={idx}
              onClick={() => { if (!isCompareMode) { setSelectedMonth(selectedMonth === idx ? null : idx); setSelectedFilter(null); } }}
              className={`flex-1 flex flex-col justify-end items-center h-full z-10 group relative ${!isCompareMode ? 'cursor-pointer' : ''}`}
            >
              {/* Value Label moved above the bar */}
              <div className="mb-2 text-[10px] font-bold text-slate-500 transition-all group-hover:scale-110 group-hover:text-slate-800 h-4 flex items-end">
                {isCompareMode ? (monthlyDiffs[idx]?.diff !== 0 && (
                  <span className={`flex items-center gap-0.5 ${monthlyDiffs[idx]?.diff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {monthlyDiffs[idx]?.diff > 0 ? '+' : ''}{Math.round(monthlyDiffs[idx]?.diff / 1000)}k
                  </span>
                )) : (
                  <span>{val > 0 ? `${Math.round(val / 1000)}k` : ''}</span>
                )}
              </div>

              {/* Bar Container - Isolates height computation from flex container shrink algorithm */}
              <div className="w-full flex-1 flex justify-center items-end relative overflow-hidden">
                {/* Bar */}
                <div className="w-full max-w-[20px] bg-slate-100 rounded-t-lg relative overflow-visible transition-all duration-500 flex-none" style={{ height: `${maxVal > 0 ? (Math.max(0, val) / maxVal) * 100 : 0}%` }}>
                  <div className={`absolute inset-x-0 bottom-0 top-0 rounded-t-lg transition-all duration-300 ${!isCompareMode && selectedMonth === idx ? 'bg-slate-800 shadow-lg shadow-slate-300' : 'bg-slate-300 group-hover:bg-slate-400'}`}></div>
                  {isCompareMode && (
                    <div className="absolute inset-x-0 bottom-0 bg-slate-800/20 rounded-t-lg border-t border-slate-500/30" style={{ height: `${maxVal > 0 ? (Math.max(0, compareData[idx]) / maxVal) * 100 : 0}%` }}></div>
                  )}
                </div>
              </div>

              {/* X Axis Label */}
              <div className={`mt-2 text-[9px] font-bold transition-colors whitespace-nowrap h-3 flex items-start ${selectedMonth === idx ? 'text-slate-800 scale-110' : 'text-slate-400 group-hover:text-slate-600'}`}>{idx + 1}</div>
            </div>
          ))}
        </div>
      </Card>

      {isCompareMode ? (
        <Card>
          <h3 className="text-sm font-bold text-slate-700 mb-4">每月差異分析 ({baseYear} vs {compareYear})</h3>
          <div className="space-y-3">
            {monthlyDiffs.map((item) => (
              <div key={item.month} className="flex justify-between items-center text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                <span className="text-slate-500 w-8">{item.month}月</span>
                <div className="flex-1 px-4 text-xs text-gray-400 text-center">${item.base.toLocaleString()} vs ${item.compare.toLocaleString()}</div>
                <span className={`tabular-nums font-bold ${item.diff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{item.diff > 0 ? '+' : ''}{item.diff.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-500 text-xs flex items-center gap-2 mb-1">
                    <div className="p-1 bg-slate-100 rounded-lg"><PieChart className="w-3 h-3 text-slate-500" /></div>
                    {selectedMonth !== null ? `${baseYear}年 ${selectedMonth + 1}月` : `${baseYear} 年度`} 支出組成
                    {(selectedMonth !== null || selectedFilter !== null) && <button onClick={(e) => { e.stopPropagation(); setSelectedMonth(null); setSelectedFilter(null); }} className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 hover:bg-slate-200 ml-2">重設篩選</button>}
                  </h3>
                  <div className="text-3xl font-bold text-slate-800 tracking-tight">
                    ${(selectedMonth !== null ? baseData[selectedMonth] : baseData.reduce((a, b) => a + b, 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {breakdownData.length > 0 ? (
                sortMode === 'amount' ? (
                  /* Flat Amount List */
                  breakdownData.map((item) => (
                    <div key={item.name} onClick={() => setSelectedFilter(selectedFilter?.value === item.name ? null : { type: 'category', value: item.name })} className={`cursor-pointer transition-all hover:bg-slate-50 p-2 rounded-xl border border-transparent ${selectedFilter?.value === item.name ? 'bg-slate-50 border-slate-200' : ''}`}>
                      <div className="flex justify-between items-end mb-1 text-sm">
                        <span className="text-slate-600 font-medium">{item.name}</span>
                        <span className="font-bold text-slate-800">${item.value.toLocaleString()} <span className="text-xs text-slate-400 font-normal">({item.percent.toFixed(1)}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-slate-700 rounded-full transition-all duration-500" style={{ width: `${item.percent}%` }}></div>
                      </div>
                    </div>
                  ))
                ) : (
                  /* Budget Sort: Collapsible Groups */
                  breakdownData.map((group) => (
                    <div key={group.name} className={`rounded-xl border transition-all overflow-hidden ${selectedFilter?.value === group.name ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-white'}`}>
                      <div
                        onClick={() => {
                          // Toggle Expand
                          setExpandedGroups(prev => ({ ...prev, [group.name]: !prev[group.name] }));
                          // Also select for analysis
                          setSelectedFilter({ type: 'group', value: group.name });
                        }}
                        className="p-3 cursor-pointer flex justify-between items-center hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex justify-between items-end mb-1 text-sm">
                            <span className="font-bold text-slate-700 flex items-center gap-2">
                              {group.name}
                              {expandedGroups[group.name] ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                            </span>
                            <span className="font-bold text-slate-800">${group.value.toLocaleString()} <span className="text-xs text-slate-400 font-normal">({group.percent.toFixed(1)}%)</span></span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-slate-600 rounded-full transition-all duration-500" style={{ width: `${group.percent}%` }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Items */}
                      {expandedGroups[group.name] && (
                        <div className="bg-slate-50/50 p-2 space-y-1 border-t border-slate-100 animate-in slide-in-from-top-1">
                          {group.items.map(item => (
                            <div
                              key={item.name}
                              onClick={(e) => { e.stopPropagation(); setSelectedFilter({ type: 'category', value: item.name }); }}
                              className={`flex justify-between items-center text-xs p-2 rounded-lg cursor-pointer hover:bg-white transition-colors ${selectedFilter?.value === item.name ? 'bg-white shadow-sm ring-1 ring-indigo-100' : ''}`}
                            >
                              <span className="text-slate-600 font-medium">{item.name}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-200 rounded-full h-1 overflow-hidden"><div className="h-full bg-slate-400 rounded-full" style={{ width: `${item.percent}%` }} /></div>
                                <span className="tabular-nums text-slate-600 w-12 text-right">${item.value.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )
              ) : (
                <div className="text-center text-slate-400 py-6 text-sm">該時段尚無支出資料</div>
              )}
            </div>
          </Card>

          {selectedFilter !== null && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-sm font-bold text-slate-500 mb-3 px-2">詳細明細 </h3>
              <div className="space-y-3">
                {detailedTransactions.map(t => (
                  <div key={t.id} onClick={() => onEdit && onEdit(t)} className={`${GLASS_CARD} p-4 flex justify-between items-center cursor-pointer hover:bg-white/60 transition-colors`}>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{t.category}</span>
                      <span className="text-xs text-slate-400">{formatDetailedDate(t.date)} {t.note && `• ${t.note}`}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums font-bold text-slate-800">${Number(t.amount).toLocaleString()}</span>
                      {/* Delete removed in Analysis View */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── 搜尋支出（金額或部分名稱）─────────────────────────────── */}
      <Card>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            enterKeyHint="search"
            autoComplete="off"
            placeholder={`搜尋 ${baseYear} 年支出：金額或名稱`}
            className={`${GLASS_INPUT} pl-11 pr-11 font-medium text-slate-700`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="清除搜尋"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {trimmedQuery && (
          <div className="mt-4 animate-in fade-in duration-200">
            {searchResults.length > 0 ? (
              <>
                <div className="flex items-baseline justify-between mb-3 px-1">
                  <span className="text-xs font-bold text-slate-500">{baseYear} 年找到 {searchResults.length} 筆</span>
                  <span className="text-sm font-bold text-slate-800 tabular-nums">合計 ${searchTotal.toLocaleString()}</span>
                </div>
                <div className="space-y-2">
                  {searchResults.slice(0, SEARCH_RESULT_LIMIT).map(t => (
                    <div
                      key={t.id}
                      onClick={() => onEdit && onEdit(t)}
                      className="bg-white/50 border border-white/60 rounded-2xl p-3 flex justify-between items-center gap-3 cursor-pointer hover:bg-white/80 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-700 flex items-center gap-2 min-w-0">
                          <span className="truncate">{highlightMatch(t.category, trimmedQuery)}</span>
                          {t.group && <span className="shrink-0 text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{t.group}</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {formatDetailedDate(t.date)}{t.note && <> • {highlightMatch(t.note, trimmedQuery)}</>}
                        </div>
                      </div>
                      <span className="tabular-nums font-bold text-slate-800 shrink-0">${Number(t.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                {searchResults.length > SEARCH_RESULT_LIMIT && (
                  <div className="text-center text-[11px] text-slate-400 pt-3">僅顯示前 {SEARCH_RESULT_LIMIT} 筆，請輸入更精確的金額或名稱</div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-sm text-slate-400">{baseYear} 年找不到「{trimmedQuery}」的支出</div>
                <div className="text-[11px] text-slate-300 mt-1">可切換上方年份，或改用部分名稱／金額搜尋</div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export { VisualizationView };
