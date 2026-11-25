import { useState, useEffect, useMemo, useCallback } from 'react';
import { onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Plus, RefreshCw, FolderPlus } from 'lucide-react';
import { ViewLoader } from '../components/ui';
import { COLOR_VARIANTS, HOLDINGS_GROUP_THEMES, barToHex } from '../lib/constants';
import { LEDGER_ID } from '../lib/firebase';
import { FINNHUB_API_KEY, getCachedPrices, getTodayString, setCachedPrices } from '../lib/utils';
import { fmt, fmtSigned, pct } from '../lib/format';
import {
  Hero, HeroButton, Section, Row, Divided, Empty, Chips, Field, SmallInput, Sheet,
} from '../components/v2';

const statOf = (s, prices) => {
  const shares = s.purchases.reduce((a, p) => a + Number(p.shares), 0);
  const cost = s.purchases.reduce((a, p) => a + Number(p.shares) * Number(p.price), 0);
  const q = prices[s.symbol];
  const price = q?.price || 0;
  const value = price > 0 ? shares * price : cost;
  const change = q?.change || 0;
  const day = price > 0 ? value - value / (1 + change / 100) : 0;
  return { shares, cost, avg: shares ? cost / shares : 0, price, value, pnl: price > 0 ? value - cost : 0, change, day, hasPrice: price > 0 };
};
const tone = (n) => (n > 0 ? 'text-emerald-700' : n < 0 ? 'text-rose-700' : 'text-slate-400');
const groupColor = (gi) => barToHex(COLOR_VARIANTS[HOLDINGS_GROUP_THEMES[gi % HOLDINGS_GROUP_THEMES.length]].bar);

// 買入抽屜：選群組（或新開一個）→ 代碼（可點既有的）→ 股數、價格
const BuySheet = ({ groups, initial, onSave, onClose }) => {
  const [groupId, setGroupId] = useState(initial.groupId || groups[0]?.id || '__new');
  const [newGroup, setNewGroup] = useState('');
  const [symbol, setSymbol] = useState(initial.symbol || '');
  const [date, setDate] = useState(getTodayString());
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const known = groups.flatMap((g) => (g.stocks || []).map((s) => [s.symbol, g.id]));
  const pickSymbol = (sym) => { setSymbol(sym); const hit = known.find(([s]) => s === sym); if (hit) setGroupId(hit[1]); };
  const total = Number(shares) * Number(price);
  const ok = symbol.trim() && Number(shares) > 0 && Number(price) > 0 && (groupId !== '__new' || newGroup.trim());
  return (
    <Sheet title="記一筆買入" onClose={onClose} submitDisabled={!ok} submitLabel={total > 0 ? `買入 ${fmt(total, 2)}` : '買入'}
      onSubmit={() => onSave({ groupId, newGroup: newGroup.trim(), symbol: symbol.trim().toUpperCase(), purchase: { id: Date.now().toString(), date, shares: Number(shares), price: Number(price) } })}>
      <Field label="代碼">
        <input value={symbol} onChange={(e) => pickSymbol(e.target.value.toUpperCase())} autoFocus={!initial.symbol} placeholder="例如 VOO"
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-base font-bold uppercase tracking-wide outline-none focus:border-slate-400" />
        {known.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {known.map(([s]) => <button key={s} type="button" onClick={() => pickSymbol(s)} className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${symbol === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>{s}</button>)}
          </div>
        )}
      </Field>
      <Field label="放在哪個群組">
        <Chips options={[...groups.map((g) => [g.id, g.name]), ['__new', '＋ 新群組']]} value={groupId} onChange={setGroupId} />
        {groupId === '__new' && <input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="新群組名稱" className="mt-2 w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400" />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <SmallInput label="股數" inputMode="decimal" value={shares} onChange={(e) => setShares(e.target.value.replace(/[^\d.]/g, ''))} placeholder="10" suffix="股" />
        <SmallInput label="每股價格" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} placeholder="480.50" suffix="USD" />
      </div>
      <Field label="日期"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm tabular-nums" /></Field>
    </Sheet>
  );
};

