// ─── 快速記帳：自動分類（第 1、2 層）＋依人分開的常用建議 ─────────────────
// 第 1 層「規則」：同一則備註過去被歸到哪個分類（先看自己的紀錄，再看兩人的）。
//   兩人過去的紀錄中，同備註→同分類的一致率約 99.5%，所以完全相同的備註直接採用。
// 第 2 層「關鍵字」：備註包含已知備註，或命中關鍵字表 → 只當「猜測」，畫面上標「？」。
// 都對不上 → 不猜，請使用者自己選（不會默默歸錯）。
// 第 3 層（Gemini）在 P7 才做。

const normNote = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');

// 「沒花錢」的 $0 紀錄：不算常用建議
const ZERO_NOTES = new Set(['請客/自煮', '減肥/斷食', '減肥/沒吃', '請客', '自煮', '沒吃']);
const NO_SPEND_OPTIONS = ['請客', '自煮', '沒吃'];

const FOOD_CATEGORY = '日常飲食';

const catKey = (c) => `${c.type}|${c.group}|${c.category}`;
const parseKey = (k) => {
  const [type, group, category] = k.split('|');
  return { type, group, category };
};

// 設定中所有有效分類（月度在前，年度在後）
const listCategories = (settings) => {
  const out = [];
  (settings?.monthlyGroups || []).forEach((g) => (g.items || []).forEach((i) => out.push({ type: 'monthly', group: g.name, category: i.name })));
  (settings?.annualGroups || []).forEach((g) => (g.items || []).forEach((i) => out.push({ type: 'annual', group: g.name, category: i.name })));
  return out;
};

const daysAgoStr = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 建立備註索引：每個人各一份，再加一份兩人合併
const buildNoteIndex = (transactions, settings) => {
  const valid = new Set(listCategories(settings).map(catKey));
  const recentCut = daysAgoStr(90);
  const index = { all: new Map(), myself: new Map(), partner: new Map(), valid };
  const add = (map, note, t, k) => {
    let e = map.get(note);
    if (!e) { e = { note, count: 0, recent: 0, last: '', cats: new Map(), amounts: new Map(), meals: { lunch: 0, dinner: 0 } }; map.set(note, e); }
    e.count++;
    if (t.date >= recentCut) e.recent++;
    if (t.date > e.last) e.last = t.date;
    if (valid.has(k)) e.cats.set(k, (e.cats.get(k) || 0) + 1);
    const amt = Number(t.amount) || 0;
    if (amt > 0) e.amounts.set(amt, (e.amounts.get(amt) || 0) + 1);
    if (t.meal === 'lunch' || t.meal === 'dinner') e.meals[t.meal]++;
  };
  for (const t of transactions || []) {
    const note = normNote(t.note);
    if (!note) continue;
    const k = catKey(t);
    add(index.all, note, t, k);
    const who = t.payer === 'partner' ? 'partner' : 'myself';
    add(index[who], note, t, k);
  }
  return index;
};

const bestCat = (entry) => {
  let best = null, n = 0, total = 0;
  entry.cats.forEach((c, k) => { total += c; if (c > n) { n = c; best = k; } });
  return best ? { ...parseKey(best), share: n / total, n } : null;
};

// 關鍵字表（只用來猜，標「？」）。分類名稱要存在於設定才會採用。
const KEYWORDS = [
  [/加油|油錢|停車|高鐵|台鐵|捷運|計程車|uber|etag|悠遊卡|公車/i, '交通/油資'],
  [/全聯|家樂福|好市多|costco|大潤發|美聯社|超市|買菜|水果/i, '糧食補給'],
  [/電費|水費|瓦斯/, '水/電費'],
  [/剪頭髮|理髮|衣服|褲|鞋|美容|保養品|化妝/, '治裝/美容'],
  [/診所|醫院|藥|看醫生|牙醫|掛號/, '醫療相關'],
  [/話費|電信|中華電信|台哥大|遠傳/, '手機話費'],
  [/健身|電影|ktv|遊戲|steam|switch/i, '運動/娛樂'],
  [/貓砂|飼料|罐罐|貓糧/, '食物/貓砂'],
  [/youtube|netflix|disney|spotify|kkbox/i, '影視相關'],
  [/gemini|chatgpt|claude|notion|icloud|google one/i, '生產力工具'],
  [/紅包/, '過年紅包'],
  [/禮物/, '生日禮物'],
  [/機票|飯店|住宿|訂房/, '機票/飯店'],
  [/門票|車票|票券/, '各類票券'],
  [/便當|餐|飯|麵|飲料|咖啡|早餐|午餐|晚餐|夜市|超商|7-11|全家|麥當勞|肯德基|火鍋|壽司|水餃|小吃|雞排|甜點|可麗露/i, FOOD_CATEGORY],
];

const findByName = (settings, name) => listCategories(settings).find((c) => c.category === name) || null;

