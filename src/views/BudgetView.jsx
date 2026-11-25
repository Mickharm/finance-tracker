import { useMemo, useState } from 'react';
import { Plus, Sparkles, Smartphone, Check } from 'lucide-react';
import { budgetPlan, FLEX_DEFAULT } from '../lib/budget';
import { backtestClassifier, getDevicePayer, setDevicePayer } from '../lib/quickAdd';
import { fmt } from '../lib/format';
import CategoryIcon from '../components/CategoryIcon';
import { Hero, Section, Row, Divided, Empty, Chips, Seg, PersonPick, MoneyInput, Field, SmallInput, Sheet } from '../components/v2';

const pctOf = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');
// 新增的分類放進這個（畫面上看不到的）底層群組；舊資料的群組維持原樣，正式版才讀得到
const NEW_GROUP = '其他';

// 設定裡的分類攤平成一層：[{ type, group, name, budget }]
const flatCats = (groups, type) => (groups || []).flatMap((g) => (g.items || []).map((i) => ({ type, group: g.name, name: i.name, budget: Number(i.budget) || 0 })));

const addCat = (groups, name, budget) => {
  const next = (groups || []).map((g) => ({ ...g, items: [...(g.items || [])] }));
  let g = next.find((x) => x.name === NEW_GROUP);
  if (!g) { g = { name: NEW_GROUP, items: [] }; next.push(g); }
  g.items.push({ name, budget: Number(budget) || 0 });
  return next;
};
const updateCat = (groups, group, oldName, patch) => (groups || []).map((g) => (g.name !== group ? g : { ...g, items: g.items.map((i) => (i.name === oldName ? { ...i, ...patch } : i)) }));
const removeCat = (groups, group, name) => (groups || [])
  .map((g) => (g.name !== group ? g : { ...g, items: g.items.filter((i) => i.name !== name) }))
  .filter((g) => g.items.length > 0);

// 分類抽屜（新增／修改／刪除）。名稱只在「還沒有任何紀錄」時能改，避免舊紀錄對不上
const CategorySheet = ({ initial, usedCount, existing, onSave, onDelete, onClose }) => {
  const [name, setName] = useState(initial.name || '');
  const [budget, setBudget] = useState(initial.type === 'annual' ? initial.budget ?? '' : '');
  const isNew = !initial.name;
  const canRename = isNew || usedCount === 0;
  const clash = name.trim() && name.trim() !== initial.name && existing.includes(name.trim());
  return (
    <Sheet title={isNew ? (initial.type === 'annual' ? '新增年度項目' : '新增分類') : name} onClose={onClose}
      submitDisabled={!name.trim() || clash} onSubmit={() => onSave(name.trim(), Number(budget) || 0)}
      onDelete={!isNew ? onDelete : undefined}>
      <Field label="名稱">
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canRename} autoFocus={isNew} placeholder={initial.type === 'annual' ? '例如：車險' : '例如：寵物'}
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500" />
        {clash && <div className="text-xs text-rose-600 mt-1">已經有這個名稱了</div>}
        {!canRename && <div className="text-[11px] text-slate-400 mt-1">今年已有 {usedCount} 筆紀錄用這個分類，名稱不能改。</div>}
      </Field>
      {initial.type === 'annual' && <Field label="一年的預算"><MoneyInput value={budget} onChange={setBudget} /></Field>}
      {!isNew && usedCount > 0 && <p className="text-[11px] text-slate-400">刪除後，舊紀錄還會保留原本的分類名稱。</p>}
    </Sheet>
  );
};

