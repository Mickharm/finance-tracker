import { createElement, useMemo, useState } from 'react';
import { Sun, Moon, Users, Minus, ChevronRight, Check, CircleDashed, TrendingUp, Sparkles, TriangleAlert } from 'lucide-react';
import { getTodayString, toLocalISOString } from '../lib/utils';
import { makeFixedMatcher, bucketOf, budgetPlan, yearByMonth } from '../lib/budget';
import { mealStatusFor, isNoSpend } from '../lib/meals';
import { short } from '../lib/format';
import { Money, Vessel, Segmented, StackTube } from '../components/glass';
import { PersonDot, Section, LinkButton, Dot } from '../components/v2';

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;
const PEOPLE = [
  { key: 'myself', name: '士程', text: 'text-blue-700', tint: 'tint-blue', dot: 'blue' },
  { key: 'partner', name: '佳欣', text: 'text-rose-700', tint: 'tint-rose', dot: 'rose' },
];
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

// 今年已經過了多少（0–1）
const yearProgress = (d) => {
  const y = d.getFullYear();
  const days = new Date(y, 1, 29).getMonth() === 1 ? 366 : 365;
  return (Math.floor((d - new Date(y, 0, 1)) / 86400000) + 1) / days;
};

// 一餐的狀態：有記／沒花／一起／未記
const MEAL_LOOK = {
  paid: ['tag-emerald', Check, '有記'],
  nospend: ['tag-slate', Minus, '沒花'],
  together: ['tag-indigo', Users, '一起'],
};
const MealToken = ({ label, icon, status }) => {
  const [look, mark, text] = MEAL_LOOK[status] || ['', CircleDashed, '未記'];
  return (
    <span className={`flex-1 min-w-0 flex items-center justify-center gap-1 h-7 rounded-full text-[11px] font-bold whitespace-nowrap ${status ? `tag ${look}` : 'text-slate-400 border border-dashed border-slate-300/90'}`}>
      {createElement(status ? mark : icon, { className: 'w-3 h-3 shrink-0', strokeWidth: 2.6 })}{label}<span className="font-semibold opacity-75">{text}</span>
    </span>
  );
};

const Stat = ({ label, children, tone = 'text-slate-800' }) => (
  <div className="min-w-0 px-1 first:pl-0 last:pr-0">
    <div className="text-[11px] font-semibold text-slate-500 truncate">{label}</div>
    <div className={`font-num text-[17px] leading-tight font-bold tabular-nums mt-1 truncate ${tone}`}>{children}</div>
  </div>
);