// 單一持股：數字一覽＋每筆買入（可刪）
const StockSheet = ({ stock, st, onBuyMore, onDeletePurchase, onDeleteStock, onClose }) => (
  <Sheet title={stock.symbol} onClose={onClose} onSubmit={onBuyMore} submitLabel="再買一筆" onDelete={onDeleteStock} deleteLabel="移除">
    <div className="grid grid-cols-3 gap-y-3 text-center">
      {[['市值', fmt(st.value)], ['損益', <span key="p" className={tone(st.pnl)}>{fmtSigned(st.pnl)}</span>], ['報酬', <span key="r" className={tone(st.pnl)}>{st.cost ? pct((st.pnl / st.cost) * 100) : '—'}</span>],
        ['股數', st.shares.toLocaleString()], ['均價', fmt(st.avg, 2)], ['現價', st.hasPrice ? fmt(st.price, 2) : '—']].map(([l, v]) => (
        <div key={l}><div className="text-[11px] text-slate-400">{l}</div><div className="text-sm font-bold tabular-nums text-slate-700">{v}</div></div>
      ))}
    </div>
    <div>
      <div className="text-[11px] font-bold text-slate-400 mb-1.5">買入紀錄・成本 {fmt(st.cost)}</div>
      {stock.purchases.length === 0 ? <Empty>還沒有買入紀錄</Empty> : (
        <Divided>
          {[...stock.purchases].sort((a, b) => (a.date < b.date ? 1 : -1)).map((p) => (
            <Row key={p.id} title={`${p.shares} 股 @ ${fmt(p.price, 2)}`} sub={p.date.replace(/-/g, '/')} right={fmt(Number(p.shares) * Number(p.price))}
              rightSub={<button type="button" onClick={(e) => { e.stopPropagation(); onDeletePurchase(p.id); }} className="text-rose-500 font-bold">刪除</button>} />
          ))}
        </Divided>
      )}
    </div>
  </Sheet>
);

const GroupSheet = ({ group, onRename, onDelete, onClose }) => {
  const [name, setName] = useState(group?.name || '');
  return (
    <Sheet title={group ? '群組' : '新增群組'} onClose={onClose} submitDisabled={!name.trim()} onSubmit={() => onRename(name.trim())}
      onDelete={group ? onDelete : undefined} deleteLabel="刪除群組">
      <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="群組名稱，例如：核心 ETF"
        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
      {group && (group.stocks || []).length > 0 && <p className="text-xs text-rose-600">刪除群組會一起刪掉裡面 {(group.stocks || []).length} 檔持股的買入紀錄。</p>}
    </Sheet>
  );
};

