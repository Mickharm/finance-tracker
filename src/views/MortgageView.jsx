import { useState, useEffect, useMemo } from 'react';
import { Home, Sofa, Coins, Calculator } from 'lucide-react';
import { ViewLoader } from '../components/ui';
import { FINNHUB_API_KEY, getCachedPrices, getTodayString, setCachedPrices } from '../lib/utils';
import { fmt, fmtSigned, short } from '../lib/format';
import { Tube } from '../components/glass';
import {
  Hero, Section, LinkButton, AddButton, Row, Divided, Empty, IconDot, MoneyInput, Field, SmallInput, TextInput, DateInput, Sheet,
} from '../components/v2';

// 新青安房貸（2025-02 撥款）。依青安 3.0「3+3」：2023/8/1 後撥款的案件自撥款日起
// 享滿 3 年 1.775%，之後每年少半碼補貼，第 7 年回到原利率 2.275%（以郵局二年期定儲
// 機動利率 1.72% 計）。前 5 年寬限期只繳息，之後 420 期本息平均攤還，每次利率變動重算月付。
// 本金由實際月付反推：6,880,000 × 1.775% ÷ 12 = 10,177。利率若調整，只要改 rateSteps。
const MORTGAGE_LOAN = {
  principal: 6880000,
  startDate: '2025-02-01',
  totalMonths: 480,
  graceMonths: 60,
  rateSteps: [ // fromPeriod：第幾期起適用（第 1 期 = 撥款當月）
    { fromPeriod: 1, rate: 1.775 },
    { fromPeriod: 37, rate: 1.9 },
    { fromPeriod: 49, rate: 2.025 },
    { fromPeriod: 61, rate: 2.15 },
    { fromPeriod: 73, rate: 2.275 },
  ],
};

const buildMortgageSchedule = ({ principal, startDate, totalMonths, graceMonths, rateSteps }) => {
  const rows = [];
  const [startY, startM] = startDate.split('-').map(Number);
  const today = new Date();
  let balance = principal;
  let payment = 0;
  let prevRate = null;
  let cumulative = 0;
  for (let period = 1; period <= totalMonths; period++) {
    const rate = rateSteps.filter(s => s.fromPeriod <= period).pop().rate;
    const r = rate / 100 / 12;
    let amount;
    if (period <= graceMonths) {
      amount = Math.round(balance * r); // 寬限期：只繳利息
    } else {
      if (rate !== prevRate || period === graceMonths + 1) {
        const remaining = totalMonths - period + 1;
        payment = balance * r / (1 - Math.pow(1 + r, -remaining));
      }
      balance -= payment - balance * r;
      amount = Math.round(payment);
    }
    prevRate = rate;
    cumulative += amount;
    const date = new Date(startY, startM - 1 + period - 1, 1);
    const isPaid = date.getFullYear() < today.getFullYear() || (date.getFullYear() === today.getFullYear() && date.getMonth() < today.getMonth());
    rows.push({ id: period, date, amount, cumulative, rate, isPaid, balance: Math.max(0, Math.round(balance)) });
  }
  return rows;
};

const n = (v) => Number(v) || 0;
const ymLabel = (d) => `${d.getFullYear()}/${d.getMonth() + 1}`;
const fundingTotal = (it) => n(it.amount) * (n(it.shares) > 0 ? n(it.shares) : 1) * (n(it.rate) > 0 ? n(it.rate) : 1);
const COL = { down_payment: 'mortgage_expenses', misc_appliances: 'mortgage_expenses', analysis: 'mortgage_analysis', funding: 'mortgage_funding' };

