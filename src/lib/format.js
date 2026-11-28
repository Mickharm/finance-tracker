// 2.0 收入、資產各頁共用的數字格式與兩人設定

export const fmt = (n, digits = 0) => {
  const v = Number(n) || 0;
  return `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 })}`;
};
export const fmtSigned = (n, digits = 0) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n), digits)}`;
export const pct = (n, digits = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(digits)}%`;
export const short = (n) => {
  const a = Math.abs(n);
  if (a >= 1e8) return `${(n / 1e8).toFixed(1)}億`;
  if (a >= 1e4) return `${(n / 1e4).toFixed(a >= 1e6 ? 0 : 1)}萬`;
  return Math.round(n).toLocaleString();
};

export const PEOPLE = {
  myself: { name: '士程', short: '士', tone: 'blue', tint: 'tint-blue', text: 'text-blue-700', orb: 'orb-me', chip: 'on-blue', tag: 'tag-blue' },
  partner: { name: '佳欣', short: '欣', tone: 'rose', tint: 'tint-rose', text: 'text-rose-700', orb: 'orb-her', chip: 'on-rose', tag: 'tag-rose' },
};