// 固定支出抽屜：每月自動入帳的項目
const FixedSheet = ({ initial, monthlyCats, onSave, onDelete, onClose }) => {
  const [f, setF] = useState(() => {
    const base = { name: '', day: '1', payer: 'myself', active: true, ...initial };
    return { ...base, amount: initial.amount === undefined || initial.amount === '' ? '' : Number(initial.amount) };
  });
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const catKey = f.category ? `${f.group}|${f.category}` : '';
  const ok = f.name.trim() && Number(f.amount) > 0 && f.category;
  return (
    <Sheet title={initial.id ? '修改固定支出' : '新增固定支出'} onClose={onClose} submitDisabled={!ok}
      onSubmit={() => onSave({ ...f, name: f.name.trim(), amount: Number(f.amount), day: String(Math.min(31, Math.max(1, Number(f.day) || 1))) })}
      onDelete={initial.id ? onDelete : undefined}>
      <Field label="名稱（也是自動入帳時的備註）">
        <input value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus={!initial.id} placeholder="例如：房貸、電信費"
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
      </Field>
      <MoneyInput value={f.amount} onChange={(amount) => set({ amount })} />
      <div className="grid grid-cols-2 gap-3">
        <SmallInput label="每月幾號入帳" inputMode="numeric" value={f.day} onChange={(e) => set({ day: e.target.value.replace(/[^\d]/g, '').slice(0, 2) })} suffix="號" />
        <Field label="狀態"><Seg options={[[true, '啟用'], [false, '暫停']]} value={!!f.active} onChange={(active) => set({ active })} /></Field>
      </div>
      <Field label="記在誰名下"><PersonPick value={f.payer === 'partner' ? 'partner' : 'myself'} onChange={(payer) => set({ payer })} /></Field>
      <Field label="分類">
        <Chips options={monthlyCats.map((c) => [`${c.group}|${c.name}`, c.name])} value={catKey}
          onChange={(k) => { const c = monthlyCats.find((x) => `${x.group}|${x.name}` === k); set({ group: c.group, category: c.name }); }} />
      </Field>
    </Sheet>
  );
};

const AddBtn = ({ onClick, label }) => (
  <button type="button" onClick={onClick} className="p-1 rounded-full bg-slate-100 text-slate-500" aria-label={label}><Plus className="w-3.5 h-3.5" /></button>
);

