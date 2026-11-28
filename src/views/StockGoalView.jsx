import { useMemo, useState } from 'react';
import { Plus, ArrowDownLeft, ArrowUpRight, Repeat } from 'lucide-react';
import { ViewLoader } from '../components/ui';
import { getFixedDepositAmount, getTodayString } from '../lib/utils';
import { fmt, fmtSigned, pct } from '../lib/format';
import { Tube } from '../components/glass';
import {
  Hero, HeroButton, Section, LinkButton, Row, Divided, Empty, IconDot, Dot, Seg, Field, SmallInput, DateInput, Sheet,
} from '../components/v2';

const n = (v) => Number(v) || 0;
const actualOf = (g) => n(g?.firstrade) + n(g?.ib);
const effectiveOf = (g) => actualOf(g) + n(g?.withdrawal);
const ACCOUNT = { FT: 'Firstrade', IB: 'IB' };

// 每年目標＝(前一年實際＋當年固定存入) × (1＋年化目標)
const withTargets = (goals) => {
  const asc = [...goals].sort((a, b) => a.year - b.year);
  return asc.map((g, i) => {
    const prev = i ? actualOf(asc[i - 1]) : 0;
    const deposit = getFixedDepositAmount(g.year);
    const target = (prev + deposit) * (1 + n(g.roi) / 100);
    const eff = effectiveOf(g);
    return { g, deposit, prev, target, eff, diff: eff - target };
  }).reverse();
};

