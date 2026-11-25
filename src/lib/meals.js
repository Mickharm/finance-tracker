// ─── 兩人每餐狀態 ────────────────────────────────────────────────────────
// 午餐各自算：誰的手機記了就是誰的。
// 晚餐：任一人記了「兩人一起」→ 兩個人都算有交代；否則各自算。
// 「沒花錢」＝ $0 紀錄（請客／自煮／沒吃）也算有交代。
// 只有 2.0 起新增、帶 meal 欄位的紀錄才看得出是哪一餐；舊紀錄不會被誤判。

const NO_SPEND_NOTES = new Set(['請客', '自煮', '沒吃', '請客/自煮', '減肥/斷食', '減肥/沒吃']);
const isNoSpend = (t) => (Number(t.amount) || 0) === 0 && NO_SPEND_NOTES.has(String(t.note || '').trim());

const PEOPLE_KEYS = ['myself', 'partner'];
const personOf = (t) => (t.payer === 'partner' ? 'partner' : 'myself');

// 回傳 'paid' | 'nospend' | 'together' | null
const slotStatus = (list) => {
  if (list.some((t) => (Number(t.amount) || 0) > 0)) return 'paid';
  if (list.some(isNoSpend)) return 'nospend';
  return list.length ? 'paid' : null;
};

const mealStatusFor = (dayTx, person) => {
  const mine = dayTx.filter((t) => personOf(t) === person);
  const lunch = slotStatus(mine.filter((t) => t.meal === 'lunch'));
  const together = dayTx.some((t) => t.meal === 'dinner' && t.together);
  const dinner = together ? 'together' : slotStatus(mine.filter((t) => t.meal === 'dinner'));
  return { lunch, dinner };
};

const dayMeals = (dayTx) => ({
  myself: mealStatusFor(dayTx, 'myself'),
  partner: mealStatusFor(dayTx, 'partner'),
});

// 這一天有沒有任何帶餐別的紀錄（用來分辨「沒資料」與「沒交代」）
const hasMealData = (dayTx) => dayTx.some((t) => t.meal === 'lunch' || t.meal === 'dinner');

export { isNoSpend, mealStatusFor, dayMeals, hasMealData, PEOPLE_KEYS, personOf };