// 2.0 預算設定：總預算 → 彈性 → 固定 → 年度 → 每月分類 → 分類準確度 → 這支手機
const BudgetView = ({ year, settings, flexMonthly, transactions, onSaveFlex, onSaveGroups, onSaveRecurring, requestDelete }) => {
  const plan = budgetPlan(settings, flexMonthly);
  const [flexDraft, setFlexDraft] = useState(null);
  const [bt, setBt] = useState(null);
  const [devicePayer, setDp] = useState(getDevicePayer());
  const [sheet, setSheet] = useState(null);

  const monthlyCats = useMemo(() => flatCats(settings.monthlyGroups, 'monthly'), [settings.monthlyGroups]);
  const annualCats = useMemo(() => flatCats(settings.annualGroups, 'annual'), [settings.annualGroups]);
  const recurring = settings.recurringItems || [];
  const usage = useMemo(() => {
    const m = new Map();
    for (const t of transactions) {
      if (!String(t.date || '').startsWith(`${year}-`)) continue;
      const k = `${t.type === 'annual' ? 'annual' : 'monthly'}|${t.group}|${t.category}`;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [transactions, year]);
  const usedOf = (c) => usage.get(`${c.type}|${c.group}|${c.name}`) || 0;

  const saveFlex = () => {
    const n = Number(String(flexDraft).replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0) onSaveFlex(Math.round(n));
    setFlexDraft(null);
  };

  const groupsOf = (type) => (type === 'annual' ? settings.annualGroups : settings.monthlyGroups);
  const saveCat = (c, name, budget) => {
    const groups = groupsOf(c.type);
    const next = c.name ? updateCat(groups, c.group, c.name, c.type === 'annual' ? { name, budget } : { name }) : addCat(groups, name, budget);
    onSaveGroups(next, c.type);
    setSheet(null);
  };
  const deleteCat = (c) => {
    setSheet(null);
    requestDelete(`刪除「${c.name}」這個分類？`, () => onSaveGroups(removeCat(groupsOf(c.type), c.group, c.name), c.type));
  };
  const saveFixed = (item) => {
    onSaveRecurring(item.id ? recurring.map((r) => (r.id === item.id ? item : r)) : [...recurring, { ...item, id: Date.now().toString() }]);
    setSheet(null);
  };
  const deleteFixed = (item) => {
    setSheet(null);
    requestDelete(`刪除固定支出「${item.name}」？之後不會再自動入帳。`, () => onSaveRecurring(recurring.filter((r) => r.id !== item.id)));
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <Hero label={`${year} 年總預算`} value={fmt(plan.yearTotal)}
        sub={<>固定 {fmt(plan.fixed)} × 12 ＋ 彈性 {fmt(plan.flex)} × 12 ＋ 年度 {fmt(plan.annual)}</>} />

      <Section title={<span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />彈性（每月）</span>}>
        <div className="glass-card-fx border rounded-2xl p-4">
          <p className="text-xs text-slate-400">吃飯、交通、購物等日常花費共用一個額度。</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-slate-400">$</span>
            <input inputMode="numeric" value={flexDraft ?? plan.flex.toLocaleString()}
              onChange={(e) => { const d = e.target.value.replace(/[^\d]/g, ''); setFlexDraft(d ? Number(d).toLocaleString() : ''); }}
              className="flex-1 min-w-0 w-full font-num text-2xl bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400" aria-label="彈性每月額度" />
            {flexDraft !== null && <button type="button" onClick={saveFlex} className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold">儲存</button>}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">預設 {fmt(FLEX_DEFAULT)}：2026 年實際彈性支出月均約 $18,400，再加約兩成緩衝。</p>
        </div>
      </Section>

      <Section title={<span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />固定（每月）</span>}
        extra={<span className="flex items-center gap-2"><span className="text-xs font-bold tabular-nums text-slate-500">{fmt(plan.fixed)}</span><AddBtn label="新增固定支出" onClick={() => setSheet({ kind: 'fixed', initial: {} })} /></span>}>
        <p className="text-[11px] text-slate-400 px-1 -mt-1 mb-2">每月自動入帳，金額就是預算。暫停的不算進預算。</p>
        {recurring.length === 0 ? <Empty>還沒有固定支出</Empty> : (
          <Divided>
            {recurring.map((i) => (
              <Row key={i.id || i.name} muted={!i.active}
                left={<CategoryIcon category={i.category} group={i.group} type="monthly" size="sm" />}
                title={String(i.name).trim()} sub={`每月 ${i.day || 1} 號・${i.category}・${i.payer === 'partner' ? '佳欣' : '士程'}${i.active ? '' : '・暫停中'}`}
                right={fmt(Number(i.amount) || 0)} onClick={() => setSheet({ kind: 'fixed', initial: i })} />
            ))}
          </Divided>
        )}
      </Section>

      <Section title={<span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />年度</span>}
        extra={<span className="flex items-center gap-2"><span className="text-xs font-bold tabular-nums text-slate-500">{fmt(plan.annual)}</span><AddBtn label="新增年度項目" onClick={() => setSheet({ kind: 'cat', initial: { type: 'annual' } })} /></span>}>
        <p className="text-[11px] text-slate-400 px-1 -mt-1 mb-2">一年一次或不定期的支出，不會擠進某個月的進度條。點一列改金額。</p>
        {annualCats.length === 0 ? <Empty>還沒有年度項目</Empty> : (
          <Divided>
            {annualCats.map((c) => (
              <Row key={`${c.group}|${c.name}`} left={<CategoryIcon category={c.name} group={c.group} type="annual" size="sm" />}
                title={c.name} sub={usedOf(c) ? `今年 ${usedOf(c)} 筆` : '今年還沒用到'} right={fmt(c.budget)} onClick={() => setSheet({ kind: 'cat', initial: c })} />
            ))}
          </Divided>
        )}
      </Section>

      <Section title="每月分類" extra={<AddBtn label="新增分類" onClick={() => setSheet({ kind: 'cat', initial: { type: 'monthly' } })} />}>
        <p className="text-[11px] text-slate-400 px-1 -mt-1 mb-2">記帳時自動分類用的清單。花多少都算在彈性（或固定）裡，不再各自有預算。</p>
        <div className="flex flex-wrap gap-1.5">
          {monthlyCats.map((c) => (
            <button key={`${c.group}|${c.name}`} type="button" onClick={() => setSheet({ kind: 'cat', initial: c })}
              className="flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600 active:scale-95">
              <CategoryIcon category={c.name} group={c.group} type="monthly" size="sm" />{c.name}
              {usedOf(c) > 0 && <span className="text-slate-300 font-normal tabular-nums">{usedOf(c)}</span>}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 px-1 mt-2">分類和正式版共用同一份設定，新增或刪除兩邊都會變。</p>
      </Section>

      <Section title={<span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-slate-400" />自動分類準確度</span>}>
        <div className="glass-card-fx border rounded-2xl p-4">
          <p className="text-xs text-slate-400">拿今年每一筆有備註的紀錄，假裝還沒記過它，看自動分類會給什麼，再和你們實際選的比對。</p>
          {!bt ? (
            <button type="button" onClick={() => setBt(backtestClassifier(transactions, settings, `${year}-01-01`))} className="mt-3 w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold">開始回測</button>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">回測筆數</span><span className="tabular-nums">{bt.total.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">同備註直接分類</span><span className="tabular-nums">{pctOf(bt.rule, bt.total)}・正確 <b className={bt.rule && bt.ruleOk / bt.rule >= 0.97 ? 'text-emerald-700' : 'text-rose-700'}>{pctOf(bt.ruleOk, bt.rule)}</b></span></div>
              <div className="flex justify-between"><span className="text-slate-500">猜測（標「？」）</span><span className="tabular-nums">{pctOf(bt.kw, bt.total)}・猜對 {pctOf(bt.kwOk, bt.kw)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">沒有把握，請你選</span><span className="tabular-nums">{pctOf(bt.none, bt.total)}</span></div>
              {bt.misses.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-400 mb-1">分錯最多的</div>
                  {bt.misses.map(([k, n]) => <div key={k} className="text-xs text-slate-500 flex justify-between gap-2"><span className="truncate">{k}</span><span className="tabular-nums shrink-0">{n} 次</span></div>)}
                </div>
              )}
              <p className="text-[11px] text-slate-400 pt-1">AI（Gemini）分類還沒啟用：需要 Gemini API 金鑰，而且要先用這個回測證明準確度 ≥ 97%，頭兩週只建議、不自動寫入。</p>
            </div>
          )}
        </div>
      </Section>

      <Section title={<span className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-slate-400" />這支手機是誰在記帳</span>}>
        <div className="flex gap-2">
          {[['myself', '士程', 'bg-blue-100 text-blue-700 border-blue-300'], ['partner', '佳欣', 'bg-rose-100 text-rose-700 border-rose-300']].map(([k, name, on]) => (
            <button key={k} type="button" onClick={() => { setDevicePayer(k); setDp(k); }}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-1.5 ${devicePayer === k ? on : 'bg-white text-slate-400 border-slate-200'}`}>
              {devicePayer === k && <Check className="w-4 h-4" />}{name}
            </button>
          ))}
        </div>
      </Section>

      {sheet?.kind === 'cat' && (
        <CategorySheet key={`${sheet.initial.type}|${sheet.initial.group}|${sheet.initial.name}`} initial={sheet.initial} usedCount={sheet.initial.name ? usedOf(sheet.initial) : 0}
          existing={(sheet.initial.type === 'annual' ? annualCats : monthlyCats).map((c) => c.name)}
          onSave={(name, budget) => saveCat(sheet.initial, name, budget)} onDelete={() => deleteCat(sheet.initial)} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'fixed' && (
        <FixedSheet key={sheet.initial.id || 'new'} initial={sheet.initial} monthlyCats={monthlyCats}
          onSave={saveFixed} onDelete={() => deleteFixed(sheet.initial)} onClose={() => setSheet(null)} />
      )}
    </div>
  );
};

export default BudgetView;