const GoalSheet = ({ row, onSave, onDelete, onClose }) => {
  const [f, setF] = useState({ roi: row.g.roi ?? '', firstrade: row.g.firstrade ?? '', ib: row.g.ib ?? '', withdrawal: row.g.withdrawal ?? '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value.replace(/[^\d.-]/g, '') }));
  const target = (row.prev + row.deposit) * (1 + n(f.roi) / 100);
  const eff = n(f.firstrade) + n(f.ib) + n(f.withdrawal);
  return (
    <Sheet title={`${row.g.year} 年存股`} onClose={onClose} onDelete={onDelete} deleteLabel="刪除年份"
      onSubmit={() => onSave({ roi: n(f.roi), firstrade: n(f.firstrade), ib: n(f.ib), withdrawal: n(f.withdrawal) })}>
      <div className="grid grid-cols-2 gap-3">
        <SmallInput label="Firstrade" inputMode="decimal" value={f.firstrade} onChange={set('firstrade')} suffix="USD" />
        <SmallInput label="IB" inputMode="decimal" value={f.ib} onChange={set('ib')} suffix="USD" />
        <SmallInput label="提領／調節（加回去算）" inputMode="decimal" value={f.withdrawal} onChange={set('withdrawal')} suffix="USD" />
        <SmallInput label="年化目標" inputMode="decimal" value={f.roi} onChange={set('roi')} suffix="%" />
      </div>
      <div className="glass-card r-tile p-4 text-[13px] text-slate-600 space-y-2">
        <div className="flex justify-between"><span>前一年實際</span><span className="font-num font-semibold tabular-nums">{fmt(row.prev)}</span></div>
        <div className="flex justify-between"><span>今年固定存入</span><span className="font-num font-semibold tabular-nums">{fmt(row.deposit)}</span></div>
        <div className="flex justify-between font-bold text-slate-800"><span>目標（×{(1 + n(f.roi) / 100).toFixed(2)}）</span><span className="font-num tabular-nums">{fmt(target)}</span></div>
        <div className="flex justify-between font-bold"><span className="text-slate-800">實際</span><span className={`font-num tabular-nums ${eff >= target ? 'text-emerald-600' : 'text-slate-800'}`}>{fmt(eff)}（{fmtSigned(eff - target)}）</span></div>
      </div>
    </Sheet>
  );
};

const ExchangeSheet = ({ initial, lastRate, onSave, onDelete, onClose }) => {
  const [f, setF] = useState(initial);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const twd = n(f.usdAmount) * n(f.rate);
  return (
    <Sheet title={f.id ? '編輯換匯' : '記一筆換匯'} onClose={onClose} submitDisabled={!(n(f.usdAmount) > 0 && n(f.rate) > 0)}
      submitLabel={twd > 0 ? `${f.type === 'sell' ? '賣出' : '買入'}，NT${fmt(twd)}` : '儲存'}
      onSubmit={() => onSave({ type: f.type, account: f.account, usdAmount: n(f.usdAmount), rate: n(f.rate), date: f.date }, f.id)}
      onDelete={f.id ? () => onDelete(f.id) : undefined}>
      <Seg size="lg" options={[['buy', '買美金'], ['sell', '賣美金']]} value={f.type} onChange={(type) => set({ type })} />
      <Seg size="lg" options={[['FT', 'Firstrade'], ['IB', 'IB']]} value={f.account} onChange={(account) => set({ account })} />
      <div className="grid grid-cols-2 gap-3">
        <SmallInput label="美金" inputMode="decimal" value={f.usdAmount} onChange={(e) => set({ usdAmount: e.target.value.replace(/[^\d.]/g, '') })} autoFocus={!f.id} suffix="USD" />
        <SmallInput label="匯率" inputMode="decimal" value={f.rate} onChange={(e) => set({ rate: e.target.value.replace(/[^\d.]/g, '') })} placeholder={lastRate ? String(lastRate) : '32.0'} suffix="TWD" />
      </div>
      {lastRate && !f.rate && <button type="button" onClick={() => set({ rate: String(lastRate) })} className="chip chip-sm on-emerald tabular-nums !-mt-1">用上次匯率 {lastRate}</button>}
      <Field label="日期"><DateInput value={f.date} onChange={(date) => set({ date })} /></Field>
    </Sheet>
  );
};

// 3.0 存股：今年進度 → 每年實際 vs 目標 → 每年列表 → 換匯
const StockGoalView = ({ goals, exchanges, onAddYear, onDeleteYear, onSave, onRemove, loading = false }) => {
  const [sheet, setSheet] = useState(null);
  const [showAllEx, setShowAllEx] = useState(false);
  const rows = useMemo(() => withTargets(goals), [goals]);
  const thisYear = new Date().getFullYear();
  const cur = rows.find((r) => r.g.year === thisYear) || rows[0];
  const chartRows = [...rows].reverse();
  const max = Math.max(1, ...chartRows.map((r) => Math.max(r.eff, r.target)));

  const ex = useMemo(() => {
    const buys = exchanges.filter((e) => e.type !== 'sell');
    const sells = exchanges.filter((e) => e.type === 'sell');
    const usd = (l) => l.reduce((s, e) => s + n(e.usdAmount), 0);
    const twd = (l) => l.reduce((s, e) => s + n(e.usdAmount) * n(e.rate), 0);
    const sorted = [...exchanges].sort((a, b) => (a.date < b.date ? 1 : -1));
    return { net: usd(buys) - usd(sells), buyUsd: usd(buys), sellUsd: usd(sells), buyRate: usd(buys) ? twd(buys) / usd(buys) : 0, sellRate: usd(sells) ? twd(sells) / usd(sells) : 0, sorted, lastRate: sorted[0] ? n(sorted[0].rate) : null };
  }, [exchanges]);

  if (loading) return <ViewLoader label="載入存股資料..." />;
  const shownEx = showAllEx ? ex.sorted : ex.sorted.slice(0, 6);
  const newEx = () => setSheet({ kind: 'ex', initial: { id: null, type: 'buy', account: 'FT', usdAmount: '', rate: '', date: getTodayString() } });
  const toneOf = (r) => (r.diff >= 0 ? 'emerald' : r.g.year < thisYear ? 'rose' : 'blue');

  return (
    <div className="space-y-6 stagger">
      {cur ? (
        <Hero label={`${cur.g.year} 年存股（美金）`} amount={cur.eff} id="stockgoal-eff"
          sub={<>目標 <span className="font-num font-semibold">{fmt(cur.target)}</span>・{cur.diff >= 0 ? <b className="font-num text-emerald-600">已達成 {fmtSigned(cur.diff)}</b> : <b className="font-num text-slate-800">還差 {fmt(-cur.diff)}</b>}</>}
          action={<HeroButton icon={Repeat} label="換匯" onClick={newEx} />}>
          <Tube value={cur.eff} max={cur.target || 1} tone={cur.diff >= 0 ? 'emerald' : 'blue'} height={12} />
          <div className="flex justify-between text-xs text-slate-500 mt-2.5">
            <span>年化目標 <span className="font-num font-bold text-slate-700">{n(cur.g.roi)}%</span>・固定存入 <span className="font-num font-bold text-slate-700">{fmt(cur.deposit)}</span></span>
            <span className="font-num font-bold text-slate-700">{cur.target ? Math.round(Math.min(999, (cur.eff / cur.target) * 100)) : 0}%</span>
          </div>
          {n(cur.g.withdrawal) ? <div className="text-xs text-slate-400 mt-1">含提領 {fmt(cur.g.withdrawal)}</div> : null}
        </Hero>
      ) : <Empty>還沒有存股資料</Empty>}

      {chartRows.length > 0 && (
        <Section title="每年實際 vs 目標">
          <div className="glass-card px-4 pt-5 pb-3.5">
            <div className="flex items-end gap-2.5 h-36">
              {chartRows.map((r, i) => (
                <button key={r.g.id} type="button" onClick={() => setSheet({ kind: 'goal', id: r.g.id })} className="press flex-1 h-full relative flex flex-col justify-end" aria-label={`${r.g.year} 年`}>
                  <span className={`vbar grow-y !rounded-[9px] tone-${toneOf(r)} ${r.g.year === thisYear ? 'lit' : ''}`} style={{ height: `${(r.eff / max) * 100}%`, '--i': i }} />
                  <span className="absolute left-[-3px] right-[-3px] h-[2.5px] rounded-full bg-slate-800" style={{ bottom: `calc(${(r.target / max) * 100}% - 1px)`, boxShadow: '0 0 0 1.5px rgba(255,255,255,.75)' }} />
                </button>
              ))}
            </div>
            <div className="flex gap-2.5 mt-1.5">{chartRows.map((r) => <span key={r.g.id} className={`font-num flex-1 text-center text-[11px] font-bold tabular-nums ${r.g.year === thisYear ? 'text-slate-900' : 'text-slate-400'}`}>{String(r.g.year).slice(2)}</span>)}</div>
            <div className="flex justify-center flex-wrap gap-x-3.5 gap-y-1 mt-3 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5"><Dot tone="emerald" className="!w-2 !h-2" />達成</span>
              <span className="flex items-center gap-1.5"><Dot tone="blue" className="!w-2 !h-2" />進行中</span>
              <span className="flex items-center gap-1.5"><Dot tone="rose" className="!w-2 !h-2" />未達成</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-[2.5px] rounded-full bg-slate-800" />目標</span>
            </div>
          </div>
        </Section>
      )}

      <Section title="每年" extra={<LinkButton onClick={onAddYear}><Plus className="w-3.5 h-3.5" strokeWidth={2.6} />新增年份</LinkButton>}>
        {rows.length === 0 ? <Empty>從「新增年份」開始</Empty> : (
          <Divided>
            {rows.map((r) => {
              const status = r.diff >= 0 ? ['達成', 'tag-emerald'] : r.g.year < thisYear ? ['未達成', 'tag-rose'] : ['進行中', 'tag-blue'];
              return (
                <Row key={r.g.id}
                  title={<span className="flex items-center gap-2 font-num">{r.g.year} 年<span className={`tag ${status[1]}`}>{status[0]}</span></span>}
                  sub={`目標 ${fmt(r.target)}・年化 ${n(r.g.roi)}%`}
                  right={fmt(r.eff)} rightSub={<span className={r.diff >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmtSigned(r.diff)}{r.target ? `（${pct((r.diff / r.target) * 100)}）` : ''}</span>}
                  onClick={() => setSheet({ kind: 'goal', id: r.g.id })} />
              );
            })}
          </Divided>
        )}
      </Section>

      <Section title="換匯" extra={<LinkButton onClick={newEx}><Plus className="w-3.5 h-3.5" strokeWidth={2.6} />記一筆</LinkButton>}>
        <div className="glass-card r-tile grid grid-cols-3 text-center py-4 mb-3">
          <div><div className="text-[11px] font-semibold text-slate-500">淨持有美金</div><div className="font-num text-[19px] font-bold text-slate-900 mt-0.5">{fmt(ex.net)}</div></div>
          <div><div className="text-[11px] font-semibold text-slate-500">平均買入</div><div className="font-num text-[19px] font-bold text-emerald-600 mt-0.5">{ex.buyRate ? ex.buyRate.toFixed(2) : '—'}</div></div>
          <div><div className="text-[11px] font-semibold text-slate-500">平均賣出</div><div className="font-num text-[19px] font-bold text-rose-600 mt-0.5">{ex.sellRate ? ex.sellRate.toFixed(2) : '—'}</div></div>
        </div>
        {ex.sorted.length === 0 ? <Empty>還沒有換匯紀錄</Empty> : (
          <>
            <Divided>
              {shownEx.map((e) => {
                const sell = e.type === 'sell';
                return (
                  <Row key={e.id} left={<IconDot icon={sell ? ArrowUpRight : ArrowDownLeft} tone={sell ? 'rose' : 'emerald'} />}
                    title={`${sell ? '賣出' : '買入'} ${fmt(e.usdAmount)} 美金`} sub={`${String(e.date).replace(/-/g, '/')}・${ACCOUNT[e.account] || e.account}・匯率 ${n(e.rate).toFixed(2)}`}
                    right={<span className={sell ? 'text-emerald-600' : 'text-slate-800'}>{sell ? '+' : '−'}NT{fmt(n(e.usdAmount) * n(e.rate))}</span>}
                    onClick={() => setSheet({ kind: 'ex', initial: { ...e, usdAmount: String(e.usdAmount ?? ''), rate: String(e.rate ?? ''), account: e.account || 'FT', type: e.type || 'buy' } })} />
                );
              })}
            </Divided>
            {ex.sorted.length > 6 && <button type="button" onClick={() => setShowAllEx(!showAllEx)} className="press w-full py-3 text-[13px] font-semibold text-slate-500">{showAllEx ? '收起' : `顯示全部 ${ex.sorted.length} 筆`}</button>}
          </>
        )}
      </Section>

      {sheet?.kind === 'goal' && (() => {
        const row = rows.find((r) => r.g.id === sheet.id);
        if (!row) return null;
        return <GoalSheet key={row.g.id} row={row} onClose={() => setSheet(null)}
          onSave={(data) => { onSave('stock_goals', data, row.g.id, `已更新 ${row.g.year} 年`); setSheet(null); }}
          onDelete={() => { setSheet(null); onDeleteYear(row.g.id); }} />;
      })()}
      {sheet?.kind === 'ex' && (
        <ExchangeSheet key={sheet.initial.id || 'new'} initial={sheet.initial} lastRate={ex.lastRate} onClose={() => setSheet(null)}
          onSave={(data, id) => { onSave('usd_exchanges', data, id, id ? '已更新換匯' : '已記下換匯'); setSheet(null); }}
          onDelete={(id) => { setSheet(null); onRemove('usd_exchanges', id, '刪除這筆換匯紀錄？'); }} />
      )}
    </div>
  );
};

export { StockGoalView };
