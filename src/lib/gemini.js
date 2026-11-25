// ─── 自動分類第 3 層：Gemini ───────────────────────────────────────────────
// 第 1、2 層（同備註／關鍵字）都對不上時，才問 Gemini。只當「建議」：畫面上顯示
// 「AI 建議」，要使用者點一下才採用，不會自動寫入。
// API 金鑰只存在這支手機的瀏覽器（localStorage），不進程式碼、不進帳本。
import { buildNoteIndex, listCategories, normNote, classifyNote } from './quickAdd';

const KEY_STORE = 'ft-gemini-key';
// 先用「最新 Flash」別名，Google 沒提供時退回固定版本
const MODELS = ['gemini-flash-latest', 'gemini-2.5-flash'];

const getGeminiKey = () => { try { return localStorage.getItem(KEY_STORE) || ''; } catch { return ''; } };
const setGeminiKey = (k) => {
  try {
    if (k) localStorage.setItem(KEY_STORE, k.trim());
    else localStorage.removeItem(KEY_STORE);
  } catch { /* 無痕模式等情況忽略 */ }
};

// 過去紀錄裡最常見的備註 → 分類，當作範例給 Gemini 參考（skip：回測時排除受測的備註）
const buildExamples = (index, limit = 80, skip = null) => {
  const out = [];
  [...index.all.values()]
    .filter((e) => e.cats.size && !(skip && skip.has(e.note)))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .forEach((e) => {
      let best = null, n = 0;
      e.cats.forEach((c, k) => { if (c > n) { n = c; best = k; } });
      if (best) out.push(`${e.note} → ${best.split('|')[2]}`);
    });
  return out;
};

const callGemini = async (key, body, signal) => {
  let lastErr = null;
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal,
    });
    if (res.ok) {
      const data = await res.json();
      return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    }
    const msg = await res.text().catch(() => '');
    lastErr = new Error(res.status === 400 && /API key/i.test(msg) ? '金鑰無效'
      : res.status === 403 ? '金鑰沒有權限（檢查金鑰限制）'
        : res.status === 429 ? '用量超過上限，稍後再試' : `Gemini 回應錯誤（${res.status}）`);
    if (res.status !== 404) break; // 只有「找不到模型」才換下一個
  }
  throw lastErr;
};

// 一次分類多則備註。回傳和 notes 同順序的 { type, group, category } 或 null（沒把握）
const geminiClassify = async (notes, { key, settings, examples, signal }) => {
  const cats = listCategories(settings);
  const names = [...new Set(cats.map((c) => c.category))];
  const monthly = cats.filter((c) => c.type !== 'annual').map((c) => c.category);
  const annual = cats.filter((c) => c.type === 'annual').map((c) => c.category);
  const prompt = [
    '你是一對台灣夫妻的記帳助手。請把每則「備註」歸到下面其中一個分類。',
    `每月分類：${monthly.join('、')}`,
    `年度分類（一年一次或不定期）：${annual.join('、')}`,
    '他們過去的紀錄（備註 → 分類）：',
    ...examples,
    '',
    '規則：只能從上面的分類名稱裡選；真的判斷不出來就回「不確定」，不要硬猜。',
    '要分類的備註：',
    ...notes.map((n, i) => `${i + 1}. ${n}`),
  ].join('\n');

  const text = await callGemini(key, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { i: { type: 'INTEGER' }, category: { type: 'STRING', enum: [...names, '不確定'] } },
          required: ['i', 'category'],
        },
      },
    },
  }, signal);

  let arr = [];
  try { arr = JSON.parse(text); } catch { arr = []; }
  const out = notes.map(() => null);
  for (const r of Array.isArray(arr) ? arr : []) {
    const idx = Number(r?.i) - 1;
    if (idx < 0 || idx >= notes.length) continue;
    const c = cats.find((x) => x.category === r.category);
    if (c) out[idx] = c;
  }
  return out;
};

// 單則備註（記帳抽屜用），同一則備註只問一次
const cache = new Map();
const suggestCategory = async (rawNote, { key, settings, index, signal }) => {
  const note = normNote(rawNote);
  if (!note) return null;
  if (cache.has(note)) return cache.get(note);
  const [c] = await geminiClassify([note], { key, settings, examples: buildExamples(index), signal });
  cache.set(note, c);
  return c;
};

// AI 回測：今年第 1、2 層分不出來的紀錄（假裝還沒記過），抽最多 40 則不同備註一次問 Gemini，和實際分類比對
const backtestGemini = async (transactions, settings, key, since = '') => {
  const index = buildNoteIndex(transactions, settings);
  const picked = new Map();
  for (const t of transactions) {
    const note = normNote(t.note);
    if (!note || picked.has(note) || (since && String(t.date) < since)) continue;
    if (!index.valid.has(`${t.type}|${t.group}|${t.category}`)) continue;
    if (classifyNote(note, t.payer, index, settings, t)) continue;
    picked.set(note, t);
    if (picked.size >= 40) break;
  }
  const notes = [...picked.keys()];
  if (!notes.length) return { total: 0, ok: 0, unsure: 0, misses: [] };
  const res = await geminiClassify(notes, { key, settings, examples: buildExamples(index, 80, new Set(notes)) });
  let ok = 0, unsure = 0;
  const misses = [];
  notes.forEach((n, i) => {
    const t = picked.get(n);
    const c = res[i];
    if (!c) unsure++;
    else if (c.category === t.category) ok++;
    else misses.push(`${n} → ${c.category}（實際 ${t.category}）`);
  });
  return { total: notes.length, ok, unsure, misses: misses.slice(0, 8) };
};

export { getGeminiKey, setGeminiKey, suggestCategory, backtestGemini };
