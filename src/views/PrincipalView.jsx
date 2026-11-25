import { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, Stamp, Landmark, LineChart as LineIcon, Home } from 'lucide-react';
import { ViewLoader } from '../components/ui';
import { DEFAULT_PRINCIPAL_CONFIG } from '../lib/constants';
import { LEDGER_ID } from '../lib/firebase';
import { getTodayString } from '../lib/utils';
import { fmt, fmtSigned, pct, short } from '../lib/format';
import {
  Hero, HeroButton, Section, LinkButton, Row, Divided, Empty, IconDot, MoneyInput, Field, Sheet, LineChart,
} from '../components/v2';

const GROUPS = [
  { section: 'assets', key: 'bank', label: '銀行帳戶', icon: Landmark, tone: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-300' },
  { section: 'assets', key: 'invest', label: '投資', icon: LineIcon, tone: 'bg-blue-50 text-blue-700', bar: 'bg-blue-300' },
  { section: 'liabilities', key: 'encumbrance', label: '房價圈存（負債）', icon: Home, tone: 'bg-rose-50 text-rose-600', bar: 'bg-rose-300' },
];
const sumOf = (list) => (list || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
const dateLabel = (iso) => { const d = new Date(iso); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };

const ItemSheet = ({ initial, onSave, onDelete, onClose }) => {
  const [name, setName] = useState(initial.name || '');
  const [amount, setAmount] = useState(initial.amount === undefined ? '' : Number(initial.amount));
  return (
    <Sheet title={initial.idx === null ? `新增${initial.label}` : `修改${initial.label}`} onClose={onClose} submitDisabled={!name.trim()}
      onSubmit={() => onSave(name.trim(), Number(amount) || 0)} onDelete={initial.idx !== null ? onDelete : undefined} deleteLabel="移除">
      <Field label="名稱">
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus={initial.idx === null} placeholder="例如：郵局、國泰、台股帳戶"
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
      </Field>
      <Field label="目前金額"><MoneyInput value={amount} onChange={setAmount} autoFocus={initial.idx !== null} /></Field>
      {initial.prev !== undefined && <div className="text-xs text-slate-400 text-right -mt-2">上次結算 {fmt(initial.prev)}</div>}
    </Sheet>
  );
};

// 2.0 淨值：現在淨值 → 組成 → 走勢 → 各帳戶（點一列改金額）→ 結算紀錄
const PrincipalView = ({ user, db, appId, requestDelete, requestConfirmation }) => {
  const [config, setConfig] = useState(DEFAULT_PRINCIPAL_CONFIG);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(null); // { kind: 'item', ... } | { kind: 'snapshot' } | { kind: 'record', rec }
  const [snapDate, setSnapDate] = useState(getTodayString());
  const [showAll, setShowAll] = useState(false);

  const configRef = useMemo(() => (user ? doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'principal_config') : null), [user, db, appId]);
  useEffect(() => {
    if (!configRef) return undefined;
    const unsubConfig = onSnapshot(configRef, (s) => (s.exists() ? setConfig(s.data()) : setDoc(configRef, DEFAULT_PRINCIPAL_CONFIG)));
    const q = query(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'principal_history'), orderBy('date', 'desc'));
    const unsubHistory = onSnapshot(q, (s) => { setHistory(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); });
    return () => { unsubConfig(); unsubHistory(); };
  }, [configRef, db, appId]);

  const items = (g) => config?.[g.section]?.[g.key] || [];
  const totals = Object.fromEntries(GROUPS.map((g) => [g.key, sumOf(items(g))]));
  const assets = totals.bank + totals.invest;
  const liab = totals.encumbrance;
  const net = assets - liab;
  const last = history[0];
  const diff = last ? net - Number(last.netPrincipal) : null;
  const prevAmount = (g, name) => {
    const list = last?.details?.[g.section]?.[g.key];
    const hit = (list || []).find((i) => i.name === name);
    return hit ? Number(hit.amount) || 0 : undefined;
  };

  const trend = useMemo(() => {
    const pts = [...history].reverse().map((h) => ({ x: dateLabel(h.date).slice(2), y: Number(h.netPrincipal) || 0 }));
    if (pts.length && pts[pts.length - 1].y !== net) pts.push({ x: '現在', y: net });
    return pts;
  }, [history, net]);

  const write = (next) => { setConfig(next); setDoc(configRef, next).catch((e) => console.error('principal sync failed:', e)); };
  const saveItem = (g, idx, name, amount) => {
    const next = JSON.parse(JSON.stringify(config));
    if (!next[g.section]) next[g.section] = {};
    if (!next[g.section][g.key]) next[g.section][g.key] = [];
    if (idx === null) next[g.section][g.key].push({ name, amount });
    else next[g.section][g.key][idx] = { ...next[g.section][g.key][idx], name, amount };
    write(next);
    setSheet(null);
  };
  const removeItem = (g, idx) => {
    setSheet(null);
    requestConfirmation({ message: '確定移除這個項目？', onConfirm: () => {
      const next = JSON.parse(JSON.stringify(config));
      next[g.section][g.key] = next[g.section][g.key].filter((_, i) => i !== idx);
      write(next);
    } });
  };
  const snapshot = () => {
    addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'principal_history'), {
      date: new Date(snapDate).toISOString(), netPrincipal: net, details: config, createdAt: serverTimestamp(),
    }).catch((e) => console.error('snapshot sync failed:', e));
    setSheet(null);
  };
  const deleteRecord = (id) => { setSheet(null); requestDelete('刪除這筆結算紀錄？', () => deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'principal_history', id))); };

  if (loading) return <ViewLoader label="載入淨值資料..." />;
  const shownHistory = showAll ? history : history.slice(0, 5);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <Hero label="目前淨值" value={fmt(net)}
        sub={last ? <>比 {dateLabel(last.date)} 結算 <b className={diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{fmtSigned(diff)}</b>{Number(last.netPrincipal) ? `（${pct((diff / Math.abs(last.netPrincipal)) * 100)}）` : ''}</> : '還沒有結算過'}
        action={<HeroButton icon={Stamp} label="結算" onClick={() => { setSnapDate(getTodayString()); setSheet({ kind: 'snapshot' }); }} />} />

      <div className="px-1 -mt-3">
        <div className="h-3 rounded-full overflow-hidden flex bg-slate-100">
          {assets > 0 && <span className="bg-emerald-300 h-full" style={{ width: `${(totals.bank / assets) * 100}%` }} />}
          {assets > 0 && <span className="bg-blue-300 h-full flex-1" />}
        </div>
        {liab > 0 && assets > 0 && (
          <div className="h-1.5 mt-1 rounded-full bg-rose-300" style={{ width: `${Math.min(100, (liab / assets) * 100)}%` }} />
        )}
        <div className="grid grid-cols-3 mt-2 text-xs">
          <span><span className="inline-block w-2 h-2 rounded-sm bg-emerald-300 mr-1" />銀行 <b className="tabular-nums text-slate-600">{short(totals.bank)}</b></span>
          <span className="text-center"><span className="inline-block w-2 h-2 rounded-sm bg-blue-300 mr-1" />投資 <b className="tabular-nums text-slate-600">{short(totals.invest)}</b></span>
          <span className="text-right"><span className="inline-block w-2 h-2 rounded-sm bg-rose-300 mr-1" />負債 <b className="tabular-nums text-slate-600">{short(liab)}</b></span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">總資產 {fmt(assets)}・負債比 {assets > 0 ? ((liab / assets) * 100).toFixed(1) : 0}%</div>
      </div>

      <Section title="淨值走勢">
        <div className="glass-card-fx border rounded-2xl px-3 pt-3 pb-2"><LineChart points={trend} /></div>
      </Section>

      {GROUPS.map((g) => (
        <Section key={g.key} title={g.label}
          extra={<span className="flex items-center gap-2"><span className="text-xs tabular-nums text-slate-500 font-bold">{fmt(totals[g.key])}</span>
            <button type="button" onClick={() => setSheet({ kind: 'item', g, idx: null, label: g.label.replace('（負債）', ''), name: '', amount: '' })} className="p-1 rounded-full bg-slate-100 text-slate-500" aria-label={`新增${g.label}`}><Plus className="w-3.5 h-3.5" /></button></span>}>
          {items(g).length === 0 ? <Empty>還沒有項目</Empty> : (
            <Divided>
              {items(g).map((it, idx) => {
                const prev = prevAmount(g, it.name);
                const d = prev === undefined ? null : (Number(it.amount) || 0) - prev;
                return (
                  <Row key={`${it.name}-${idx}`} left={<IconDot icon={g.icon} tone={g.tone} />} title={it.name || '（未命名）'}
                    right={fmt(it.amount)}
                    rightSub={d ? <span className={(g.section === 'liabilities' ? -d : d) > 0 ? 'text-emerald-700' : 'text-rose-700'}>{fmtSigned(d)}</span> : <span className="text-slate-300">{prev === undefined ? '新項目' : '沒變'}</span>}
                    onClick={() => setSheet({ kind: 'item', g, idx, label: g.label.replace('（負債）', ''), name: it.name, amount: it.amount, prev })} />
                );
              })}
            </Divided>
          )}
        </Section>
      ))}
      <p className="text-[11px] text-slate-400 px-1 -mt-3">右側小字是和上次結算相比的變化。金額改完就存，按「結算」才會留下一筆歷史紀錄。</p>

      <Section title="結算紀錄" extra={history.length > 5 && <LinkButton onClick={() => setShowAll(!showAll)}>{showAll ? '收起' : `全部 ${history.length} 筆`}</LinkButton>}>
        {history.length === 0 ? <Empty>還沒有結算紀錄</Empty> : (
          <Divided>
            {shownHistory.map((rec) => {
              const prev = history[history.indexOf(rec) + 1];
              const g = prev ? Number(rec.netPrincipal) - Number(prev.netPrincipal) : null;
              return (
                <Row key={rec.id} title={fmt(rec.netPrincipal)} sub={dateLabel(rec.date)}
                  right={g !== null ? <span className={g >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{fmtSigned(g)}</span> : <span className="text-slate-300 text-xs">第一筆</span>}
                  onClick={() => setSheet({ kind: 'record', rec })} />
              );
            })}
          </Divided>
        )}
      </Section>

      {sheet?.kind === 'item' && (
        <ItemSheet key={`${sheet.g.key}-${sheet.idx}`} initial={sheet} onClose={() => setSheet(null)}
          onSave={(name, amount) => saveItem(sheet.g, sheet.idx, name, amount)} onDelete={() => removeItem(sheet.g, sheet.idx)} />
      )}
      {sheet?.kind === 'snapshot' && (
        <Sheet title="結算淨值" onClose={() => setSheet(null)} onSubmit={snapshot} submitLabel={`記下 ${fmt(net)}`}>
          <p className="text-sm text-slate-500">把目前每個帳戶的金額存成一筆紀錄，之後可以看走勢、比較每個帳戶的變化。</p>
          <Field label="結算日期"><input type="date" value={snapDate} onChange={(e) => setSnapDate(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm tabular-nums" /></Field>
          <Divided>
            {GROUPS.map((g) => <Row key={g.key} left={<IconDot icon={g.icon} tone={g.tone} />} title={g.label} right={fmt(totals[g.key])} />)}
          </Divided>
          {diff !== null && <div className="text-sm text-right text-slate-500">比上次 <b className={diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{fmtSigned(diff)}</b></div>}
        </Sheet>
      )}
      {sheet?.kind === 'record' && (
        <Sheet title={`${dateLabel(sheet.rec.date)} 的結算`} onClose={() => setSheet(null)} onDelete={() => deleteRecord(sheet.rec.id)} deleteLabel="刪除這筆">
          <div className="font-num text-3xl text-slate-800">{fmt(sheet.rec.netPrincipal)}</div>
          {GROUPS.map((g) => {
            const list = sheet.rec.details?.[g.section]?.[g.key] || [];
            if (!list.length) return null;
            return (
              <div key={g.key}>
                <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1 px-1"><span>{g.label}</span><span className="tabular-nums">{fmt(sumOf(list))}</span></div>
                <Divided>{list.map((it, i) => <Row key={i} title={it.name || '（未命名）'} right={fmt(it.amount)} />)}</Divided>
              </div>
            );
          })}
        </Sheet>
      )}
    </div>
  );
};

export { PrincipalView };