// 2.0 持股：總市值與損益 → 群組比例 → 各群組持股（點一檔看細節）→ 群組管理
const InvestmentTabView = ({ user, db, appId, requestConfirmation }) => {
  const [groups, setGroups] = useState([]);
  const [prices, setPrices] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sheet, setSheet] = useState(null);

  const holdingsRef = useMemo(() => (user ? doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'holdings_config') : null), [user, db, appId]);

  const fetchPrices = useCallback(async (gs, force = false) => {
    const symbols = new Set();
    gs.forEach((g) => (g.stocks || []).forEach((s) => { if (s.symbol?.trim()) symbols.add(s.symbol.trim().toUpperCase()); }));
    if (symbols.size === 0) { setLastUpdated(new Date()); return; }
    setPricesLoading(true);
    const cached = force ? {} : getCachedPrices();
    const next = {};
    const toFetch = [];
    for (const sym of symbols) { if (cached[sym]) next[sym] = cached[sym]; else toFetch.push(sym); }
    for (const sym of toFetch) {
      try {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${FINNHUB_API_KEY}`);
        if (res.ok) { const data = await res.json(); if (data.c) next[sym] = { price: data.c, change: data.dp || 0 }; }
      } catch (e) { console.warn(e); }
      await new Promise((r) => setTimeout(r, 100));
    }
    if (toFetch.length > 0) setCachedPrices(next);
    setPrices((prev) => ({ ...prev, ...next }));
    setLastUpdated(new Date());
    setPricesLoading(false);
  }, []);

  useEffect(() => {
    if (!holdingsRef) return undefined;
    return onSnapshot(holdingsRef, (s) => {
      const gs = s.exists() ? (s.data().groups || []) : [];
      setGroups(gs);
      setLoaded(true);
      if (gs.length > 0) fetchPrices(gs);
    });
  }, [holdingsRef, fetchPrices]);

  const save = (next) => { setGroups(next); if (holdingsRef) setDoc(holdingsRef, { groups: next }).catch((e) => console.error('holdings sync failed:', e)); };

  const summary = useMemo(() => {
    const byGroup = groups.map((g, gi) => {
      const stocks = (g.stocks || []).map((s, idx) => ({ s, idx, st: statOf(s, prices) })).sort((a, b) => b.st.value - a.st.value);
      const total = (k) => stocks.reduce((a, x) => a + x.st[k], 0);
      return { g, gi, stocks, value: total('value'), cost: total('cost'), day: total('day'), color: groupColor(gi) };
    });
    const all = (k) => byGroup.reduce((a, x) => a + x[k], 0);
    return { cost: all('cost'), value: all('value'), day: all('day'), pnl: all('value') - all('cost'), byGroup };
  }, [groups, prices]);

  const buy = ({ groupId, newGroup, symbol, purchase }) => {
    let next = groups.map((g) => ({ ...g, stocks: [...(g.stocks || [])] }));
    let gid = groupId;
    if (gid === '__new') { gid = Date.now().toString(); next.push({ id: gid, name: newGroup, stocks: [] }); }
    // 這個代碼已在別的群組：就記在原本那檔
    const owner = next.find((g) => g.stocks.some((s) => s.symbol === symbol));
    const target = owner || next.find((g) => g.id === gid);
    target.stocks = target.stocks.some((s) => s.symbol === symbol)
      ? target.stocks.map((s) => (s.symbol === symbol ? { ...s, purchases: [...s.purchases, purchase] } : s))
      : [...target.stocks, { symbol, purchases: [purchase] }];
    next = next.map((g) => (g.id === target.id ? target : g));
    save(next);
    fetchPrices(next);
    setSheet(null);
  };
  const deletePurchase = (gid, symbol, pid) => requestConfirmation({ message: '刪除這筆買入紀錄？', onConfirm: () => {
    save(groups.map((g) => (g.id === gid ? { ...g, stocks: g.stocks.map((s) => (s.symbol === symbol ? { ...s, purchases: s.purchases.filter((p) => p.id !== pid) } : s)) } : g)));
  } });
  const deleteStock = (gid, symbol) => { setSheet(null); requestConfirmation({ message: `移除 ${symbol} 和它所有的買入紀錄？`, onConfirm: () => save(groups.map((g) => (g.id === gid ? { ...g, stocks: g.stocks.filter((s) => s.symbol !== symbol) } : g))) }); };
  const saveGroup = (gid, name) => { save(gid ? groups.map((g) => (g.id === gid ? { ...g, name } : g)) : [...groups, { id: Date.now().toString(), name, stocks: [] }]); setSheet(null); };
  const deleteGroup = (gid) => { setSheet(null); requestConfirmation({ message: '刪除這個群組和裡面所有的持股紀錄？', onConfirm: () => save(groups.filter((g) => g.id !== gid)) }); };

  if (!loaded) return <ViewLoader label="載入持股資料..." />;
  const live = sheet?.kind === 'stock' ? groups.find((g) => g.id === sheet.gid)?.stocks?.find((s) => s.symbol === sheet.symbol) : null;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <Hero label="持股市值（美金）" value={fmt(summary.value)}
        sub={summary.cost > 0 && !summary.byGroup.some((x) => x.stocks.some(({ st }) => st.hasPrice)) ? '正在抓最新報價…' : summary.cost > 0 ? <>損益 <b className={tone(summary.pnl)}>{fmtSigned(summary.pnl)}（{pct((summary.pnl / summary.cost) * 100)}）</b>・今天 <b className={tone(summary.day)}>{fmtSigned(summary.day)}</b></> : '還沒有持股'}
        action={<HeroButton icon={Plus} label="買入" onClick={() => setSheet({ kind: 'buy', initial: {} })} />} />

      <div className="px-1 -mt-3">
        <div className="h-3 rounded-full overflow-hidden flex bg-slate-100">
          {summary.value > 0 && summary.byGroup.map((x) => <span key={x.g.id} className="h-full" style={{ width: `${(x.value / summary.value) * 100}%`, backgroundColor: x.color }} />)}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
          {summary.byGroup.filter((x) => x.value > 0).map((x) => (
            <span key={x.g.id} className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: x.color }} />{x.g.name} <b className="tabular-nums text-slate-600">{((x.value / summary.value) * 100).toFixed(0)}%</b></span>
          ))}
        </div>
        <button type="button" onClick={() => fetchPrices(groups, true)} className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
          <RefreshCw className={`w-3 h-3 ${pricesLoading ? 'animate-spin' : ''}`} />{lastUpdated ? `報價更新於 ${lastUpdated.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}，點一下重新抓` : '抓取報價中…'}
        </button>
      </div>

      {summary.byGroup.map((x) => (
        <Section key={x.g.id} title={<button type="button" onClick={() => setSheet({ kind: 'group', group: x.g })} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: x.color }} />{x.g.name}</button>}
          extra={<span className="text-xs tabular-nums"><b className="text-slate-600">{fmt(x.value)}</b> {x.cost > 0 && <span className={tone(x.value - x.cost)}>{pct(((x.value - x.cost) / x.cost) * 100)}</span>}</span>}>
          {x.stocks.length === 0 ? <Empty>這個群組還沒有持股</Empty> : (
            <Divided>
              {x.stocks.map(({ s, st }) => (
                <Row key={s.symbol}
                  left={<span className="w-11 shrink-0 text-[11px] font-bold text-center py-1 rounded-lg bg-slate-100 text-slate-700 truncate">{s.symbol}</span>}
                  title={<span className="flex items-baseline gap-1.5">{summary.value ? `${((st.value / summary.value) * 100).toFixed(1)}%` : ''}{st.hasPrice && <span className={`text-[11px] font-bold ${tone(st.change)}`}>今天 {pct(st.change, 2)}</span>}</span>}
                  sub={`${st.shares} 股・均 ${fmt(st.avg, 2)}・現 ${st.hasPrice ? fmt(st.price, 2) : '—'}`}
                  right={fmt(st.value)}
                  rightSub={st.hasPrice ? <span className={tone(st.pnl)}>{st.cost ? pct((st.pnl / st.cost) * 100) : ''}</span> : <span className="text-slate-300">無報價</span>}
                  onClick={() => setSheet({ kind: 'stock', gid: x.g.id, symbol: s.symbol })} />
              ))}
            </Divided>
          )}
        </Section>
      ))}

      {groups.length === 0 && <Empty>按右上角「買入」記第一筆，會順便建立群組</Empty>}
      <button type="button" onClick={() => setSheet({ kind: 'group', group: null })} className="w-full py-3 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-sm font-bold flex items-center justify-center gap-1.5"><FolderPlus className="w-4 h-4" />新增群組</button>
      <p className="text-[11px] text-slate-400 px-1 -mt-3">點群組名稱可以改名或刪除。</p>

      {sheet?.kind === 'buy' && <BuySheet groups={groups} initial={sheet.initial} onSave={buy} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'stock' && live && (
        <StockSheet stock={live} st={statOf(live, prices)} onClose={() => setSheet(null)}
          onBuyMore={() => setSheet({ kind: 'buy', initial: { groupId: sheet.gid, symbol: sheet.symbol } })}
          onDeletePurchase={(pid) => deletePurchase(sheet.gid, sheet.symbol, pid)}
          onDeleteStock={() => deleteStock(sheet.gid, sheet.symbol)} />
      )}
      {sheet?.kind === 'group' && (
        <GroupSheet key={sheet.group?.id || 'new'} group={sheet.group} onClose={() => setSheet(null)}
          onRename={(name) => saveGroup(sheet.group?.id, name)} onDelete={() => deleteGroup(sheet.group.id)} />
      )}
    </div>
  );
};

export { InvestmentTabView };
