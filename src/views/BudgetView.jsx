import { useMemo, useState } from 'react';
import { Sparkles, Smartphone, Check, KeyRound } from 'lucide-react';
import { budgetPlan, FLEX_DEFAULT } from '../lib/budget';
import { backtestClassifier, getDevicePayer, setDevicePayer } from '../lib/quickAdd';
import { fmt, PEOPLE } from '../lib/format';
import { getGeminiKey, setGeminiKey, backtestGemini } from '../lib/gemini';
import CategoryIcon from '../components/CategoryIcon';
import { StackTube } from '../components/glass';
import { Hero, Section, Row, Divided, Empty, Chips, Seg, PersonPick, PersonDot, IconDot, Dot, AddButton, MoneyInput, Field, SmallInput, TextInput, Sheet } from '../components/v2';

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
        <TextInput value={name} onChange={setName} disabled={!canRename} autoFocus={isNew} placeholder={initial.type === 'annual' ? '例如：車險' : '例如：寵物'} />
        {clash && <div className="text-[13px] text-red-700 mt-1.5">已經有這個名稱了</div>}
        {!canRename && <div className="text-xs text-slate-500 mt-1.5">今年已有 {usedCount} 筆紀錄用這個分類，名稱不能改。</div>}
      </Field>
      {initial.type === 'annual' && <Field label="一年的預算"><MoneyInput value={budget} onChange={setBudget} /></Field>}
      {!isNew && usedCount > 0 && <p className="text-xs text-slate-500">刪除後，舊紀錄還會保留原本的分類名稱。</p>}
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
        <TextInput value={f.name} onChange={(name) => set({ name })} autoFocus={!initial.id} placeholder="例如：房貸、電信費" />
      </Field>
      <MoneyInput value={f.amount} onChange={(amount) => set({ amount })} />
      <div className="grid grid-cols-2 gap-3">
        <SmallInput label="每月幾號入帳" inputMode="numeric" value={f.day} onChange={(e) => set({ day: e.target.value.replace(/[^\d]/g, '').slice(0, 2) })} suffix="號" />
        <Field label="狀態"><Seg size="lg" options={[[true, '啟用'], [false, '暫停']]} value={!!f.active} onChange={(active) => set({ active })} /></Field>
      </div>
      <Field label="記在誰名下"><PersonPick value={f.payer === 'partner' ? 'partner' : 'myself'} onChange={(payer) => set({ payer })} /></Field>
      <Field label="分類">
        <Chips options={monthlyCats.map((c) => [`${c.group}|${c.name}`, c.name])} value={catKey}
          onChange={(k) => { const c = monthlyCats.find((x) => `${x.group}|${x.name}` === k); set({ group: c.group, category: c.name }); }} />
      </Field>
    </Sheet>
  );
};

const StatLine = ({ label, children }) => (
  <div className="flex justify-between gap-3 text-sm"><span className="text-slate-500">{label}</span><span className="font-num font-semibold tabular-nums text-slate-800 text-right">{children}</span></div>
);

