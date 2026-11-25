import { useMemo, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Check, Briefcase, TrendingUp } from 'lucide-react';
import { ViewLoader } from '../components/ui';
import { INCOME_CATEGORIES } from '../lib/constants';
import { getTodayString } from '../lib/utils';
import { getDevicePayer } from '../lib/quickAdd';
import { fmt, pct, short, PEOPLE } from '../lib/format';
import {
  Hero, HeroButton, Section, LinkButton, Row, Divided, Empty, PersonDot, PersonPick, MoneyInput, Chips, Field, DatePick, Sheet, StackBar,
} from '../components/v2';

const CAT_LABEL = { 薪水: '薪水', 年終獎金: '年終', 激勵獎金: '激勵', 其他獎金: '其他' };
const ownerOf = (r) => (r.owner === 'partner' ? 'partner' : 'myself');
const sum = (list) => list.reduce((s, i) => s + (Number(i.amount) || 0), 0);
const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

// 記收入抽屜：選人 → 金額 → 分類；選「薪水」時可一鍵帶入上次或目前薪資
const IncomeSheet = ({ initial, incomes, salaryHistory, onSave, onDelete, onClose }) => {
  const [f, setF] = useState(initial);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const lastSalary = useMemo(() => incomes.filter((i) => ownerOf(i) === f.owner && i.category === '薪水' && i.id !== f.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0], [incomes, f.owner, f.id]);
  const currentSalary = useMemo(() => salaryHistory.filter((s) => ownerOf(s) === f.owner).sort((a, b) => (a.date < b.date ? 1 : -1))[0], [salaryHistory, f.owner]);
  const fills = [];
  if (f.category === '薪水') {
    if (lastSalary) fills.push([Number(lastSalary.amount), `同上次 ${fmt(lastSalary.amount)}`]);
    if (currentSalary && Number(currentSalary.amount) !== Number(lastSalary?.amount)) fills.push([Number(currentSalary.amount), `目前月薪 ${fmt(currentSalary.amount)}`]);
  }
  const ok = Number(f.amount) > 0 && f.date;
  return (
    <Sheet title={f.id ? '編輯收入' : '記一筆收入'} onClose={onClose} submitDisabled={!ok}
      onSubmit={() => onSave({ amount: Number(f.amount), category: f.category, owner: f.owner, date: f.date, note: f.note || '' }, f.id)}
      onDelete={f.id ? () => onDelete(f.id) : undefined}>
      <PersonPick value={f.owner} onChange={(owner) => set({ owner })} />
      <MoneyInput value={f.amount} onChange={(amount) => set({ amount })} autoFocus={!f.id} />
      {fills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-end -mt-2">
          {fills.map(([v, l]) => (
            <button key={l} type="button" onClick={() => set({ amount: v })} className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 active:scale-95">{l}</button>
          ))}
        </div>
      )}
      <Field label="分類"><Chips options={INCOME_CATEGORIES.map((c) => [c, c])} value={f.category} onChange={(category) => set({ category })} /></Field>
      <Field label="日期"><DatePick value={f.date} onChange={(date) => set({ date })} /></Field>
      <Field label="備註（可不填）">
        <input value={f.note || ''} onChange={(e) => set({ note: e.target.value })} placeholder="例如：11 月薪資、Q3 激勵"
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
      </Field>
    </Sheet>
  );
};

// 薪資抽屜：這個人的調薪歷程；上面新增或修改一筆
const SalarySheet = ({ owner, history, onSave, onDelete, onClose }) => {
  const blank = { id: null, amount: '', date: getTodayString() };
  const [f, setF] = useState(blank);
  const list = history.filter((s) => ownerOf(s) === owner).sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <Sheet title={`${PEOPLE[owner].name}的月薪`} onClose={onClose} submitLabel={f.id ? '更新這筆' : '記下調薪'} submitDisabled={!(Number(f.amount) > 0)}
      onSubmit={() => { onSave({ owner, amount: Number(f.amount), date: f.date }, f.id); setF(blank); }}
      onDelete={f.id ? () => { onDelete(f.id); setF(blank); } : undefined}>
      <MoneyInput value={f.amount} onChange={(amount) => setF((p) => ({ ...p, amount }))} />
      <Field label="生效日期"><input type="date" value={f.date} onChange={(e) => setF((p) => ({ ...p, date: e.target.value }))} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm tabular-nums" /></Field>
      <div>
        <div className="text-[11px] font-bold text-slate-400 mb-1.5">歷程（點一筆可以修改）</div>
        {list.length === 0 ? <Empty>還沒有調薪紀錄</Empty> : (
          <Divided>
            {list.map((s, i) => {
              const prev = list[i + 1];
              const g = prev && Number(prev.amount) > 0 ? ((s.amount - prev.amount) / prev.amount) * 100 : null;
              return (
                <Row key={s.id} title={fmt(s.amount)} sub={s.date.replace(/-/g, '/')} onClick={() => setF({ id: s.id, amount: Number(s.amount), date: s.date })}
                  right={g !== null ? <span className={g >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{pct(g)}</span> : <span className="text-slate-300 text-xs">起薪</span>} />
              );
            })}
          </Divided>
        )}
      </div>
    </Sheet>
  );
};

