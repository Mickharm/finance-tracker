import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, Minus, ChevronDown } from 'lucide-react';
import { ViewLoader } from '../components/ui';
import { getTodayString } from '../lib/utils';
import { fmt, fmtSigned } from '../lib/format';
import {
  Hero, Section, Row, Divided, Empty, IconDot, Seg, MoneyInput, Field, DatePick, TextInput, Sheet, LineChart,
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
      <Seg size="lg" options={[['saving', '存入'], ['expense', '提領／支出']]} value={f.type} onChange={(type) => set({ type })} />
      <MoneyInput value={f.amount} onChange={(amount) => set({ amount })} autoFocus={!f.id} />
      <div className="flex flex-wrap gap-2 justify-end -mt-1.5">
        {last && <button type="button" onClick={() => set({ amount: Number(last.amount) })} className="chip chip-sm on-emerald tabular-nums">同上次 {fmt(last.amount)}</button>}
        {QUICK.map((v) => <button key={v} type="button" onClick={() => set({ amount: v })} className="chip chip-sm font-num tabular-nums">{fmt(v)}</button>)}
      </div>
      <Field label="日期"><DatePick value={f.date} onChange={(date) => set({ date })} /></Field>
      <Field label="用途／備註">
        <TextInput value={f.note} onChange={(note) => set({ note })} placeholder={f.type === 'expense' ? '拿去做什麼？' : '例如：每月固定存'} />
        {notes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2.5">
            {notes.map((n) => <button key={n} type="button" onClick={() => set({ note: n })} className="chip chip-sm">{n}</button>)}
          </div>
        )}
      </Field>
    </Sheet>
  );
};

// 3.0 佳欣儲蓄：餘額 → 存入／提領兩顆大按鈕 → 餘額走勢 → 依年份的紀錄
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
    <div className="space-y-6 stagger">
      <Hero label="佳欣儲蓄餘額" amount={balance} id="partner-balance" tone={balance < 0 ? 'text-red-600' : ''} tint="tint-rose"
        sub={<>{year} 年存入 <b className="font-num text-emerald-600 tabular-nums">{fmt(yIn)}</b>・提領 <b className="font-num text-red-600 tabular-nums">{fmt(yOut)}</b></>}>
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => openNew('saving')} className="btn btn-ink h-[50px] text-[15px]"><Plus className="w-4 h-4" strokeWidth={2.8} />存入</button>
          <button type="button" onClick={() => openNew('expense')} className="btn btn-glass h-[50px] text-[15px]"><Minus className="w-4 h-4" strokeWidth={2.8} />提領</button>
        </div>
      </Hero>

      <Section title="餘額走勢">
        <div className="glass-card px-4 pt-4 pb-2.5">
          <LineChart points={trend} color="#EE4F82" color2="#FFA9C2" />
        </div>
      </Section>

      <Section title="紀錄" extra={<span className="text-[13px] font-semibold text-slate-400">{partnerTransactions.length} 筆</span>}>
        {byYear.length === 0 ? <Empty>還沒有紀錄，從上面的「存入」開始</Empty> : (
          <div className="space-y-4">
            {byYear.map(([y, list]) => {
              const open = openYears.has(y);
              const net = list.reduce((s, t) => s + signed(t), 0);
              return (
                <div key={y}>
                  <button type="button" onClick={() => setOpenYears((s) => { const n = new Set(s); if (n.has(y)) n.delete(y); else n.add(y); return n; })}
                    className="press w-full flex justify-between items-center px-2 mb-1.5 text-[13px] font-bold text-slate-500">
                    <span className="flex items-center gap-1">{y} 年・{list.length} 筆<ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? '' : '-rotate-90'}`} strokeWidth={2.4} /></span>
                    <span className={`font-num tabular-nums ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtSigned(net)}</span>
                  </button>
                  {open && (
                    <Divided className="fade-up">
                      {list.map((t) => (
                        <Row key={t.id}
                          left={<IconDot icon={t.type === 'expense' ? ArrowUpRight : ArrowDownLeft} tone={t.type === 'expense' ? 'red' : 'emerald'} />}
                          title={t.note || (t.type === 'expense' ? '提領' : '存入')} sub={t.date.replace(/-/g, '/')}
                          right={<span className={t.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}>{t.type === 'expense' ? '−' : '+'}{fmt(t.amount)}</span>}
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