// AI 分類（Gemini）：金鑰只存在這支手機；可以用今年的紀錄回測準確度
const GeminiPanel = ({ transactions, settings, year }) => {
  const [key, setKey] = useState(() => getGeminiKey());
  const [draft, setDraft] = useState('');
  const [test, setTest] = useState(null); // { loading } | { error } | result
  const save = () => { const k = draft.trim(); if (!k) return; setGeminiKey(k); setKey(k); setDraft(''); setTest(null); };
  const clear = () => { setGeminiKey(''); setKey(''); setTest(null); };
  const run = async () => {
    setTest({ loading: true });
    try { setTest(await backtestGemini(transactions, settings, key, `${year}-01-01`)); } catch (e) { setTest({ error: e.message }); }
  };
  const acc = test && test.total ? test.ok / (test.total - test.unsure || 1) : null;
  return (
    <div className="glass-card r-tile p-4 text-sm">
      <p className="text-[13px] text-slate-500 leading-relaxed">前兩層（同備註、關鍵字）都分不出來時，請 Gemini 給一個建議。只是建議，要你點一下才會採用。</p>
      {key ? (
        <div className="mt-3.5 flex items-center gap-2.5">
          <IconDot icon={KeyRound} tone="emerald" size="w-8 h-8" />
          <span className="flex-1 font-semibold text-slate-700">已設定金鑰 <span className="font-num tabular-nums text-slate-400">••••{key.slice(-4)}</span></span>
          <button type="button" onClick={clear} className="btn btn-danger px-3.5 h-9 text-[13px]">移除</button>
        </div>
      ) : (
        <div className="mt-3.5 space-y-2.5">
          <div className="flex gap-2">
            <input type="password" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="貼上 Gemini API 金鑰" autoComplete="off" className="field flex-1" />
            <button type="button" onClick={save} disabled={!draft.trim()} className="btn btn-ink px-5 text-sm shrink-0">儲存</button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">到 Google AI Studio（aistudio.google.com）登入後按「Get API key」取得。金鑰只存在這支手機的瀏覽器，不會進帳本，兩支手機要各貼一次。建議在 Google 後台把金鑰限制成只能從 mickharm.github.io 使用，並設定用量上限。</p>
        </div>
      )}
      {key && (
        <div className="mt-3.5 pt-3.5" style={{ boxShadow: 'inset 0 0.5px 0 0 var(--hair)' }}>
          {!test || test.error ? (
            <>
              <button type="button" onClick={run} className="btn btn-glass w-full h-11 text-sm">AI 回測（同時測試金鑰）</button>
              <p className="text-xs text-slate-400 mt-2">拿今年前兩層分不出來的備註（最多 40 則），問 Gemini 一次，和你們實際選的比對。</p>
              {test?.error && <p className="text-[13px] text-red-700 mt-2">{test.error}</p>}
            </>
          ) : test.loading ? <p className="text-[13px] text-slate-400 text-center py-2">Gemini 回測中…</p> : test.total === 0 ? (
            <p className="text-[13px] text-slate-500">今年沒有前兩層分不出來的紀錄，可以之後再測。</p>
          ) : (
            <div className="space-y-2">
              <StatLine label="測試備註">{test.total} 則</StatLine>
              <StatLine label="AI 有給答案的正確率"><b className={acc >= 0.97 ? 'text-emerald-700' : 'text-amber-700'}>{pctOf(test.ok, test.total - test.unsure)}</b></StatLine>
              <StatLine label="AI 說沒把握">{test.unsure} 則</StatLine>
              {test.misses.length > 0 && (
                <div className="pt-2.5 mt-1" style={{ boxShadow: 'inset 0 0.5px 0 0 var(--hair)' }}>
                  <div className="eyebrow mb-1">AI 分錯的</div>
                  {test.misses.map((m) => <div key={m} className="text-[13px] text-slate-500 truncate">{m}</div>)}
                </div>
              )}
              <p className="text-xs text-slate-400">{acc >= 0.97 ? '準確度達 97%，但仍維持「點一下才採用」。' : '準確度未達 97%，所以只當建議，不會自動填入。'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const BucketTitle = ({ tone, children }) => <span className="flex items-center gap-2"><Dot tone={tone} />{children}</span>;
const Hint = ({ children }) => <p className="text-xs text-slate-500 px-2 -mt-1 mb-2.5 leading-relaxed">{children}</p>;

// 3.0 預算設定：總預算 → 彈性 → 固定 → 年度 → 每月分類 → 分類準確度 → 這支手機
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

  const parts = [
    { key: 'fixed', label: '固定 × 12', value: plan.fixed * 12, tone: 'indigo' },
    { key: 'flex', label: '彈性 × 12', value: plan.flex * 12, tone: 'emerald' },
    { key: 'annual', label: '年度', value: plan.annual, tone: 'amber' },
  ];

  return (
    <div className="space-y-6 stagger">
      <Hero label={`${year} 年總預算`} amount={plan.yearTotal} id="budget-year">
        <StackTube height={12} parts={parts} />
        <div className="grid grid-cols-3 gap-2 mt-4">
          {parts.map((p) => (
            <div key={p.key} className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><Dot tone={p.tone} className="!w-2 !h-2" />{p.label}</div>
              <div className="font-num text-[17px] font-bold tabular-nums text-slate-800 mt-0.5 truncate">{fmt(p.value)}</div>
            </div>
          ))}
        </div>
      </Hero>

      <Section title={<BucketTitle tone="emerald">彈性（每月）</BucketTitle>}>
        <div className="glass-card r-tile tint-emerald p-4">
          <p className="text-[13px] text-slate-600">吃飯、交通、購物等日常花費共用一個額度。</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="field flex items-baseline gap-1.5 !py-2 !px-4 !rounded-[18px] flex-1 min-w-0">
              <span className="font-num text-lg font-semibold text-slate-400">$</span>
              <input inputMode="numeric" value={flexDraft ?? plan.flex.toLocaleString()}
                onChange={(e) => { const d = e.target.value.replace(/[^\d]/g, ''); setFlexDraft(d ? Number(d).toLocaleString() : ''); }}
                className="flex-1 min-w-0 w-full font-num text-[28px] font-bold tracking-tight tabular-nums bg-transparent outline-none text-slate-900" aria-label="彈性每月額度" />
            </div>
            {flexDraft !== null && <button type="button" onClick={saveFlex} className="btn btn-ink px-5 h-[52px] text-[15px] shrink-0">儲存</button>}
          </div>
          <p className="text-xs text-slate-500 mt-2.5">預設 {fmt(FLEX_DEFAULT)}：2026 年實際彈性支出月均約 $18,400，再加約兩成緩衝。</p>
        </div>
      </Section>

      <Section title={<BucketTitle tone="indigo">固定（每月）</BucketTitle>}
        extra={<span className="flex items-center gap-2.5"><span className="font-num text-[13px] font-bold tabular-nums text-slate-500">{fmt(plan.fixed)}</span><AddButton label="新增固定支出" onClick={() => setSheet({ kind: 'fixed', initial: {} })} /></span>}>
        <Hint>每月自動入帳，金額就是預算。暫停的不算進預算。</Hint>
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

      <Section title={<BucketTitle tone="amber">年度</BucketTitle>}
        extra={<span className="flex items-center gap-2.5"><span className="font-num text-[13px] font-bold tabular-nums text-slate-500">{fmt(plan.annual)}</span><AddButton label="新增年度項目" onClick={() => setSheet({ kind: 'cat', initial: { type: 'annual' } })} /></span>}>
        <Hint>一年一次或不定期的支出，不會擠進某個月的進度條。點一列改金額。</Hint>
        {annualCats.length === 0 ? <Empty>還沒有年度項目</Empty> : (
          <Divided>
            {annualCats.map((c) => (
              <Row key={`${c.group}|${c.name}`} left={<CategoryIcon category={c.name} group={c.group} type="annual" size="sm" />}
                title={c.name} sub={usedOf(c) ? `今年 ${usedOf(c)} 筆` : '今年還沒用到'} right={fmt(c.budget)} onClick={() => setSheet({ kind: 'cat', initial: c })} />
            ))}
          </Divided>
        )}
      </Section>

      <Section title="每月分類" extra={<AddButton label="新增分類" onClick={() => setSheet({ kind: 'cat', initial: { type: 'monthly' } })} />}>
        <Hint>記帳時自動分類用的清單。花多少都算在彈性（或固定）裡，不再各自有預算。</Hint>
        <div className="flex flex-wrap gap-2">
          {monthlyCats.map((c) => (
            <button key={`${c.group}|${c.name}`} type="button" onClick={() => setSheet({ kind: 'cat', initial: c })} className="chip !p-1 !pr-3">
              <CategoryIcon category={c.name} group={c.group} type="monthly" size="xs" />{c.name}
              {usedOf(c) > 0 && <span className="font-num text-slate-400 font-semibold tabular-nums">{usedOf(c)}</span>}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 px-2 mt-3">數字是今年用這個分類記了幾筆。</p>
      </Section>

      <Section title={<span className="flex items-center gap-2"><Sparkles className="w-[18px] h-[18px] text-slate-400" />自動分類準確度</span>}>
        <div className="glass-card r-tile p-4">
          <p className="text-[13px] text-slate-500 leading-relaxed">拿今年每一筆有備註的紀錄，假裝還沒記過它，看自動分類會給什麼，再和你們實際選的比對。</p>
          {!bt ? (
            <button type="button" onClick={() => setBt(backtestClassifier(transactions, settings, `${year}-01-01`))} className="btn btn-glass mt-3.5 w-full h-11 text-sm">開始回測</button>
          ) : (
            <div className="mt-3.5 space-y-2 fade-up">
              <StatLine label="回測筆數">{bt.total.toLocaleString()}</StatLine>
              <StatLine label="同備註直接分類">{pctOf(bt.rule, bt.total)}・正確 <b className={bt.rule && bt.ruleOk / bt.rule >= 0.97 ? 'text-emerald-700' : 'text-red-700'}>{pctOf(bt.ruleOk, bt.rule)}</b></StatLine>
              <StatLine label="猜測（標「？」）">{pctOf(bt.kw, bt.total)}・猜對 {pctOf(bt.kwOk, bt.kw)}</StatLine>
              <StatLine label="沒有把握，請你選">{pctOf(bt.none, bt.total)}</StatLine>
              {bt.misses.length > 0 && (
                <div className="pt-2.5 mt-1" style={{ boxShadow: 'inset 0 0.5px 0 0 var(--hair)' }}>
                  <div className="eyebrow mb-1">分錯最多的</div>
                  {bt.misses.map(([k, n]) => <div key={k} className="text-[13px] text-slate-500 flex justify-between gap-2"><span className="truncate">{k}</span><span className="font-num tabular-nums shrink-0">{n} 次</span></div>)}
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title={<span className="flex items-center gap-2"><Sparkles className="w-[18px] h-[18px] text-violet-500" />AI 分類（Gemini）</span>}>
        <GeminiPanel transactions={transactions} settings={settings} year={year} />
      </Section>

      <Section title={<span className="flex items-center gap-2"><Smartphone className="w-[18px] h-[18px] text-slate-400" />這支手機是誰在記帳</span>}>
        <div className="grid grid-cols-2 gap-2.5">
          {Object.entries(PEOPLE).map(([k, p]) => {
            const on = devicePayer === k;
            return (
              <button key={k} type="button" onClick={() => { setDevicePayer(k); setDp(k); }} aria-pressed={on}
                className={`press flex items-center gap-2.5 p-2.5 pr-3 rounded-[22px] ${on ? `glass-card !rounded-[22px] ${p.tint}` : 'glass-well opacity-60'}`}>
                <PersonDot owner={k} />
                <span className={`text-[15px] font-bold ${on ? p.text : 'text-slate-500'}`}>{p.name}</span>
                {on && <Check className={`w-[18px] h-[18px] ml-auto ${p.text}`} strokeWidth={3} />}
              </button>
            );
          })}
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