// 房產相關紀錄的編輯抽屜（四種資料共用）
const RecordSheet = ({ kind, initial, onSave, onDelete, onClose }) => {
  const [f, setF] = useState(initial);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const titles = { down_payment: '頭期雜支', misc_appliances: '家電雜支', analysis: '划算試算項目', funding: '頭期款來源' };
  let ok; let data;
  if (kind === 'funding') {
    ok = (f.source || '').trim() && n(f.amount) > 0;
    data = { source: (f.source || '').trim(), symbol: (f.symbol || '').trim().toUpperCase(), amount: n(f.amount), shares: n(f.shares) || '', rate: n(f.rate) || '', date: f.date || getTodayString(), note: f.note || '' };
  } else if (kind === 'analysis') {
    ok = (f.name || '').trim() && n(f.amount) !== 0;
    data = { name: (f.name || '').trim(), amount: n(f.amount) };
  } else {
    ok = (f.name || '').trim() && n(f.amount) > 0;
    data = { name: (f.name || '').trim(), amount: n(f.amount), date: f.date || getTodayString(), note: f.note || '', brand: f.brand || '', type: kind };
  }
  return (
    <Sheet title={`${f.id ? '編輯' : '新增'}${titles[kind]}`} onClose={onClose} submitDisabled={!ok} onSubmit={() => onSave(data, f.id)} onDelete={f.id ? () => onDelete(f.id) : undefined}>
      {kind === 'funding' ? (
        <>
          <Field label="資金來源"><TextInput value={f.source} onChange={set('source')} placeholder="例如：賣 VOO、定存解約" autoFocus={!f.id} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <SmallInput label="金額／賣出單價" inputMode="decimal" value={f.amount ?? ''} onChange={(e) => set('amount')(e.target.value.replace(/[^\d.]/g, ''))} />
            <SmallInput label="股數（選填）" inputMode="decimal" value={f.shares ?? ''} onChange={(e) => set('shares')(e.target.value.replace(/[^\d.]/g, ''))} suffix="股" />
            <SmallInput label="匯率（台幣填 1）" inputMode="decimal" value={f.rate ?? ''} onChange={(e) => set('rate')(e.target.value.replace(/[^\d.]/g, ''))} placeholder="1" />
            <SmallInput label="股票代碼（選填）" value={f.symbol || ''} onChange={(e) => set('symbol')(e.target.value.toUpperCase())} placeholder="VOO" />
          </div>
          <div className="text-right text-sm text-slate-500">合計 <b className="font-num text-[22px] text-slate-900 ml-1">{fmt(fundingTotal(f))}</b></div>
        </>
      ) : (
        <>
          <Field label="項目"><TextInput value={f.name} onChange={set('name')} placeholder={kind === 'misc_appliances' ? '例如：冰箱' : kind === 'analysis' ? '例如：契稅' : '例如：代書費'} autoFocus={!f.id} /></Field>
          <Field label="金額"><MoneyInput value={f.amount ?? ''} onChange={set('amount')} /></Field>
          {kind === 'misc_appliances' && <Field label="品牌"><TextInput value={f.brand} onChange={set('brand')} placeholder="選填" /></Field>}
        </>
      )}
      {kind !== 'analysis' && (
        <>
          <Field label="日期"><DateInput value={f.date || getTodayString()} onChange={set('date')} /></Field>
          <Field label="備註"><TextInput value={f.note} onChange={set('note')} placeholder="選填" /></Field>
        </>
      )}
    </Sheet>
  );
};