// 2.0 收入頁：今年收入 → 這個月薪水進帳了沒 → 每月長條（點月份篩選）→ 組成 → 月薪 → 明細
const IncomeView = ({ incomes, salaryHistory, selectedDate, loading = false, onSave, onRemove, onRequestHistory }) => {
  const [year, setYear] = useState(selectedDate.getFullYear());
  const [selMonth, setSelMonth] = useState(null);
  const [sheet, setSheet] = useState(null); // { kind: 'income', initial } | { kind: 'salary', owner }

  const now = new Date();
  const isThisYear = year === now.getFullYear();
  const yearList = useMemo(() => incomes.filter((i) => String(i.date || '').startsWith(`${year}-`)), [incomes, year]);
  const total = sum(yearList);
  // 去年同期：今年看到今天為止；過去的年份就整年比
  const cutoff = isThisYear ? getTodayString().slice(5) : '12-31';
  const lastSame = sum(incomes.filter((i) => String(i.date || '').startsWith(`${year - 1}-`) && i.date.slice(5) <= cutoff));
  const yoy = lastSame > 0 ? ((total - lastSame) / lastSame) * 100 : null;

  const byPerson = { myself: sum(yearList.filter((i) => ownerOf(i) === 'myself')), partner: sum(yearList.filter((i) => ownerOf(i) === 'partner')) };
  const months = useMemo(() => Array.from({ length: 12 }, (_, m) => {
    const list = yearList.filter((i) => Number(i.date.slice(5, 7)) - 1 === m);
    return { myself: sum(list.filter((i) => ownerOf(i) === 'myself')), partner: sum(list.filter((i) => ownerOf(i) === 'partner')) };
  }), [yearList]);
  const monthMax = Math.max(1, ...months.map((m) => m.myself + m.partner));

  const scoped = selMonth === null ? yearList : yearList.filter((i) => Number(i.date.slice(5, 7)) - 1 === selMonth);
  const scopedTotal = sum(scoped);
  const cats = INCOME_CATEGORIES.map((c) => {
    const list = scoped.filter((i) => i.category === c);
    return { c, total: sum(list), myself: sum(list.filter((i) => ownerOf(i) === 'myself')), partner: sum(list.filter((i) => ownerOf(i) === 'partner')) };
  }).filter((r) => r.total > 0);

  // 本月薪水
  const ym = getTodayString().slice(0, 7);
  const salaryThisMonth = (owner) => incomes.find((i) => ownerOf(i) === owner && i.category === '薪水' && String(i.date).startsWith(ym));
  const latestSalary = (owner) => salaryHistory.filter((s) => ownerOf(s) === owner).sort((a, b) => (a.date < b.date ? 1 : -1));

  const grouped = (() => {
    const map = new Map();
    for (const i of [...scoped].sort((a, b) => (a.date < b.date ? 1 : -1))) {
      const k = i.date.slice(0, 7);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(i);
    }
    return [...map.entries()];
  })();

  const openNew = (patch = {}) => setSheet({ kind: 'income', initial: { id: null, owner: getDevicePayer() || 'myself', amount: '', category: '薪水', date: getTodayString(), note: '', ...patch } });
  const saveIncome = (data, id) => { onSave('incomes', data, id, id ? '已更新收入' : '已入帳'); setSheet(null); };
  const deleteIncome = (id) => { setSheet(null); onRemove('incomes', id, '確定刪除這筆收入？'); };

  if (loading) return <ViewLoader label="載入收入資料..." />;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <Hero
        label={(
          <span className="flex items-center gap-1">
            <button type="button" onClick={() => { setYear(year - 1); setSelMonth(null); if (onRequestHistory) { onRequestHistory(year - 1); onRequestHistory(year - 2); } }} className="p-0.5 -ml-1 text-slate-400" aria-label="前一年"><ChevronLeft className="w-3.5 h-3.5" /></button>
            {year} 年收入
            <button type="button" onClick={() => { setYear(year + 1); setSelMonth(null); if (onRequestHistory) onRequestHistory(year + 1); }} className="p-0.5 text-slate-400" aria-label="下一年"><ChevronRight className="w-3.5 h-3.5" /></button>
          </span>
        )}
        value={fmt(total)}
        sub={yoy !== null ? <>比去年{isThisYear ? '同期' : ''} <b className={yoy >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{pct(yoy)}</b>（{fmt(lastSame)}）</> : '去年沒有資料可以比'}
        action={<HeroButton icon={Plus} label="記收入" onClick={() => openNew()} />}
      />

      <div className="px-1 -mt-3">
        <StackBar parts={[{ key: 'm', value: byPerson.myself, bar: PEOPLE.myself.bar }, { key: 'p', value: byPerson.partner, bar: PEOPLE.partner.bar }]} height="h-2" />
        <div className="flex justify-between mt-1.5 text-xs">
          <span className={PEOPLE.myself.text}><b>士程</b> {fmt(byPerson.myself)}</span>
          <span className={PEOPLE.partner.text}>{fmt(byPerson.partner)} <b>佳欣</b></span>
        </div>
      </div>

      {isThisYear && (
        <Section title={`${now.getMonth() + 1} 月薪水`}>
          <div className="grid grid-cols-2 gap-3">
            {['myself', 'partner'].map((owner) => {
              const got = salaryThisMonth(owner);
              const expect = latestSalary(owner)[0];
              return got ? (
                <button key={owner} type="button" onClick={() => setSheet({ kind: 'income', initial: { ...got, amount: Number(got.amount) } })} className="glass-card-fx border rounded-2xl p-3 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold"><span className={PEOPLE[owner].text}>{PEOPLE[owner].name}</span><Check className="w-3.5 h-3.5 text-emerald-600" /><span className="text-slate-400 font-normal">{md(got.date)} 入帳</span></div>
                  <div className="font-num text-xl text-slate-800 mt-1">{fmt(got.amount)}</div>
                </button>
              ) : (
                <button key={owner} type="button" onClick={() => openNew({ owner, amount: expect ? Number(expect.amount) : '' })} className="rounded-2xl p-3 text-left border border-dashed border-slate-300 bg-white/40 active:scale-[0.98]">
                  <div className="text-xs font-bold"><span className={PEOPLE[owner].text}>{PEOPLE[owner].name}</span> <span className="text-slate-400 font-normal">還沒記</span></div>
                  <div className="text-sm font-bold text-slate-600 mt-1.5 flex items-center gap-1"><Plus className="w-3.5 h-3.5" />{expect ? `記 ${fmt(expect.amount)}` : '記薪水'}</div>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="每月" extra={selMonth !== null && <LinkButton onClick={() => setSelMonth(null)}>看全年</LinkButton>}>
        <div className="glass-card-fx border rounded-2xl px-3 pt-4 pb-3">
          <div className="grid grid-cols-12 gap-1 items-end h-32">
            {months.map((m, i) => {
              const t = m.myself + m.partner;
              const on = selMonth === null || selMonth === i;
              return (
                <button key={i} type="button" onClick={() => setSelMonth(selMonth === i ? null : i)} aria-label={`${i + 1} 月 ${fmt(t)}`}
                  className={`h-full flex flex-col justify-end transition-opacity ${on ? '' : 'opacity-30'}`}>
                  {t > 0 && <span className="text-[8px] text-slate-400 tabular-nums text-center mb-0.5">{short(t).replace('萬', 'w')}</span>}
                  <span className="w-full flex flex-col-reverse rounded-sm overflow-hidden" style={{ height: `${(t / monthMax) * 100}%` }}>
                    <span className={PEOPLE.myself.bar} style={{ height: `${t ? (m.myself / t) * 100 : 0}%` }} />
                    <span className={PEOPLE.partner.bar} style={{ height: `${t ? (m.partner / t) * 100 : 0}%` }} />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-12 gap-1 mt-1">
            {months.map((_, i) => <span key={i} className={`text-center text-[9px] tabular-nums ${selMonth === i ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>{i + 1}</span>)}
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2">單位：w＝萬。點一個月，下面只看那個月。</p>
        </div>
      </Section>

      {cats.length > 0 && (
        <Section title={selMonth === null ? '收入組成' : `${selMonth + 1} 月組成`} extra={<span className="text-xs text-slate-400 tabular-nums">{fmt(scopedTotal)}</span>}>
          <Divided>
            {cats.map((r) => (
              <div key={r.c} className="px-3 py-2.5">
                <div className="flex justify-between text-sm"><span className="font-bold text-slate-700">{r.c}</span><span className="tabular-nums text-slate-700 font-bold">{fmt(r.total)} <span className="text-[11px] text-slate-400 font-normal">{Math.round((r.total / scopedTotal) * 100)}%</span></span></div>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden flex" style={{ width: `${Math.max(8, (r.total / cats[0].total) * 100)}%` }}>
                  <span className={PEOPLE.myself.bar} style={{ width: `${(r.myself / r.total) * 100}%` }} />
                  <span className={PEOPLE.partner.bar} style={{ width: `${(r.partner / r.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </Divided>
        </Section>
      )}

      <Section title="月薪">
        <Divided>
          {['myself', 'partner'].map((owner) => {
            const list = latestSalary(owner);
            const cur = list[0];
            const first = list[list.length - 1];
            const grow = cur && first && first !== cur && Number(first.amount) > 0 ? ((cur.amount - first.amount) / first.amount) * 100 : null;
            return (
              <Row key={owner} left={<PersonDot owner={owner} />} title={cur ? fmt(cur.amount) : '還沒設定'} muted={!cur}
                sub={cur ? `${cur.date.slice(0, 7).replace('-', '/')} 起・調過 ${Math.max(0, list.length - 1)} 次` : '點這裡記下目前月薪'}
                right={grow !== null ? <span className="text-emerald-700 flex items-center gap-0.5 justify-end"><TrendingUp className="w-3.5 h-3.5" />{pct(grow, 0)}</span> : <Briefcase className="w-4 h-4 text-slate-300 ml-auto" />}
                rightSub={grow !== null ? <span className="text-slate-400">從 {fmt(first.amount)}</span> : null}
                onClick={() => setSheet({ kind: 'salary', owner })} />
            );
          })}
        </Divided>
      </Section>

      <Section title={selMonth === null ? '明細' : `${selMonth + 1} 月明細`} extra={<span className="text-xs text-slate-400">{scoped.length} 筆</span>}>
        {grouped.length === 0 ? <Empty>這段期間沒有收入紀錄</Empty> : (
          <div className="space-y-3">
            {grouped.map(([k, list]) => (
              <div key={k}>
                <div className="flex justify-between px-1 mb-1 text-xs font-bold text-slate-400"><span>{Number(k.slice(5))} 月</span><span className="tabular-nums">{fmt(sum(list))}</span></div>
                <Divided>
                  {list.map((i) => (
                    <Row key={i.id} left={<PersonDot owner={ownerOf(i)} />} title={i.note || i.category} sub={`${md(i.date)}・${CAT_LABEL[i.category] || i.category}`}
                      right={<span className="text-emerald-700">+{fmt(i.amount)}</span>}
                      onClick={() => setSheet({ kind: 'income', initial: { ...i, owner: ownerOf(i), amount: Number(i.amount) } })} />
                  ))}
                </Divided>
              </div>
            ))}
          </div>
        )}
      </Section>

      {sheet?.kind === 'income' && (
        <IncomeSheet initial={sheet.initial} incomes={incomes} salaryHistory={salaryHistory} onSave={saveIncome} onDelete={deleteIncome} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'salary' && (
        <SalarySheet owner={sheet.owner} history={salaryHistory}
          onSave={(data, id) => onSave('salary_history', data, id, id ? '已更新月薪' : '已記下調薪')}
          onDelete={(id) => onRemove('salary_history', id, '確定刪除這筆調薪紀錄？')}
          onClose={() => setSheet(null)} />
      )}
    </div>
  );
};

export { IncomeView };