// 3.0 總覽：照「多常看」由上往下排 —
// 本月還能花多少（液體球）→ 今天兩個人記了什麼、每餐有沒有交代 → 這週 → 今年三桶
const HomeV2 = ({ transactions, settings, flexMonthly, selectedDate, onOpenDay, onOpenBudget, onEdit }) => {
  const [dayMode, setDayMode] = useState(0); // 0 今天、1 昨天
  const isFixed = useMemo(() => makeFixedMatcher(settings), [settings]);
  const plan = useMemo(() => budgetPlan(settings, flexMonthly), [settings, flexMonthly]);

  const year = selectedDate.getFullYear();
  const monthIdx = selectedDate.getMonth();
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && monthIdx === now.getMonth();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const dayOfMonth = isCurrentMonth ? now.getDate() : daysInMonth;
  const yearPct = year === now.getFullYear() ? yearProgress(now) : null; // 今年已過的比例（看別的年份時不顯示）

  const months = useMemo(() => yearByMonth(transactions, year, isFixed), [transactions, year, isFixed]);
  const mb = months[monthIdx];
  const flexLeft = plan.flex - mb.flex;
  const pace = mb.flex / dayOfMonth * daysInMonth;
  const timePct = (dayOfMonth / daysInMonth) * 100;
  const leftPct = plan.flex > 0 ? Math.max(0, flexLeft) / plan.flex : 0;
  const daysLeft = isCurrentMonth ? daysInMonth - dayOfMonth + 1 : 0; // 含今天
  const perDay = daysLeft > 0 ? Math.max(0, flexLeft) / daysLeft : 0;
  const status = flexLeft < 0 ? 'over' : isCurrentMonth && pace > plan.flex ? 'warn' : 'ok';
  const tone = { over: 'red', warn: 'amber', ok: 'emerald' }[status];
  const heroLen = Math.abs(Math.round(flexLeft)).toLocaleString().length + (flexLeft < 0 ? 1 : 0);
  const heroSize = heroLen <= 5 ? 'text-[54px]' : heroLen === 6 ? 'text-[46px]' : heroLen === 7 ? 'text-[40px]' : 'text-[34px]';

  // ── 今天／昨天
  const dayStr = (() => { const d = new Date(); d.setDate(d.getDate() - dayMode); return toLocalISOString(d); })();
  const dayTx = useMemo(() => transactions.filter((t) => t.date === dayStr), [transactions, dayStr]);

  // ── 這週（最近 7 天，到今天為止）
  const week = useMemo(() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = toLocalISOString(d);
      const list = transactions.filter((t) => t.date === ds);
      out.push({
        ds, wd: WEEK[d.getDay()], day: d.getDate(),
        flex: list.filter((t) => bucketOf(t, isFixed) === 'flex').reduce((s, t) => s + (Number(t.amount) || 0), 0),
        who: { myself: list.some((t) => t.payer !== 'partner'), partner: list.some((t) => t.payer === 'partner') },
        isToday: ds === getTodayString(),
      });
    }
    return out;
  }, [transactions, isFixed]);
  const weekMax = Math.max(1, ...week.map((d) => d.flex));
  const weekTotal = week.reduce((s, d) => s + d.flex, 0);

  // ── 今年
  const ytd = months.reduce((a, m) => ({ fixed: a.fixed + m.fixed, flex: a.flex + m.flex, annual: a.annual + m.annual }), { fixed: 0, flex: 0, annual: 0 });
  const ytdTotal = ytd.fixed + ytd.flex + ytd.annual;
  const bucketRows = [
    { key: 'fixed', label: '固定', used: ytd.fixed, budget: plan.fixed * 12, tone: 'indigo' },
    { key: 'flex', label: '彈性', used: ytd.flex, budget: plan.flex * 12, tone: 'emerald' },
    { key: 'annual', label: '年度', used: ytd.annual, budget: plan.annual, tone: 'amber' },
  ];

  return (
    <div className="space-y-7 stagger">
      {/* ── 本月還能花：大數字＋裝著「剩餘額度」的液體球 */}
      <section className={`glass-card p-5 ${status === 'over' ? 'tint-red' : status === 'warn' ? 'tint-amber' : ''}`}>
        {/* 金繼：一道細細的金線，從左邊往上走，到液體球前面就淡掉（球是透明的，線不能穿過去） */}
        <svg className="vein" viewBox="0 0 340 220" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="vein-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#C9A45C" stopOpacity="0" /><stop offset="0.3" stopColor="#C9A45C" /><stop offset="0.72" stopColor="#8A6A22" /><stop offset="1" stopColor="#8A6A22" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path pathLength="1" d="M0 154 C 36 142 64 164 104 150 S 168 120 198 130 S 210 126 216 122" />
        </svg>
        <div className="flex items-center justify-between">
          <span className="eyebrow">{isCurrentMonth ? '本月還能花' : `${monthIdx + 1} 月彈性結餘`}</span>
          <button type="button" onClick={onOpenBudget} className="press text-xs font-semibold text-slate-500 flex items-center">每月額度 {fmt(plan.flex)}<ChevronRight className="w-3.5 h-3.5 -mr-1" strokeWidth={2.4} /></button>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="min-w-0 flex-1">
            <Money value={flexLeft} animate id={`home-left-${year}-${monthIdx}`} className={`${heroSize} leading-none tracking-[-0.035em] ${flexLeft < 0 ? 'text-red-700' : 'money-ink'}`} />
            <div className={`mt-3.5 flex items-start gap-1.5 text-[13px] leading-snug font-semibold ${status === 'over' ? 'text-red-700' : status === 'warn' ? 'text-amber-800' : 'text-slate-600'}`}>
              {createElement(status === 'ok' ? Sparkles : status === 'warn' ? TrendingUp : TriangleAlert, { className: `w-4 h-4 shrink-0 mt-px ${status === 'ok' ? 'text-emerald-600' : ''}`, strokeWidth: 2.3 })}
              <span>
                {!isCurrentMonth ? (status === 'over' ? `這個月超出 ${fmt(-flexLeft)}` : `這個月用了額度的 ${Math.round((mb.flex / plan.flex) * 100)}%`)
                  : status === 'over' ? `已超出額度，還有 ${daysLeft} 天`
                    : status === 'warn' ? <>照這速度月底會超出 <span className="font-num font-bold">{fmt(pace - plan.flex)}</span></>
                      : <>剩 {daysLeft} 天，每天可花 <span className="font-num font-bold text-slate-900">{fmt(perDay)}</span></>}
              </span>
            </div>
          </div>
          <div className="shrink-0 ml-3 flex flex-col items-center">
            <Vessel pct={leftPct} tone={tone} className="w-[104px] h-[104px]" mark={isCurrentMonth ? 1 - timePct / 100 : null}>
              <span className="font-num text-[25px] leading-none font-bold tracking-tight">{Math.round(leftPct * 100)}<span className="text-[13px] font-bold ml-px">%</span></span>
              <span className="text-[10px] font-bold opacity-80 mt-1">剩餘</span>
            </Vessel>
            {isCurrentMonth && (
              <div className="mt-2 flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-500 whitespace-nowrap">
                <span className="w-3.5 border-t-[1.5px] border-dashed border-slate-500" />今天應剩 <span className="font-num font-bold text-slate-700">{Math.round(100 - timePct)}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5 pt-4" style={{ boxShadow: 'inset 0 0.5px 0 0 var(--hair)' }}>
          <Stat label="彈性已花">{fmt(mb.flex)}</Stat>
          {isCurrentMonth
            ? <Stat label="月底預估" tone={pace > plan.flex ? 'text-red-700' : 'text-slate-800'}>{fmt(pace)}</Stat>
            : <Stat label="每天平均">{fmt(mb.flex / daysInMonth)}</Stat>}
          <Stat label={mb.annual > 0 ? '固定＋年度' : '固定支出'}>{fmt(mb.fixed + mb.annual)}</Stat>
        </div>
      </section>

      {/* ── 今天：兩個人、每一餐 */}
      <Section
        title={<span className="flex items-baseline gap-2">{dayMode === 0 ? '今天' : '昨天'}<span className="font-num text-[13px] font-semibold text-slate-400">{Number(dayStr.slice(5, 7))}/{Number(dayStr.slice(8, 10))}</span></span>}
        extra={<Segmented size="sm" options={[[0, '今天'], [1, '昨天']]} value={dayMode} onChange={setDayMode} />}>
        <div className="grid grid-cols-2 gap-3">
          {PEOPLE.map((p) => {
            const mine = dayTx.filter((t) => (t.payer === 'partner' ? 'partner' : 'myself') === p.key);
            const st = mealStatusFor(dayTx, p.key);
            const total = mine.reduce((s, t) => s + (Number(t.amount) || 0), 0);
            return (
              <div key={p.key} className={`glass-card !rounded-[24px] ${p.tint} p-3.5 min-w-0`}>
                <div className="flex items-center gap-2">
                  <PersonDot owner={p.key} size="w-8 h-8 text-[13px]" />
                  <span className={`text-[13px] font-bold ${p.text}`}>{p.name}</span>
                  <Money value={total} className="ml-auto text-[19px] text-slate-900" />
                </div>
                <div className="flex gap-1.5 mt-3">
                  <MealToken label="午" icon={Sun} status={st.lunch} />
                  <MealToken label="晚" icon={Moon} status={st.dinner} />
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {mine.length === 0 && <div className="text-xs text-slate-400 py-1.5 text-center">還沒有紀錄</div>}
                  {mine.slice(0, 4).map((t) => (
                    <button key={t.id} type="button" onClick={() => onEdit && onEdit(t)} className="press w-full flex items-center justify-between gap-1.5 text-[13px] rounded-xl px-2.5 py-1.5 bg-white/55" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9), 0 0 0 0.5px var(--hair)' }}>
                      <span className="truncate font-semibold text-slate-700">{isNoSpend(t) ? <span className="flex items-center gap-1 text-slate-500"><Minus className="w-3 h-3" />{t.note}</span> : t.note || t.category}</span>
                      <span className="font-num font-bold tabular-nums text-slate-600 shrink-0">{fmt(Number(t.amount) || 0)}</span>
                    </button>
                  ))}
                  {mine.length > 4 && <button type="button" onClick={() => onOpenDay(dayStr)} className="text-xs font-semibold text-slate-500 w-full text-center pt-0.5">還有 {mine.length - 4} 筆</button>}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── 這週 */}
      <Section title="這週" extra={<span className="text-[13px] text-slate-500 flex items-baseline gap-1.5">近 7 天彈性<Money value={weekTotal} className="text-[16px] text-slate-900" /></span>}>
        <div className="glass-card px-3.5 pt-4 pb-3.5">
          <div className="grid grid-cols-7 gap-2 items-end h-[122px]">
            {week.map((d, i) => (
              <button key={d.ds} type="button" onClick={() => onOpenDay(d.ds)} className="press flex flex-col items-center justify-end h-full gap-1.5" aria-label={`${d.day} 日 ${fmt(d.flex)}`}>
                <span className={`font-num text-[11px] font-bold tabular-nums ${d.isToday ? 'text-amber-700' : 'text-slate-500'}`}>{d.flex ? (d.flex >= 1000 ? `${(d.flex / 1000).toFixed(1)}k` : d.flex) : ''}</span>
                {/* 今天那一條是金色，其他天是透光的松葉色 */}
                <span className={`vbar !rounded-[11px] grow-y ${d.isToday ? 'tone-amber lit' : 'tone-emerald soft'}`} style={{ height: `${Math.max(6, (d.flex / weekMax) * 84)}px`, '--i': i }} />
              </button>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 mt-2">
            {week.map((d) => (
              <div key={d.ds} className="flex flex-col items-center gap-1.5">
                <span className={`w-7 h-7 grid place-items-center rounded-full text-xs font-bold ${d.isToday ? 'btn-ink' : 'text-slate-500'}`}>{d.wd}</span>
                <span className="flex gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${d.who.myself ? 'bg-blue-500' : 'bg-slate-300/70'}`} />
                  <span className={`w-1.5 h-1.5 rounded-full ${d.who.partner ? 'bg-rose-500' : 'bg-slate-300/70'}`} />
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-3 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />士程有記帳</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />佳欣有記帳</span>
          </div>
        </div>
      </Section>

      {/* ── 今年：三桶各是一個裝著液體的玻璃瓶 */}
      <Section title={`${year} 年`} extra={<LinkButton onClick={onOpenBudget}>預算設定<ChevronRight className="w-3.5 h-3.5" strokeWidth={2.4} /></LinkButton>}>
        <div className="glass-card p-5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="eyebrow">今年已花</div>
              <Money value={ytdTotal} animate id={`home-ytd-${year}`} className="text-[34px] leading-tight money-ink" />
            </div>
            <div className="text-right shrink-0 pb-1">
              <div className="font-num text-[22px] leading-none font-bold text-slate-900">{plan.yearTotal > 0 ? Math.round((ytdTotal / plan.yearTotal) * 100) : 0}<span className="text-sm ml-px">%</span></div>
              <div className="text-xs text-slate-500 mt-1.5">年度預算 <span className="font-num font-semibold">{fmt(plan.yearTotal)}</span></div>
            </div>
          </div>
          <div className="relative mt-3.5">
            <StackTube parts={bucketRows.map((b) => ({ key: b.key, value: b.used, tone: b.tone }))} total={Math.max(plan.yearTotal, ytdTotal)} height={12} />
            {yearPct !== null && <span className="absolute w-[2px] rounded-full bg-slate-700/70 pointer-events-none" style={{ left: `calc(${Math.min(1, yearPct) * 100}% - 1px)`, top: -3, bottom: -3 }} aria-hidden="true" />}
          </div>
          {yearPct !== null && <div className="text-[11px] text-slate-400 mt-2 text-right">刻度＝今年已過 {Math.round(yearPct * 100)}% 的時間</div>}

          <div className="grid grid-cols-3 gap-3 mt-4">
            {bucketRows.map((b) => {
              const p = b.budget > 0 ? b.used / b.budget : 0;
              const over = b.used > b.budget;
              return (
                <div key={b.key} className="min-w-0 flex flex-col items-center">
                  <Vessel shape="jar" tone={over ? 'red' : b.tone} pct={p} className="w-full h-[96px]">
                    <span className="font-num text-[20px] leading-none font-bold tracking-tight">{Math.round(p * 100)}<span className="text-[11px] ml-px">%</span></span>
                  </Vessel>
                  <div className="mt-2.5 text-[13px] font-bold text-slate-800 flex items-center gap-1.5"><Dot tone={b.tone} className="!w-2 !h-2" />{b.label}</div>
                  <div className={`font-num text-[11px] font-semibold tabular-nums mt-0.5 ${over ? 'text-red-700' : 'text-slate-500'}`}>{short(b.used)} / {short(b.budget)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>
    </div>
  );
};

export default HomeV2;