// 月付金額隨時間的階梯圖，標出現在的位置與寬限期
const PaymentSteps = ({ schedule, current }) => {
  const W = 320; const H = 112; const padT = 20; const padB = 20;
  const max = Math.max(...schedule.map((r) => r.amount));
  const X = (i) => (i / (schedule.length - 1)) * W;
  const Y = (v) => padT + (1 - v / max) * (H - padT - padB);
  let d = `M0,${Y(schedule[0].amount).toFixed(1)}`;
  schedule.forEach((r, i) => { if (i && r.amount !== schedule[i - 1].amount) d += ` H${X(i).toFixed(1)} V${Y(r.amount).toFixed(1)}`; });
  d += ` H${W}`;
  const ci = current.id - 1;
  const graceEnd = MORTGAGE_LOAN.graceMonths;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height: H }}>
      <defs>
        <linearGradient id="ps-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2F7BF6" stopOpacity="0.26" /><stop offset="100%" stopColor="#2F7BF6" stopOpacity="0" /></linearGradient>
        <linearGradient id="ps-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3DD1A5" /><stop offset="22%" stopColor="#2F7BF6" /><stop offset="100%" stopColor="#6F64F2" /></linearGradient>
      </defs>
      <rect x="0" y={padT - 6} width={X(graceEnd)} height={H - padT - padB + 6} rx="8" fill="rgba(61, 209, 165, 0.16)" />
      <path d={`${d} V${H - padB} H0 Z`} fill="url(#ps-area)" className="fade-up" style={{ animationDelay: '0.3s', animationDuration: '0.9s' }} />
      <path d={d} fill="none" stroke="url(#ps-line)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" pathLength="1" style={{ strokeDasharray: 1, '--len': 1, animation: 'draw 1.4s var(--ease-out) backwards' }} />
      <line x1={X(ci)} x2={X(ci)} y1="14" y2={H - padB} stroke="#14161F" strokeWidth="1.5" strokeDasharray="2 3" />
      <circle cx={X(ci)} cy={Y(current.amount)} r="8" fill="#2F7BF6" opacity="0.2" style={{ transformOrigin: `${X(ci)}px ${Y(current.amount)}px`, animation: 'breathe 2.6s ease-in-out infinite' }} />
      <circle cx={X(ci)} cy={Y(current.amount)} r="4.5" fill="#fff" stroke="#14161F" strokeWidth="2.4" />
      <text x={Math.min(W - 26, X(ci) + 6)} y="11" fontSize="10.5" fontWeight="700" fill="#14161F">現在</text>
      <text x="6" y={H - padB - 6} fontSize="10" fontWeight="700" fill="#0A7B5D">寬限期</text>
      <text x={W} y="11" fontSize="10.5" fontWeight="600" fill="#8D92A3" textAnchor="end">{fmt(max)}</text>
      <text x="0" y={H - 4} fontSize="10.5" fontWeight="600" fill="#8D92A3">{schedule[0].date.getFullYear()}</text>
      <text x={W} y={H - 4} fontSize="10.5" fontWeight="600" fill="#8D92A3" textAnchor="end">{schedule[schedule.length - 1].date.getFullYear()}</text>
    </svg>
  );
};

const ListBlock = ({ title, items, total, icon, tone, render, onAdd, onOpen }) => (
  <Section title={title} extra={<span className="flex items-center gap-2.5"><span className="font-num text-[13px] font-bold tabular-nums text-slate-500">{fmt(total)}</span>
    <AddButton onClick={onAdd} label={`新增${title}`} /></span>}>
    {items.length === 0 ? <Empty>還沒有紀錄</Empty> : <Divided>{items.map((it) => <Row key={it.id} left={<IconDot icon={icon} tone={tone} />} {...render(it)} onClick={() => onOpen(it)} />)}</Divided>}
  </Section>
);

