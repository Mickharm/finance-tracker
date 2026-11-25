import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, Minus } from 'lucide-react';
import { ViewLoader } from '../components/ui';
import { getTodayString } from '../lib/utils';
import { fmt, fmtSigned } from '../lib/format';
import {
  Hero, Section, Row, Divided, Empty, IconDot, Seg, MoneyInput, Field, DatePick, Sheet, LineChart,
} from '../components/v2';

const sum = (list) => list.reduce((s, t) => s + (Number(t.amount) || 0), 0);
const signed = (t) => (t.type === 'expense' ? -1 : 1) * (Number(t.amount) || 0);
const QUICK = [10000, 25000, 30000, 50000];

const PartnerSheet = ({ initial, all, onSave, onDelete, onClose }) => {
  const [f, setF] = useState(initial);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const sameType = all.filter((t) => t.type === f.type && t.id !== f.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const notes = [...new Set(sameType.map((t) => (t.note || '').trim()).filter(Boolean))].slice(0, 6);
  const last = sameType[0];
  return (
    <Sheet title={f.id ? '編輯紀錄' : f.type === 'expense' ? '從儲蓄提領' : '存進儲蓄'} onClose={onClose} submitDisabled={!(Number(f.amount) > 0)}
      onSubmit={() => onSave({ type: f.type, amount: Number(f.amount), date: f.date, note: f.note || '' }, f.id)}
      onDelete={f.id ? () => onDelete(f.id) : undefined}>
      <Seg options={[['saving', '存入'], ['expense', '提領／支出']]} value={f.type} onChange={(type) => set({ type })} />
      <MoneyInput value={f.amount} onChange={(amount) => set({ amount })} autoFocus={!f.id} />
      <div className="flex flex-wrap gap-1.5 justify-end -mt-2">
        {last && <button type="button" onClick={() => set({ amount: Number(last.amount) })} className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">同上次 {fmt(last.amount)}</button>}
        {QUICK.map((v) => <button key={v} type="button" onClick={() => set({ amount: v })} className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white text-slate-500 border border-slate-200 tabular-nums">{fmt(v)}</button>)}
      </div>
      <Field label="日期"><DatePick value={f.date} onChange={(date) => set({ date })} /></Field>
      <Field label="用途／備註">
        <input value={f.note || ''} onChange={(e) => set({ note: e.target.value })} placeholder={f.type === 'expense' ? '拿去做什麼？' : '例如：每月固定存'}
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
        {notes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {notes.map((n) => <button key={n} type="button" onClick={() => set({ note: n })} className="px-2.5 py-1 rounded-full text-[11px] bg-slate-100 text-slate-600">{n}</button>)}
          </div>
        )}
      </Field>
    </Sheet>
  );
};

// 2.0 佳欣儲蓄：餘額 → 存入／提領兩顆大按鈕 → 餘額走勢 → 依年份的紀錄
const PartnerView = ({ partnerTransactions, loading = false, onSave, onRemove }) => {
  const [sheet, setSheet] = useState(null);
  const sorted = useMemo(() => [...partnerTransactions].sort((a, b) => (a.date < b.date ? 1 : -1)), [partnerTransactions]);
  const balance = partnerTransactions.reduce((s, t) => s + signed(t), 0);
  const year = new Date().getFullYear();
  const thisYear = partnerTransactions.filter((t) => String(t.date).startsWith(`${year}-`));
  const yIn = sum(thisYear.filter((t) => t.type !== 'expense'));
  const yOut = sum(thisYear.filter((t) => t.type === 'expense'));

  // 每月月底的餘額
  const trend = useMemo(() => {
    if (!sorted.length) return [];
    const asc = [...sorted].reverse();
    const first = asc[0].date.slice(0, 7);
    const lastYm = getTodayString().slice(0, 7);
    const pts = [];
    let [yy, mm] = first.split('-').map(Number);
    let bal = 0; let idx = 0;
    for (let guard = 0; guard < 600; guard++) {
      const ym = `${yy}-${String(mm).padStart(2, '0')}`;
      while (idx < asc.length && asc[idx].date.slice(0, 7) <= ym) { bal += signed(asc[idx]); idx++; }
      pts.push({ x: `${String(yy).slice(2)}/${mm}`, y: bal });
      if (ym >= lastYm) break;
      mm++; if (mm > 12) { mm = 1; yy++; }
    }
    return pts;
  }, [sorted]);

  const byYear = useMemo(() => {
    const map = new Map();
    for (const t of sorted) { const y = t.date.slice(0, 4); if (!map.has(y)) map.set(y, []); map.get(y).push(t); }
    return [...map.entries()];
  }, [sorted]);
  const [openYears, setOpenYears] = useState(() => new Set([String(year)]));

  const openNew = (type) => setSheet({ id: null, type, amount: '', date: getTodayString(), note: '' });
  const save = (data, id) => { onSave('partner_savings', data, id, id ? '已更新' : data.type === 'expense' ? '已記下提領' : '已存入'); setSheet(null); };

  if (loading) return <ViewLoader label="載入儲蓄資料..." />;
  return (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <Hero label="佳欣儲蓄餘額" value={fmt(balance)} tone={balance < 0 ? 'text-rose-700' : 'text-slate-800'}
        sub={<>{year} 年存入 <b className="text-emerald-700 tabular-nums">{fmt(yIn)}</b>・提領 <b className="text-rose-700 tabular-nums">{fmt(yOut)}</b></>} />

      <div className="grid grid-cols-2 gap-3 -mt-2">
        <button type="button" onClick={() => openNew('saving')} className="py-3 rounded-2xl bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-1.5 active:scale-[0.98]"><Plus className="w-4 h-4" />存入</button>
        <button type="button" onClick={() => openNew('expense')} className="py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-1.5 active:scale-[0.98]"><Minus className="w-4 h-4" />提領</button>
      </div>

      <Section title="餘額走勢">
        <div className="glass-card-fx border rounded-2xl px-3 pt-3 pb-2">
          <LineChart points={trend} color="#6B9A8D" />
        </div>
      </Section>

      <Section title="紀錄" extra={<span className="text-xs text-slate-400">{partnerTransactions.length} 筆</span>}>
        {byYear.length === 0 ? <Empty>還沒有紀錄，從上面的「存入」開始</Empty> : (
          <div className="space-y-3">
            {byYear.map(([y, list]) => {
              const open = openYears.has(y);
              const net = list.reduce((s, t) => s + signed(t), 0);
              return (
                <div key={y}>
                  <button type="button" onClick={() => setOpenYears((s) => { const n = new Set(s); if (n.has(y)) n.delete(y); else n.add(y); return n; })}
                    className="w-full flex justify-between items-center px-1 mb-1 text-xs font-bold text-slate-400">
                    <span>{y} 年・{list.length} 筆 {open ? '▾' : '▸'}</span>
                    <span className={`tabular-nums ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmtSigned(net)}</span>
                  </button>
                  {open && (
                    <Divided>
                      {list.map((t) => (
                        <Row key={t.id}
                          left={<IconDot icon={t.type === 'expense' ? ArrowUpRight : ArrowDownLeft} tone={t.type === 'expense' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'} />}
                          title={t.note || (t.type === 'expense' ? '提領' : '存入')} sub={t.date.replace(/-/g, '/')}
                          right={<span className={t.type === 'expense' ? 'text-rose-700' : 'text-emerald-700'}>{t.type === 'expense' ? '−' : '+'}{fmt(t.amount)}</span>}
                          onClick={() => setSheet({ ...t, amount: Number(t.amount) })} />
                      ))}
                    </Divided>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {sheet && <PartnerSheet key={sheet.id || sheet.type} initial={sheet} all={partnerTransactions} onSave={save} onDelete={(id) => { setSheet(null); onRemove('partner_savings', id, '確定刪除這筆紀錄？'); }} onClose={() => setSheet(null)} />}
    </div>
  );
};

export { PartnerView };
