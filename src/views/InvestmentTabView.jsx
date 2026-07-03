import { useState, useEffect, useMemo, useCallback } from 'react';
import { onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Plus, X, ChevronDown, ChevronUp, Check, TrendingUp, TrendingDown, RefreshCw, Layers } from 'lucide-react';
import { GlassButton, InputField, ModalWrapper, ViewLoader } from '../components/ui';
import { COLOR_VARIANTS, GLASS_CARD, GLASS_INPUT, HOLDINGS_GROUP_THEMES, barToHex } from '../lib/constants';
import { LEDGER_ID } from '../lib/firebase';
import { FINNHUB_API_KEY, getCachedPrices, getTodayString, setCachedPrices } from '../lib/utils';


const HoldingsStockCard = ({ stock, currentPrice, priceChange, onAddPurchase, onDeletePurchase, onDeleteStock, totalPortfolio, theme }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalShares = stock.purchases.reduce((sum, p) => sum + Number(p.shares), 0);
  const totalCost = stock.purchases.reduce((sum, p) => sum + Number(p.shares) * Number(p.price), 0);
  const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
  const hasPrice = currentPrice > 0;
  const marketValue = totalShares * (currentPrice || 0);
  const value = hasPrice ? marketValue : totalCost;
  const pnl = hasPrice ? marketValue - totalCost : 0;
  const pnlPercent = totalCost > 0 && hasPrice ? (pnl / totalCost) * 100 : 0;
  const isUp = pnl >= 0;
  const percent = totalPortfolio > 0 ? (value / totalPortfolio) * 100 : 0;

  return (
    <div className="border border-slate-100 rounded-2xl p-4 bg-white/30">
      <div className="flex justify-between items-start cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-slate-800 text-base">{stock.symbol}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums ${theme.bg} ${theme.text}`}>{percent.toFixed(1)}%</span>
            {hasPrice && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${priceChange >= 0 ? 'bg-[#F1FAEE] text-[#2D6A4F]' : 'bg-[#FDECEA] text-[#C0392B]'}`}>
                {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(priceChange).toFixed(2)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="tabular-nums">{totalShares} 股</span>
            <span className="tabular-nums">均價 ${avgCost.toFixed(2)}</span>
            <span className="tabular-nums">現價 ${hasPrice ? currentPrice.toFixed(2) : '---'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-800 tabular-nums">${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            {hasPrice && (
              <div className={`text-[10px] font-bold tabular-nums ${isUp ? 'text-[#2D6A4F]' : 'text-[#C0392B]'}`}>
                {isUp ? '+' : ''}{pnlPercent.toFixed(1)}% · {isUp ? '+' : ''}${pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDeleteStock(); }} className="text-slate-300 hover:text-[#C0392B] p-1 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-3 w-full bg-slate-100/60 rounded-full h-1 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${theme.bar}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-100/50 animate-in slide-in-from-top-1 duration-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase">購買紀錄 · 成本 ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <button onClick={(e) => { e.stopPropagation(); onAddPurchase(stock.symbol); }} className="text-[10px] bg-slate-800 text-white px-2.5 py-1 rounded-lg font-bold hover:bg-slate-700 flex items-center gap-1">
              <Plus className="w-3 h-3" /> 新增買入
            </button>
          </div>
          {stock.purchases.length === 0 ? (
            <div className="text-xs text-slate-300 text-center py-3">尚無購買紀錄</div>
          ) : (
            <div className="space-y-1.5">
              {stock.purchases.map(p => (
                <div key={p.id} className="flex justify-between items-center text-xs bg-slate-50/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 tabular-nums">{p.date}</span>
                    <span className="font-bold text-slate-600 tabular-nums">{p.shares} 股</span>
                    <span className="text-slate-400 tabular-nums">@${Number(p.price).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-slate-500">${(Number(p.shares) * Number(p.price)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    <button onClick={(e) => { e.stopPropagation(); onDeletePurchase(p.id); }} className="text-slate-300 hover:text-[#C0392B] p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const HoldingsGroupCard = ({ group, prices, onAddStock, onDeleteStock, onAddPurchase, onDeletePurchase, onDeleteGroup, totalPortfolio, theme }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newSymbol, setNewSymbol] = useState('');

  const stats = useMemo(() => {
    let cost = 0, value = 0;
    (group.stocks || []).forEach(s => {
      const shares = s.purchases.reduce((sum, p) => sum + Number(p.shares), 0);
      const c = s.purchases.reduce((sum, p) => sum + Number(p.shares) * Number(p.price), 0);
      const price = prices[s.symbol]?.price || 0;
      cost += c;
      value += price > 0 ? shares * price : c;
    });
    const pnl = value - cost;
    return { cost, value, pnl, pnlPercent: cost > 0 ? (pnl / cost) * 100 : 0, percent: totalPortfolio > 0 ? (value / totalPortfolio) * 100 : 0 };
  }, [group.stocks, prices, totalPortfolio]);

  const sortedStocks = useMemo(() => (group.stocks || [])
    .map((s, idx) => {
      const shares = s.purchases.reduce((sum, p) => sum + Number(p.shares), 0);
      const c = s.purchases.reduce((sum, p) => sum + Number(p.shares) * Number(p.price), 0);
      const price = prices[s.symbol]?.price || 0;
      return { s, idx, value: price > 0 ? shares * price : c };
    })
    .sort((a, b) => b.value - a.value), [group.stocks, prices]);

  const handleAdd = () => {
    if (newSymbol.trim()) { onAddStock(group.id, newSymbol.trim().toUpperCase()); setNewSymbol(''); }
  };

  return (
    <div className={`${GLASS_CARD} p-5 mb-4 border-l-4 ${theme.glow}`} style={{ borderLeftColor: barToHex(theme.bar) }}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => setIsExpanded(!isExpanded)}>
          <div className={`p-1.5 rounded-lg ${theme.iconBg} ${theme.iconText}`}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-700 tracking-tight truncate">{group.name}</h3>
            <span className="text-[10px] text-slate-400 font-medium tabular-nums">{(group.stocks || []).length} 檔 · 佔 {stats.percent.toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-800 tabular-nums">${stats.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            {stats.cost > 0 && (
              <div className={`text-[10px] font-bold tabular-nums ${stats.pnl >= 0 ? 'text-[#2D6A4F]' : 'text-[#C0392B]'}`}>{stats.pnl >= 0 ? '+' : ''}{stats.pnlPercent.toFixed(1)}%</div>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDeleteGroup(); }} className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-[#FDECEA] hover:text-[#C0392B] transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="w-full bg-slate-100/60 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${theme.bar}`} style={{ width: `${Math.min(stats.percent, 100)}%` }} />
      </div>
      {isExpanded && (
        <div className="space-y-3 animate-in slide-in-from-top-1 duration-200 border-t border-slate-100/50 pt-3 mt-3">
          {(group.stocks || []).length === 0 && <div className="text-xs text-slate-300 text-center py-2">尚無持股，於下方輸入代碼新增</div>}
          {sortedStocks.map(({ s, idx }) => (
            <HoldingsStockCard
              key={`${s.symbol}-${idx}`}
              stock={s}
              theme={theme}
              currentPrice={prices[s.symbol]?.price}
              priceChange={prices[s.symbol]?.change}
              totalPortfolio={totalPortfolio}
              onAddPurchase={onAddPurchase}
              onDeletePurchase={(purchaseId) => onDeletePurchase(group.id, s.symbol, purchaseId)}
              onDeleteStock={() => onDeleteStock(group.id, idx)}
            />
          ))}
          <div className="flex gap-2 pt-1">
            <input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="輸入股票代碼" className={`${GLASS_INPUT} py-2 px-3 text-xs uppercase`} />
            <button onClick={handleAdd} className="bg-slate-800 text-white px-4 rounded-xl hover:bg-slate-700 font-bold text-xs shadow-lg">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const HoldingsDonutChart = ({ data, colors: colorProp }) => {
  if (!data || data.length === 0) return null;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total <= 0) return null;
  const colors = colorProp || ['#52B788', '#7A96BE', '#D4AC0D', '#E57373', '#9A85B0', '#5DAAAD', '#8A8884', '#7889B0', '#9C9690'];
  const cx = 50, cy = 50, r = 35, innerR = 22;
  let cumAngle = -90;
  const arcs = data.map((d, i) => {
    const pct = d.value / total;
    const angle = pct * 360;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;
    const largeArc = angle > 180 ? 1 : 0;
    const toRad = (a) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const ix1 = cx + innerR * Math.cos(toRad(endAngle));
    const iy1 = cy + innerR * Math.sin(toRad(endAngle));
    const ix2 = cx + innerR * Math.cos(toRad(startAngle));
    const iy2 = cy + innerR * Math.sin(toRad(startAngle));
    return (
      <path key={i} d={`M${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} L${ix1},${iy1} A${innerR},${innerR} 0 ${largeArc},0 ${ix2},${iy2} Z`} fill={colors[i % colors.length]} opacity="0.9" />
    );
  });
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-28 h-28 flex-shrink-0">
        {arcs}
        <text x={cx} y={cy - 3} textAnchor="middle" className="fill-slate-700 text-[7px] font-bold">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</text>
        <text x={cx} y={cy + 6} textAnchor="middle" className="fill-slate-400 text-[4px]">總市值</text>
      </svg>
      <div className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-slate-600 truncate flex-1">{d.label}</span>
            <span className="tabular-nums text-slate-500 text-[10px]">{(d.value / total * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 持股組合：即時市值 / 損益 + 依市值的比例與分群（每群組獨立配色）
const InvestmentTabView = ({ user, db, appId, requestConfirmation }) => {
  const [holdingsGroups, setHoldingsGroups] = useState([]);
  const [prices, setPrices] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isAddHoldingsGroupOpen, setIsAddHoldingsGroupOpen] = useState(false);
  const [newHoldingsGroupName, setNewHoldingsGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState({ open: false, symbol: '' });
  const [newPurchase, setNewPurchase] = useState({ date: getTodayString(), shares: '', price: '' });

  const holdingsRef = useMemo(() => user ? doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'holdings_config') : null, [user, db, appId]);

  const fetchPrices = useCallback(async (groups) => {
    const symbols = new Set();
    groups.forEach(g => (g.stocks || []).forEach(s => { if (s.symbol?.trim()) symbols.add(s.symbol.trim().toUpperCase()); }));
    if (symbols.size === 0) { setLastUpdated(new Date()); return; }
    setPricesLoading(true);
    const cached = getCachedPrices();
    const next = {};
    const toFetch = [];
    for (const sym of symbols) { if (cached[sym]) next[sym] = cached[sym]; else toFetch.push(sym); }
    for (const sym of toFetch) {
      try {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${FINNHUB_API_KEY}`);
        if (res.ok) { const data = await res.json(); if (data.c) next[sym] = { price: data.c, change: data.dp || 0 }; }
      } catch (e) { console.warn(e); }
      await new Promise(r => setTimeout(r, 100));
    }
    if (toFetch.length > 0) setCachedPrices(next);
    setPrices(prev => ({ ...prev, ...next }));
    setLastUpdated(new Date());
    setPricesLoading(false);
  }, []);

  useEffect(() => {
    if (!holdingsRef) return;
    const unsub = onSnapshot(holdingsRef, (s) => {
      const groups = s.exists() ? (s.data().groups || []) : [];
      setHoldingsGroups(groups);
      setLoaded(true);
      if (groups.length > 0) fetchPrices(groups);
    });
    return () => unsub();
  }, [holdingsRef, fetchPrices]);

  // 不等伺服器回覆（本地快取即時生效），離線也能操作
  const saveHoldings = async (newGroups) => { if (holdingsRef) setDoc(holdingsRef, { groups: newGroups }).catch(e => console.error('holdings sync failed:', e)); };

  const addHoldingsGroup = async () => {
    if (!newHoldingsGroupName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await saveHoldings([...holdingsGroups, { id: Date.now().toString(), name: newHoldingsGroupName.trim(), stocks: [] }]);
      setNewHoldingsGroupName('');
      setIsAddHoldingsGroupOpen(false);
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const deleteHoldingsGroup = (id) => requestConfirmation({ message: '確定刪除此群組及所有持股紀錄？', onConfirm: async () => { await saveHoldings(holdingsGroups.filter(g => g.id !== id)); } });

  const addStockToGroup = async (groupId, symbol) => {
    const exists = holdingsGroups.find(g => g.id === groupId)?.stocks?.some(s => s.symbol === symbol);
    if (exists) return;
    const updated = holdingsGroups.map(g => g.id === groupId ? { ...g, stocks: [...(g.stocks || []), { symbol, purchases: [] }] } : g);
    await saveHoldings(updated);
    fetchPrices(updated);
  };

  const deleteStockFromGroup = async (groupId, stockIdx) => {
    await saveHoldings(holdingsGroups.map(g => g.id === groupId ? { ...g, stocks: g.stocks.filter((_, i) => i !== stockIdx) } : g));
  };

  const addPurchaseToStock = async (symbol) => {
    if (!newPurchase.shares || !newPurchase.price) return;
    const purchase = { id: Date.now().toString(), date: newPurchase.date, shares: Number(newPurchase.shares), price: Number(newPurchase.price) };
    await saveHoldings(holdingsGroups.map(g => ({ ...g, stocks: g.stocks.map(s => s.symbol === symbol ? { ...s, purchases: [...s.purchases, purchase] } : s) })));
    setPurchaseModal({ open: false, symbol: '' });
    setNewPurchase({ date: getTodayString(), shares: '', price: '' });
  };

  const deletePurchaseFromStock = async (groupId, symbol, purchaseId) => {
    await saveHoldings(holdingsGroups.map(g => g.id === groupId ? { ...g, stocks: g.stocks.map(s => s.symbol === symbol ? { ...s, purchases: s.purchases.filter(p => p.id !== purchaseId) } : s) } : g));
  };

  const summary = useMemo(() => {
    let totalCost = 0, totalValue = 0;
    const pieData = [];
    const pieColors = [];
    holdingsGroups.forEach((g, gi) => {
      const theme = COLOR_VARIANTS[HOLDINGS_GROUP_THEMES[gi % HOLDINGS_GROUP_THEMES.length]];
      let gValue = 0;
      (g.stocks || []).forEach(s => {
        const shares = s.purchases.reduce((sum, p) => sum + Number(p.shares), 0);
        const cost = s.purchases.reduce((sum, p) => sum + Number(p.shares) * Number(p.price), 0);
        const price = prices[s.symbol]?.price || 0;
        const value = price > 0 ? shares * price : cost;
        totalCost += cost;
        totalValue += value;
        gValue += value;
      });
      if (gValue > 0) { pieData.push({ label: g.name, value: gValue }); pieColors.push(barToHex(theme.bar)); }
    });
    return { totalCost, totalValue, pnl: totalValue - totalCost, pnlPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0, pieData, pieColors };
  }, [holdingsGroups, prices]);

  if (!loaded) return <ViewLoader label="載入持股資料..." />;

  return (
    <div className="pb-24 space-y-5 animate-in fade-in">
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-xl font-bold text-slate-800">持股組合</h2>
          <p className="text-xs text-slate-400 mt-1 tabular-nums">{lastUpdated ? `更新於 ${lastUpdated.toLocaleTimeString()}` : '更新中...'}</p>
        </div>
        <button onClick={() => fetchPrices(holdingsGroups)} className="p-2 rounded-xl bg-white shadow-sm border border-slate-100 text-[#5A7099]">
          <RefreshCw className={`w-5 h-5 ${pricesLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {summary.totalValue > 0 && (
        <div className={`${GLASS_CARD} p-5`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs text-slate-400 uppercase font-bold mb-1">目前總市值</div>
              <div className="text-2xl font-bold text-slate-800 tabular-nums">${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <span className={`text-sm font-bold px-2.5 py-1 rounded-xl ${summary.pnl >= 0 ? 'bg-[#F1FAEE] text-[#2D6A4F]' : 'bg-[#FDECEA] text-[#C0392B]'}`}>
              {summary.pnl >= 0 ? '+' : ''}{summary.pnlPercent.toFixed(2)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4 pt-3 border-t border-slate-200/40">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">總成本</div>
              <div className="text-sm font-bold text-slate-700 tabular-nums">${summary.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="text-right">
              <div className={`text-[10px] font-bold uppercase mb-1 ${summary.pnl >= 0 ? 'text-[#52B788]' : 'text-[#E57373]'}`}>總損益</div>
              <div className={`text-sm font-bold tabular-nums ${summary.pnl >= 0 ? 'text-[#2D6A4F]' : 'text-[#C0392B]'}`}>{summary.pnl >= 0 ? '+' : ''}${summary.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
          {summary.pieData.length > 0 && <HoldingsDonutChart data={summary.pieData} colors={summary.pieColors} />}
        </div>
      )}

      <div>
        {!isAddHoldingsGroupOpen ? (
          <button onClick={() => setIsAddHoldingsGroupOpen(true)} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm hover:border-[#7A96BE] hover:text-[#5A7099] transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> 新增群組
          </button>
        ) : (
          <div className={`${GLASS_CARD} p-3 flex gap-2 animate-in slide-in-from-top-2 duration-200`}>
            <input value={newHoldingsGroupName} onChange={e => setNewHoldingsGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHoldingsGroup()} placeholder="輸入群組名稱" className={`${GLASS_INPUT} py-2 px-3 text-xs`} autoFocus />
            <button onClick={addHoldingsGroup} disabled={isSubmitting} className="bg-slate-800 text-white px-4 rounded-xl font-bold shadow-md hover:bg-slate-700"><Check className="w-4 h-4" /></button>
            <button onClick={() => setIsAddHoldingsGroupOpen(false)} className="bg-slate-100 text-slate-500 px-3 rounded-xl hover:bg-slate-200"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {holdingsGroups.length === 0 && !isAddHoldingsGroupOpen && (
        <div className="text-center text-slate-400 py-10">
          <Layers className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium">尚無持股群組</p>
          <p className="text-xs mt-1">點擊上方按鈕新增群組開始記錄</p>
        </div>
      )}
      {holdingsGroups.map((g, gi) => (
        <HoldingsGroupCard
          key={g.id}
          group={g}
          prices={prices}
          theme={COLOR_VARIANTS[HOLDINGS_GROUP_THEMES[gi % HOLDINGS_GROUP_THEMES.length]]}
          totalPortfolio={summary.totalValue}
          onAddStock={addStockToGroup}
          onDeleteStock={deleteStockFromGroup}
          onAddPurchase={(symbol) => { setPurchaseModal({ open: true, symbol }); setNewPurchase({ date: getTodayString(), shares: '', price: '' }); }}
          onDeletePurchase={deletePurchaseFromStock}
          onDeleteGroup={() => deleteHoldingsGroup(g.id)}
        />
      ))}

      {purchaseModal.open && (
        <ModalWrapper title={`新增買入 — ${purchaseModal.symbol}`} onClose={() => setPurchaseModal({ open: false, symbol: '' })}>
          <div className="space-y-4">
            <InputField label="購買日期" type="date" value={newPurchase.date} onChange={e => setNewPurchase(p => ({ ...p, date: e.target.value }))} />
            <InputField label="股數" type="number" value={newPurchase.shares} onChange={e => setNewPurchase(p => ({ ...p, shares: e.target.value }))} placeholder="10" autoFocus />
            <InputField label="每股價格 (USD)" type="number" step="0.01" value={newPurchase.price} onChange={e => setNewPurchase(p => ({ ...p, price: e.target.value }))} placeholder="480.50" />
            {newPurchase.shares && newPurchase.price && (
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold">投入金額</span>
                <div className="text-lg font-bold text-slate-800 tabular-nums">${(Number(newPurchase.shares) * Number(newPurchase.price)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
            )}
            <GlassButton onClick={() => addPurchaseToStock(purchaseModal.symbol)} className="w-full py-4">
              <Check className="w-4 h-4" /> 確認新增
            </GlassButton>
          </div>
        </ModalWrapper>
      )}
    </div>
  );
};

export { HoldingsStockCard, HoldingsGroupCard, HoldingsDonutChart, InvestmentTabView };