// 回傳 { kind: 'rule' | 'kw', type, group, category } 或 null
// exclude（回測用）：把某一筆自己的紀錄從統計中扣掉，模擬「還沒記這筆時」會怎麼分
const classifyNote = (rawNote, payer, index, settings, exclude = null) => {
  const note = normNote(rawNote);
  if (!note || !index) return null;
  const who = payer === 'partner' ? 'partner' : 'myself';
  const exKey = exclude ? catKey(exclude) : null;

  // 第 1 層：完全相同的備註（自己的紀錄優先）
  for (const map of [index[who], index.all]) {
    const e = map.get(note);
    if (e) {
      let entry = e;
      if (exKey && e.cats.has(exKey)) {
        const cats = new Map(e.cats);
        const n = cats.get(exKey) - 1;
        if (n > 0) cats.set(exKey, n); else cats.delete(exKey);
        entry = { ...e, cats };
      }
      const b = bestCat(entry);
      if (b && b.share >= 0.6) return { kind: 'rule', type: b.type, group: b.group, category: b.category };
    }
  }

  // 第 2 層 a：輸入包含某個已知備註（取最長的那個），例如「公司便當 加蛋」⊃「公司便當」
  if (note.length >= 2) {
    let hit = null;
    index.all.forEach((e) => {
      if (e.note.length < 2 || e.count < 2 || e.note === note) return;
      if (note.includes(e.note) && (!hit || e.note.length > hit.note.length)) hit = e;
    });
    if (hit) {
      const b = bestCat(hit);
      if (b && b.share >= 0.8) return { kind: 'kw', type: b.type, group: b.group, category: b.category };
    }
  }

  // 第 2 層 b：關鍵字表
  for (const [re, name] of KEYWORDS) {
    if (re.test(note)) {
      const c = findByName(settings, name);
      if (c) return { kind: 'kw', ...c };
    }
  }
  return null;
};

// 回測：拿過去每一筆有備註的紀錄，假裝還沒記過它，看自動分類會給什麼，和實際分類比對
const backtestClassifier = (transactions, settings, since = '') => {
  const index = buildNoteIndex(transactions, settings);
  const r = { total: 0, rule: 0, ruleOk: 0, kw: 0, kwOk: 0, none: 0, misses: new Map() };
  for (const t of transactions) {
    const note = normNote(t.note);
    if (!note || (since && String(t.date) < since)) continue;
    if (!index.valid.has(catKey(t))) continue; // 分類已不在設定中的舊紀錄不計
    r.total++;
    const c = classifyNote(note, t.payer, index, settings, t);
    if (!c) { r.none++; continue; }
    const ok = c.type === t.type && c.group === t.group && c.category === t.category;
    r[c.kind]++;
    if (ok) r[c.kind + 'Ok']++;
    else {
      const k = `${note} → ${c.category}（實際 ${t.category}）`;
      r.misses.set(k, (r.misses.get(k) || 0) + 1);
    }
  }
  return { ...r, misses: [...r.misses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8) };
};

// 常用建議：只看「這個人」自己的紀錄。近 90 天的次數為主、全部次數為輔；
// 選了午餐／晚餐時，過去標過同一餐的備註往前排（標記資料會隨使用越來越準）。
// 某則備註的金額幾乎固定（≥3 次、占 60% 以上）時，帶出金額，一鍵填好。
const getSuggestions = (index, payer, meal, limit = 10) => {
  if (!index) return [];
  const who = payer === 'partner' ? 'partner' : 'myself';
  const list = [];
  index[who].forEach((e) => {
    if (ZERO_NOTES.has(e.note)) return;
    if (e.recent === 0 && e.count < 3) return;
    let score = e.recent * 1 + e.count * 0.15;
    if (meal === 'lunch' || meal === 'dinner') score += e.meals[meal] * 4;
    let amount = null;
    let topAmt = 0, topN = 0, totalAmt = 0;
    e.amounts.forEach((n, a) => { totalAmt += n; if (n > topN) { topN = n; topAmt = a; } });
    if (topN >= 3 && topN / totalAmt >= 0.6) amount = topAmt;
    list.push({ note: e.note, amount, score });
  });
  return list.sort((a, b) => b.score - a.score).slice(0, limit);
};

// 這支手機預設的記帳人（第一次使用時詢問）
const DEVICE_PAYER_KEY = 'ft-device-payer';
const getDevicePayer = () => {
  try {
    const v = localStorage.getItem(DEVICE_PAYER_KEY);
    return v === 'myself' || v === 'partner' ? v : null;
  } catch { return null; }
};
const setDevicePayer = (v) => { try { localStorage.setItem(DEVICE_PAYER_KEY, v); } catch { /* 無痕模式等情況忽略 */ } };

export {
  normNote, listCategories, buildNoteIndex, classifyNote, getSuggestions, backtestClassifier,
  getDevicePayer, setDevicePayer, NO_SPEND_OPTIONS, FOOD_CATEGORY,
};
