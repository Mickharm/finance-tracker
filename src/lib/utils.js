const FINNHUB_API_KEY = 'd58c17hr01qptoarifpgd58c17hr01qptoarifq0';
const PRICE_CACHE_KEY = 'finnhub_price_cache';
const PRICE_CACHE_TTL = 5 * 60 * 1000;

const getCachedPrices = () => {
  try {
    const raw = localStorage.getItem(PRICE_CACHE_KEY);
    if (!raw) return {};
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > PRICE_CACHE_TTL) {
      localStorage.removeItem(PRICE_CACHE_KEY);
      return {};
    }
    return data || {};
  } catch { return {}; }
};

const setCachedPrices = (prices) => {
  try {
    const existing = getCachedPrices();
    const merged = { ...existing, ...prices };
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: merged }));
  } catch { /* quota exceeded */ }
};


const formatDetailedDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (週${weekdays[date.getDay()]})`;
};
const toLocalISOString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const getTodayString = () => toLocalISOString(new Date());
const getFixedDepositAmount = (year) => {
  if (year >= 2022 && year <= 2029) return 20000;
  if (year >= 2040) return 30000;
  return 0;
};

// Safe arithmetic evaluator for the calculator pad (replaces eval()).
// Supports + - * / with standard precedence; no parentheses needed (the pad can't produce them).
const evalArithmetic = (expr) => {
  const clean = String(expr).replace(/,/g, '').replace(/[+\-*/]$/, '').trim();
  if (!clean) return 0;
  const tokens = clean.match(/(\d+\.?\d*|\.\d+|[+\-*/])/g);
  if (!tokens) return 0;

  const nums = [];
  const ops = [];
  let expectNumber = true;
  for (const tk of tokens) {
    if (tk.length === 1 && '+-*/'.includes(tk)) {
      if (expectNumber) {
        if (tk === '-') { nums.push(0); ops.push('-'); expectNumber = false; } // unary minus
      } else {
        ops.push(tk);
        expectNumber = true;
      }
    } else {
      nums.push(parseFloat(tk));
      expectNumber = false;
    }
  }
  if (nums.length === 0) return 0;

  // First pass: resolve * and /
  const n2 = [nums[0]];
  const o2 = [];
  for (let i = 0; i < ops.length; i++) {
    const val = nums[i + 1] ?? 0;
    if (ops[i] === '*') n2[n2.length - 1] *= val;
    else if (ops[i] === '/') n2[n2.length - 1] = val === 0 ? 0 : n2[n2.length - 1] / val;
    else { o2.push(ops[i]); n2.push(val); }
  }

  // Second pass: resolve + and -
  let result = n2[0];
  for (let i = 0; i < o2.length; i++) {
    result = o2[i] === '+' ? result + n2[i + 1] : result - n2[i + 1];
  }
  return Number.isFinite(result) ? result : 0;
};


// Haptic feedback — iOS 16.4+ PWA standalone 支援 Web Vibration API
const haptic = (pattern = 10) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
};

// Number input that shows live thousand separators while typing; commits the raw
// number (no commas) on change/blur. Reusable for any amount field.
const formatThousands = (raw) => {
  if (raw === '' || raw === '.') return raw;
  const [int, dec] = raw.split('.');
  const f = Number(int || 0).toLocaleString('en-US');
  return dec !== undefined ? `${f}.${dec}` : f;
};

export { FINNHUB_API_KEY, getCachedPrices, setCachedPrices, formatDetailedDate, toLocalISOString, getTodayString, getFixedDepositAmount, evalArithmetic, haptic, formatThousands };