// 3.0 房產：這個月房貸 → 還款進度與月付階梯 → 每年還款 → 買房花的錢與資金來源 → 划算試算
const MortgageView = ({ mortgageExpenses, mortgageAnalysis, mortgageFunding, loading = false, onSave, onRemove }) => {
  const schedule = useMemo(() => buildMortgageSchedule(MORTGAGE_LOAN), []);
  const current = schedule.find((r) => !r.isPaid) || schedule[schedule.length - 1];
  const paid = schedule.filter((r) => r.isPaid);
  const paidTotal = paid.reduce((s, r) => s + r.amount, 0);
  const balance = paid.length ? paid[paid.length - 1].balance : MORTGAGE_LOAN.principal;
  const nextChange = schedule.find((r) => r.id > current.id && r.amount !== current.amount);
  const years = useMemo(() => {
    const m = new Map();
    for (const r of schedule) { const y = r.date.getFullYear(); if (!m.has(y)) m.set(y, []); m.get(y).push(r); }
    return [...m.entries()];
  }, [schedule]);
  const [showAllYears, setShowAllYears] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [prices, setPrices] = useState({});

  useEffect(() => {
    const symbols = mortgageFunding.map((i) => (i.symbol || '').trim().toUpperCase()).filter(Boolean);
    if (!symbols.length) return undefined;
    let alive = true;
    (async () => {
      const cached = getCachedPrices();
      const next = {}; const toFetch = [];
      for (const s of symbols) { if (cached[s]) next[s] = cached[s].price || cached[s]; else toFetch.push(s); }
      for (const s of toFetch) {
        try { const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${FINNHUB_API_KEY}`); if (res.ok) { const d = await res.json(); if (d.c) next[s] = d.c; } } catch (e) { console.warn(e); }
      }
      if (toFetch.length) { const up = {}; toFetch.forEach((s) => { if (next[s]) up[s] = { price: next[s], change: 0 }; }); setCachedPrices(up); }
      if (alive) setPrices(next);
    })();
    return () => { alive = false; };
  }, [mortgageFunding]);

  const down = mortgageExpenses.filter((e) => e.type === 'down_payment').sort((a, b) => (a.date < b.date ? 1 : -1));
  const misc = mortgageExpenses.filter((e) => e.type === 'misc_appliances').sort((a, b) => (a.date < b.date ? 1 : -1));
  const sum = (l) => l.reduce((s, i) => s + n(i.amount), 0);
  const fundTotal = mortgageFunding.reduce((s, i) => s + fundingTotal(i), 0);
  const open = (kind, item = null) => setSheet({ kind, initial: item ? { ...item } : { id: null, date: getTodayString() } });
  const save = (data, id) => { onSave(COL[sheet.kind], data, id, id ? '已更新' : '已新增'); setSheet(null); };
  const del = (id) => { const col = COL[sheet.kind]; setSheet(null); onRemove(col, id, '確定刪除這筆紀錄？'); };

  if (loading) return <ViewLoader label="載入房產資料..." />;
  const thisYear = new Date().getFullYear();
  const shownYears = showAllYears ? years : years.filter(([y]) => y >= thisYear - 1).slice(0, 5);

  return (
    <div className="space-y-6 stagger">
      <Hero label={`${current.date.getMonth() + 1} 月房貸`} amount={current.amount} id="mortgage-month"
        sub={<>第 <span className="font-num font-bold text-slate-700">{current.id}</span> / {MORTGAGE_LOAN.totalMonths} 期・利率 <span className="font-num font-bold text-slate-700">{current.rate}%</span>{current.id <= MORTGAGE_LOAN.graceMonths ? '・寬限期只繳息' : ''}</>}>
        <Tube value={MORTGAGE_LOAN.principal - balance} max={MORTGAGE_LOAN.principal} tone="blue" height={12} />
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-500">剩餘本金</div>
            <div className="font-num text-[17px] font-bold tabular-nums text-slate-800 mt-0.5 truncate">{fmt(balance)}</div>
          </div>
          <div className="min-w-0 text-right">
            <div className="text-[11px] font-semibold text-slate-500">已繳（{paid.length} 期）</div>
            <div className="font-num text-[17px] font-bold tabular-nums text-slate-800 mt-0.5 truncate">{fmt(paidTotal)}</div>
          </div>
        </div>
      </Hero>

      <Section title="月付會怎麼變">
        <div className="glass-card px-4 pt-4 pb-3">
          <PaymentSteps schedule={schedule} current={current} />
          {nextChange && (
            <div className="mt-2.5 pt-3 flex justify-between items-baseline text-[13px] text-slate-500" style={{ boxShadow: 'inset 0 0.5px 0 0 var(--hair)' }}>
              <span>下次調整 <span className="font-num font-semibold">{ymLabel(nextChange.date)}</span>・利率 <span className="font-num font-semibold">{nextChange.rate}%</span></span>
              <span className="font-num tabular-nums font-bold text-slate-800">{fmt(nextChange.amount)}<span className="text-xs text-red-600 ml-1">{fmtSigned(nextChange.amount - current.amount)}</span></span>
            </div>
          )}
        </div>
      </Section>

      <Section title="每年還款" extra={<LinkButton onClick={() => setShowAllYears(!showAllYears)}>{showAllYears ? '收起' : `全部 ${years.length} 年`}</LinkButton>}>
        <Divided>
          {shownYears.map(([y, rows]) => {
            const rates = [...new Set(rows.map((r) => r.rate))];
            const done = rows.every((r) => r.isPaid);
            return (
              <Row key={y} title={<span className="flex items-center gap-2 font-num">{y} 年{done && <span className="tag tag-emerald">繳完</span>}</span>}
                sub={`${rows.length} 期・利率 ${rates.join(' → ')}%`} right={fmt(rows.reduce((s, r) => s + r.amount, 0))}
                rightSub={<span className="text-slate-400">年底剩 {short(rows[rows.length - 1].balance)}</span>}
                onClick={() => setSheet({ kind: 'year', y, rows })} />
            );
          })}
        </Divided>
      </Section>

      <Section title="買房的錢">
        <div className="glass-card r-tile grid grid-cols-3 text-center py-4">
          <div><div className="text-[11px] font-semibold text-slate-500">頭期款來源</div><div className="font-num text-[19px] font-bold text-slate-900 mt-0.5">{short(fundTotal)}</div></div>
          <div><div className="text-[11px] font-semibold text-slate-500">頭期雜支</div><div className="font-num text-[19px] font-bold text-slate-900 mt-0.5">{short(sum(down))}</div></div>
          <div><div className="text-[11px] font-semibold text-slate-500">家電雜支</div><div className="font-num text-[19px] font-bold text-slate-900 mt-0.5">{short(sum(misc))}</div></div>
        </div>
      </Section>

      <ListBlock title="頭期款來源" items={mortgageFunding} total={fundTotal} icon={Coins} tone="indigo" onAdd={() => open('funding')} onOpen={(it) => open('funding', it)}
        render={(it) => {
          const sym = (it.symbol || '').trim().toUpperCase();
          const p = prices[sym];
          const hold = p && n(it.shares) > 0 ? p * n(it.shares) * (n(it.rate) || 1) - fundingTotal(it) : null;
          return {
            title: <span className="flex items-center gap-1.5">{it.source || '資金來源'}{sym && <span className="tag tag-indigo font-num">{sym}</span>}</span>,
            sub: `${n(it.shares) > 0 ? `${n(it.shares).toLocaleString()} 股 × ${fmt(it.amount, 2)}` : fmt(it.amount)}${n(it.rate) > 1 ? `・匯率 ${it.rate}` : ''}`,
            right: fmt(fundingTotal(it)),
            rightSub: hold !== null ? <span className="text-slate-400">{hold > 0 ? `沒賣現值多 ${short(hold)}` : `沒賣現值少 ${short(-hold)}`}</span> : null,
          };
        }} />
      <ListBlock title="頭期雜支" items={down} total={sum(down)} icon={Home} tone="amber" onAdd={() => open('down_payment')} onOpen={(it) => open('down_payment', it)}
        render={(it) => ({ title: it.name, sub: `${String(it.date || '').replace(/-/g, '/')}${it.note ? `・${it.note}` : ''}`, right: fmt(it.amount) })} />
      <ListBlock title="家電雜支" items={misc} total={sum(misc)} icon={Sofa} tone="blue" onAdd={() => open('misc_appliances')} onOpen={(it) => open('misc_appliances', it)}
        render={(it) => ({ title: it.name, sub: `${String(it.date || '').replace(/-/g, '/')}${it.brand ? `・${it.brand}` : ''}${it.note ? `・${it.note}` : ''}`, right: fmt(it.amount) })} />
      <ListBlock title="划算試算" items={mortgageAnalysis} total={sum(mortgageAnalysis)} icon={Calculator} tone="emerald" onAdd={() => open('analysis')} onOpen={(it) => open('analysis', it)}
        render={(it) => ({ title: it.name, right: fmt(it.amount) })} />

      {sheet?.kind === 'year' && (
        <Sheet title={`${sheet.y} 年還款`} onClose={() => setSheet(null)}>
          <Divided>
            {sheet.rows.map((r) => (
              <Row key={r.id} title={`${r.date.getMonth() + 1} 月・第 ${r.id} 期`} sub={`利率 ${r.rate}%・剩 ${fmt(r.balance)}`} muted={!r.isPaid && r.id !== current.id}
                right={fmt(r.amount)} rightSub={r.isPaid ? <span className="text-emerald-600">已繳</span> : r.id === current.id ? <span className="text-blue-600">這期</span> : null} />
            ))}
          </Divided>
        </Sheet>
      )}
      {sheet && sheet.kind !== 'year' && (
        <RecordSheet key={`${sheet.kind}-${sheet.initial.id || 'new'}`} kind={sheet.kind} initial={sheet.initial} onSave={save} onDelete={del} onClose={() => setSheet(null)} />
      )}
    </div>
  );
};

export { MortgageView };
