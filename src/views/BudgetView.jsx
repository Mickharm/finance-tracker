import { useMemo, useState } from 'react';
import { ChevronRight, ClipboardList, Sparkles, Smartphone, Check } from 'lucide-react';
import { GLASS_CARD } from '../lib/constants';
import { budgetPlan, FLEX_DEFAULT, annualItems } from '../lib/budget';
import { backtestClassifier, getDevicePayer, setDevicePayer } from '../lib/quickAdd';
import CategoryIcon from '../components/CategoryIcon';
import { formatThousands } from '../lib/utils';

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');

// 2.0 預算設定：三桶（固定／彈性／年度）＋分類準確度回測＋這支手機的記帳人
const BudgetView = ({ year, settings, flexMonthly, transactions, onSaveFlex, onOpenRecurring, onSaveAnnualBudgets, advanced }) => {
  const plan = budgetPlan(settings, flexMonthly);
  const [flexDraft, setFlexDraft] = useState(null);
  const [annualDraft, setAnnualDraft] = useState(null); // { 'group|category': '金額' }
  const [bt, setBt] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [devicePayer, setDp] = useState(getDevicePayer());

  // 過去實際彈性支出（今年已過完的月份），給額度參考
  const items = useMemo(() => annualItems(settings), [settings]);
  const fixedList = (settings.recurringItems || []).filter((i) => i.active);
  const oldTotal = useMemo(() => {
    const m = (settings.monthlyGroups || []).reduce((a, g) => a + g.items.reduce((s, i) => s + Number(i.budget || 0), 0), 0);
    return m * 12 + plan.annual;
  }, [settings, plan.annual]);

  const saveFlex = () => {
    const n = Number(String(flexDraft).replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0) onSaveFlex(Math.round(n));
    setFlexDraft(null);
  };

  const saveAnnual = () => {
    const groups = (settings.annualGroups || []).map((g) => ({
      ...g,
      items: g.items.map((i) => {
        const v = annualDraft[`${g.name}|${i.name}`];
        if (v === undefined) return i;
        const n = Number(String(v).replace(/,/g, ''));
        return Number.isFinite(n) && n >= 0 ? { ...i, budget: Math.round(n) } : i;
      }),
    }));
    onSaveAnnualBudgets(groups);
    setAnnualDraft(null);
  };

  const runBacktest = () => setBt(backtestClassifier(transactions, settings, `${year}-01-01`));

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* ── 總覽 */}
      <section className="px-1">
        <div className="text-sm font-bold text-slate-500">{year} 年總預算（新制）</div>
        <div className="font-num text-4xl text-slate-800 mt-1">{fmt(plan.yearTotal)}</div>
        <div className="text-xs text-slate-400 mt-1 leading-relaxed">
          固定 {fmt(plan.fixed)} × 12 ＋ 彈性 {fmt(plan.flex)} × 12 ＋ 年度 {fmt(plan.annual)}
          <br />舊制（每個分類各自的月預算 × 12 ＋ 年度）是 {fmt(oldTotal)}，正式版仍顯示舊制。
        </div>
      </section>

      {/* ── 彈性 */}
      <section className={`${GLASS_CARD} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />彈性（每月）</h3>
            <p className="text-xs text-slate-400 mt-0.5">吃飯、交通、購物等日常花費共用一個額度，不再分到每個分類。</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-slate-400">$</span>
          <input inputMode="numeric" value={flexDraft ?? formatThousands(String(plan.flex))}
            onChange={(e) => setFlexDraft(formatThousands(e.target.value.replace(/[^\d]/g, '')))}
            className="flex-1 min-w-0 w-full font-num text-2xl bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400" aria-label="彈性每月額度" />
          {flexDraft !== null && <button type="button" onClick={saveFlex} className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold">儲存</button>}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">預設 {fmt(FLEX_DEFAULT)}：2026 年實際彈性支出月均約 $18,400，再加約兩成緩衝。</p>
      </section>

      {/* ── 固定 */}
      <section className={`${GLASS_CARD} p-4`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />固定（每月）<span className="font-num text-base text-slate-500 ml-1">{fmt(plan.fixed)}</span></h3>
          <button type="button" onClick={onOpenRecurring} className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1"><ClipboardList className="w-3.5 h-3.5" />管理</button>
        </div>
        <p className="text-xs text-slate-400 mb-2">每月自動入帳的項目，金額就是預算。</p>
        <div className="divide-y divide-slate-100">
          {fixedList.map((i) => (
            <div key={i.id || i.name} className="flex items-center gap-2.5 py-2">
              <CategoryIcon category={i.category} group={i.group} type="monthly" size="sm" />
              <span className="flex-1 text-sm text-slate-700 truncate">{String(i.name).trim()}</span>
              <span className="text-xs text-slate-400">每月 {i.day || 1} 號</span>
              <span className="text-sm tabular-nums text-slate-700 w-20 text-right">{fmt(Number(i.amount) || 0)}</span>
            </div>
          ))}
          {fixedList.length === 0 && <div className="text-sm text-slate-400 py-3">尚未設定固定支出</div>}
        </div>
      </section>

      {/* ── 年度 */}
      <section className={`${GLASS_CARD} p-4`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />年度<span className="font-num text-base text-slate-500 ml-1">{fmt(plan.annual)}</span></h3>
          {annualDraft ? (
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setAnnualDraft(null)} className="text-xs font-bold text-slate-500 bg-slate-100 rounded-full px-3 py-1">取消</button>
              <button type="button" onClick={saveAnnual} className="text-xs font-bold text-white bg-slate-800 rounded-full px-3 py-1">儲存</button>
            </div>
          ) : (
            <button type="button" onClick={() => setAnnualDraft({})} className="text-xs font-bold text-slate-500 bg-slate-100 rounded-full px-3 py-1">編輯金額</button>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-2">一年一次或不定期的支出。不會擠進某個月的進度條。</p>
        <div className="divide-y divide-slate-100">
          {items.map((i) => {
            const k = `${i.group}|${i.category}`;
            return (
              <div key={k} className="flex items-center gap-2.5 py-2">
                <CategoryIcon category={i.category} group={i.group} type="annual" size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-700 truncate">{i.category}</div>
                  <div className="text-[10px] text-slate-400">{i.group}</div>
                </div>
                {annualDraft ? (
                  <input inputMode="numeric" value={annualDraft[k] ?? formatThousands(String(i.budget))}
                    onChange={(e) => setAnnualDraft({ ...annualDraft, [k]: formatThousands(e.target.value.replace(/[^\d]/g, '')) })}
                    className="w-28 text-right tabular-nums bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-blue-400" aria-label={`${i.category} 年度金額`} />
                ) : (
                  <span className="text-sm tabular-nums text-slate-700">{fmt(i.budget)}</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">年度金額和正式版共用同一份設定，改了兩邊都會變。</p>
      </section>

      {/* ── 自動分類準確度 */}
      <section className={`${GLASS_CARD} p-4`}>
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><Sparkles className="w-4 h-4 text-slate-400" />自動分類準確度</h3>
        <p className="text-xs text-slate-400 mt-0.5">拿今年每一筆有備註的紀錄，假裝還沒記過它，看自動分類會給什麼，再和你們實際選的比對。</p>
        {!bt ? (
          <button type="button" onClick={runBacktest} className="mt-3 w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold">開始回測</button>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">回測筆數</span><span className="tabular-nums">{bt.total.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">第 1 層（同備註）直接分類</span><span className="tabular-nums">{pct(bt.rule, bt.total)}・正確 <b className={bt.rule && bt.ruleOk / bt.rule >= 0.97 ? 'text-emerald-700' : 'text-rose-700'}>{pct(bt.ruleOk, bt.rule)}</b></span></div>
            <div className="flex justify-between"><span className="text-slate-500">第 2 層（猜測，標「？」）</span><span className="tabular-nums">{pct(bt.kw, bt.total)}・猜對 {pct(bt.kwOk, bt.kw)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">沒有把握，請你選</span><span className="tabular-nums">{pct(bt.none, bt.total)}</span></div>
            {bt.misses.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-400 mb-1">分錯最多的</div>
                {bt.misses.map(([k, n]) => <div key={k} className="text-xs text-slate-500 flex justify-between gap-2"><span className="truncate">{k}</span><span className="tabular-nums shrink-0">{n} 次</span></div>)}
              </div>
            )}
            <p className="text-[11px] text-slate-400 pt-1">第 3 層 AI（Gemini）還沒啟用：需要你提供 Gemini API 金鑰，而且要先用這個回測證明準確度 ≥ 97%，頭兩週只建議、不自動寫入。</p>
          </div>
        )}
      </section>

      {/* ── 這支手機 */}
      <section className={`${GLASS_CARD} p-4`}>
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><Smartphone className="w-4 h-4 text-slate-400" />這支手機是誰在記帳</h3>
        <div className="flex gap-2 mt-3">
          {[['myself', '士程', 'bg-blue-100 text-blue-700 border-blue-300'], ['partner', '佳欣', 'bg-rose-100 text-rose-700 border-rose-300']].map(([k, name, on]) => (
            <button key={k} type="button" onClick={() => { setDevicePayer(k); setDp(k); }}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-1.5 ${devicePayer === k ? on : 'bg-white text-slate-400 border-slate-200'}`}>
              {devicePayer === k && <Check className="w-4 h-4" />}{name}
            </button>
          ))}
        </div>
      </section>

      {/* ── 進階：分類與細項（舊版設定） */}
      <section>
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className={`w-full ${GLASS_CARD} p-4 flex items-center justify-between`}>
          <div className="text-left">
            <div className="text-sm font-bold text-slate-700">分類與細項（進階）</div>
            <div className="text-xs text-slate-400">新增／改名分類、舊制各分類的月預算</div>
          </div>
          <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
        </button>
        {showAdvanced && <div className="mt-4">{advanced}</div>}
      </section>
    </div>
  );
};

export default BudgetView;
