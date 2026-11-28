import { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Stamp, Landmark, LineChart as LineIcon, Home } from 'lucide-react';
import { ViewLoader } from '../components/ui';
import { DEFAULT_PRINCIPAL_CONFIG } from '../lib/constants';
import { LEDGER_ID } from '../lib/firebase';
import { getTodayString } from '../lib/utils';
import { fmt, fmtSigned, pct, short } from '../lib/format';
import { Money, StackTube } from '../components/glass';
import {
  Hero, HeroButton, Section, LinkButton, AddButton, Row, Divided, Empty, IconDot, Dot, MoneyInput, Field, TextInput, DateInput, Sheet, LineChart,
} from '../components/v2';

const GROUPS = [
  { section: 'assets', key: 'bank', label: '銀行帳戶', icon: Landmark, tone: 'emerald' },
  { section: 'assets', key: 'invest', label: '投資', icon: LineIcon, tone: 'blue' },
  { section: 'liabilities', key: 'encumbrance', label: '房價圈存（負債）', icon: Home, tone: 'red' },
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
        <TextInput value={name} onChange={setName} autoFocus={initial.idx === null} placeholder="例如：郵局、國泰、台股帳戶" />
      </Field>
      <Field label="目前金額"><MoneyInput value={amount} onChange={setAmount} autoFocus={initial.idx !== null} /></Field>
      {initial.prev !== undefined && <div className="text-[13px] text-slate-500 text-right -mt-2">上次結算 <span className="font-num font-semibold">{fmt(initial.prev)}</span></div>}
    </Sheet>
  );
};

// 3.0 淨值：現在淨值 → 組成 → 走勢 → 各帳戶（點一列改金額）→ 結算紀錄
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
    <div className="space-y-6 stagger">
      <Hero label="目前淨值" amount={net} id="principal-net"
        sub={last ? <>比 {dateLabel(last.date)} 結算 <b className={`font-num ${diff >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtSigned(diff)}</b>{Number(last.netPrincipal) ? `（${pct((diff / Math.abs(last.netPrincipal)) * 100)}）` : ''}</> : '還沒有結算過'}
        action={<HeroButton icon={Stamp} label="結算" onClick={() => { setSnapDate(getTodayString()); setSheet({ kind: 'snapshot' }); }} />}>
        <StackTube height={12} parts={assets > 0 ? [{ key: 'bank', value: totals.bank, tone: 'emerald' }, { key: 'invest', value: totals.invest, tone: 'blue' }] : []} />
        {liab > 0 && assets > 0 && (
          <div className="mt-1.5" style={{ width: `${Math.min(100, (liab / assets) * 100)}%` }}>
            <StackTube height={6} parts={[{ key: 'liab', value: liab, tone: 'red' }]} />
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[['銀行', totals.bank, 'emerald'], ['投資', totals.invest, 'blue'], ['負債', liab, 'red']].map(([l, v, t]) => (
            <div key={l} className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><Dot tone={t} className="!w-2 !h-2" />{l}</div>
              <div className="font-num text-[17px] font-bold tabular-nums text-slate-800 mt-0.5 truncate">{short(v)}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-500 mt-3 pt-3" style={{ boxShadow: 'inset 0 0.5px 0 0 var(--hair)' }}>總資產 <span className="font-num font-bold text-slate-700">{fmt(assets)}</span>・負債比 <span className="font-num font-bold text-slate-700">{assets > 0 ? ((liab / assets) * 100).toFixed(1) : 0}%</span></div>
      </Hero>

      <Section title="淨值走勢">
        <div className="glass-card px-4 pt-4 pb-2.5"><LineChart points={trend} color="#5F7FA3" color2="#9399AB" /></div>
      </Section>

      {GROUPS.map((g) => (
        <Section key={g.key} title={g.label}
          extra={<span className="flex items-center gap-2.5"><span className="font-num text-[13px] tabular-nums text-slate-500 font-bold">{fmt(totals[g.key])}</span>
            <AddButton label={`新增${g.label}`} onClick={() => setSheet({ kind: 'item', g, idx: null, label: g.label.replace('（負債）', ''), name: '', amount: '' })} /></span>}>
          {items(g).length === 0 ? <Empty>還沒有項目</Empty> : (
            <Divided>
              {items(g).map((it, idx) => {
                const prev = prevAmount(g, it.name);
                const d = prev === undefined ? null : (Number(it.amount) || 0) - prev;
                return (
                  <Row key={`${it.name}-${idx}`} left={<IconDot icon={g.icon} tone={g.tone} />} title={it.name || '（未命名）'}
                    right={fmt(it.amount)}
                    rightSub={d ? <span className={(g.section === 'liabilities' ? -d : d) > 0 ? 'text-emerald-700' : 'text-red-700'}>{fmtSigned(d)}</span> : <span className="text-slate-400">{prev === undefined ? '新項目' : '沒變'}</span>}
                    onClick={() => setSheet({ kind: 'item', g, idx, label: g.label.replace('（負債）', ''), name: it.name, amount: it.amount, prev })} />
                );
              })}
            </Divided>
          )}
        </Section>
      ))}
      <p className="text-xs text-slate-400 px-2 !-mt-3">右側小字是和上次結算相比的變化。金額改完就存，按「結算」才會留下一筆歷史紀錄。</p>

      <Section title="結算紀錄" extra={history.length > 5 && <LinkButton onClick={() => setShowAll(!showAll)}>{showAll ? '收起' : `全部 ${history.length} 筆`}</LinkButton>}>
        {history.length === 0 ? <Empty>還沒有結算紀錄</Empty> : (
          <Divided>
            {shownHistory.map((rec) => {
              const prev = history[history.indexOf(rec) + 1];
              const g = prev ? Number(rec.netPrincipal) - Number(prev.netPrincipal) : null;
              return (
                <Row key={rec.id} title={fmt(rec.netPrincipal)} sub={dateLabel(rec.date)}
                  right={g !== null ? <span className={g >= 0 ? 'text-emerald-700' : 'text-red-700'}>{fmtSigned(g)}</span> : <span className="text-slate-400 text-xs">第一筆</span>}
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
          <p className="text-sm text-slate-600 leading-relaxed">把目前每個帳戶的金額存成一筆紀錄，之後可以看走勢、比較每個帳戶的變化。</p>
          <Field label="結算日期"><DateInput value={snapDate} onChange={setSnapDate} /></Field>
          <Divided>
            {GROUPS.map((g) => <Row key={g.key} left={<IconDot icon={g.icon} tone={g.tone} />} title={g.label} right={fmt(totals[g.key])} />)}
          </Divided>
          {diff !== null && <div className="text-sm text-right text-slate-500">比上次 <b className={`font-num ${diff >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtSigned(diff)}</b></div>}
        </Sheet>
      )}
      {sheet?.kind === 'record' && (
        <Sheet title={`${dateLabel(sheet.rec.date)} 的結算`} onClose={() => setSheet(null)} onDelete={() => deleteRecord(sheet.rec.id)} deleteLabel="刪除這筆">
          <Money value={sheet.rec.netPrincipal} className="text-[38px] money-ink" />
          {GROUPS.map((g) => {
            const list = sheet.rec.details?.[g.section]?.[g.key] || [];
            if (!list.length) return null;
            return (
              <div key={g.key}>
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5 px-2"><span>{g.label}</span><span className="font-num tabular-nums">{fmt(sumOf(list))}</span></div>
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
