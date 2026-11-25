// ─── 2.0 預算三桶 ───────────────────────────────────────────────────────
// 固定：每月自動入帳的固定支出（設定裡的 recurringItems，啟用中的加總）
// 彈性：每月一個總額度（不再細分到每個分類），存在 settings/budget_v2_{year}.flexMonthly
// 年度：一年一次或不定期的支出（設定裡的 annualGroups，每項一個年度金額）
// 年度總預算 = 固定 × 12 + 彈性 × 12 + 年度
//
// 交易歸桶：type === 'annual' → 年度；備註＋分類對上某個固定支出項目 → 固定；其餘 → 彈性。

const FLEX_DEFAULT = 22000; // 依 2026 實際彈性支出月均約 $18,400，加約兩成緩衝

const norm = (s) => String(s ?? '').trim();
const amt = (t) => Number(t.amount) || 0;

const fixedItems = (settings) => (settings?.recurringItems || []).filter((i) => i.active);

const makeFixedMatcher = (settings) => {
  const keys = new Set((settings?.recurringItems || []).map((i) => `${norm(i.name)}|${norm(i.category)}`));
  return (t) => keys.has(`${norm(t.note)}|${norm(t.category)}`);
};

const bucketOf = (t, isFixed) => (t.type === 'annual' ? 'annual' : isFixed(t) ? 'fixed' : 'flex');

const annualItems = (settings) => {
  const out = [];
  (settings?.annualGroups || []).forEach((g) => (g.items || []).forEach((i) => out.push({ group: g.name, category: i.name, budget: Number(i.budget) || 0 })));
  return out;
};

const budgetPlan = (settings, flexMonthly) => {
  const fixed = fixedItems(settings).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const flex = Number(flexMonthly) || FLEX_DEFAULT;
  const annual = annualItems(settings).reduce((s, i) => s + i.budget, 0);
  return { fixed, flex, annual, yearTotal: fixed * 12 + flex * 12 + annual };
};

const ym = (d) => String(d || '').slice(0, 7);
const pad = (n) => String(n).padStart(2, '0');

// 某年每個月三桶的花費
const yearByMonth = (transactions, year, isFixed) => {
  const months = Array.from({ length: 12 }, () => ({ fixed: 0, flex: 0, annual: 0 }));
  for (const t of transactions) {
    if (!String(t.date || '').startsWith(`${year}-`)) continue;
    const m = Number(String(t.date).slice(5, 7)) - 1;
    if (m < 0 || m > 11) continue;
    months[m][bucketOf(t, isFixed)] += amt(t);
  }
  return months;
};

const monthBuckets = (transactions, year, monthIdx, isFixed) => {
  const key = `${year}-${pad(monthIdx + 1)}`;
  const out = { fixed: 0, flex: 0, annual: 0 };
  for (const t of transactions) if (ym(t.date) === key) out[bucketOf(t, isFixed)] += amt(t);
  return out;
};

// 年度項目今年的使用情況（給「接下來的年度支出」）
const annualUsage = (transactions, settings, year) => {
  const used = new Map();
  for (const t of transactions) {
    if (t.type !== 'annual' || !String(t.date || '').startsWith(`${year}-`)) continue;
    const k = `${t.group}|${t.category}`;
    used.set(k, (used.get(k) || 0) + amt(t));
  }
  return annualItems(settings).map((i) => {
    const u = used.get(`${i.group}|${i.category}`) || 0;
    return { ...i, used: u, remaining: i.budget - u };
  });
};

export { FLEX_DEFAULT, makeFixedMatcher, bucketOf, budgetPlan, yearByMonth, monthBuckets, annualUsage, annualItems };
