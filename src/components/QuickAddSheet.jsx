import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { X, Delete, CalendarDays, ChevronDown, Sun, Moon, Users, Trash2, Sparkles, Repeat2 } from 'lucide-react';
import CategoryIcon from './CategoryIcon';
import { Money, SheetShell } from './glass';
import { evalArithmetic, getTodayString, toLocalISOString, haptic } from '../lib/utils';
import {
  buildNoteIndex, classifyNote, getSuggestions, listCategories, normNote,
  getDevicePayer, setDevicePayer, NO_SPEND_OPTIONS, FOOD_CATEGORY,
} from '../lib/quickAdd';
import { getGeminiKey, suggestCategory } from '../lib/gemini';
import { PEOPLE } from '../lib/format';

const OPS = ['+', '−'];
const toExpr = (s) => s.replace(/−/g, '-');
const hasOp = (s) => /[+−]/.test(s.slice(1));
const valueOf = (s) => {
  const v = hasOp(s) ? evalArithmetic(toExpr(s)) : Number(s);
  return Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
};

const dayOffset = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return toLocalISOString(d); };

// 新版記帳抽屜（新增與編輯共用）：一張不用捲動的抽屜。金額＋備註（必填）→ 自動分類；
// 常用建議只看這個人自己的紀錄；日常飲食可標午餐／晚餐、兩人一起（午晚餐都可以）、沒花錢。
const QuickAddSheet = ({ transactions, settings, initialDate, editing = null, isSubmitting, onSave, onDelete, onClose }) => {
  const devicePayer = getDevicePayer();
  const [askPayer, setAskPayer] = useState(!devicePayer && !editing);
  const [payer, setPayer] = useState(editing ? (editing.payer === 'partner' ? 'partner' : 'myself') : (devicePayer || 'myself'));
  const [expr, setExpr] = useState(editing ? String(Math.max(0, Math.round(Number(editing.amount) || 0))) : '0');
  const [note, setNote] = useState(editing ? String(editing.note || '') : '');
  const [manualCat, setManualCat] = useState(editing && editing.category ? { type: editing.type || 'monthly', group: editing.group, category: editing.category } : null);
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState(editing?.date || initialDate || getTodayString());
  const [meal, setMeal] = useState(editing?.meal || null);
  const [together, setTogether] = useState(!!editing?.together);
  const [keepOpen, setKeepOpen] = useState(false);
  const noteRef = useRef(null);

  const index = useMemo(() => buildNoteIndex(transactions, settings), [transactions, settings]);
  const categories = useMemo(() => listCategories(settings), [settings]);
  const foodCat = useMemo(() => categories.find((c) => c.category === FOOD_CATEGORY) || null, [categories]);

  const auto = useMemo(() => classifyNote(note, payer, index, settings), [note, payer, index, settings]);
  const cat = manualCat || auto;

  // 第 3 層：前兩層都分不出來時，停止打字 0.8 秒後問 Gemini（有設定金鑰才會問）。只當建議，點了才採用。
  const [ai, setAi] = useState(null); // { note, cat, loading, error }
  const geminiKey = useMemo(() => getGeminiKey(), []);
  const noteKey = normNote(note);
  const wantAi = !!geminiKey && !editing && !cat && noteKey.length >= 1;
  useEffect(() => {
    if (!wantAi) return undefined;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setAi({ note: noteKey, cat: null, loading: true });
      suggestCategory(noteKey, { key: geminiKey, settings, index, signal: ctrl.signal })
        .then((c) => setAi({ note: noteKey, cat: c, loading: false }))
        .catch((e) => { if (e.name !== 'AbortError') setAi({ note: noteKey, cat: null, loading: false, error: e.message }); });
    }, 800);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [wantAi, noteKey, geminiKey, settings, index]);
  const aiNow = wantAi && ai && ai.note === noteKey ? ai : null;
  const isFood = cat?.category === FOOD_CATEGORY;
  // 餐別只對日常飲食有意義；改成其他分類時直接視為沒選
  const effMeal = isFood || !cat ? meal : null;
  const suggestions = useMemo(() => getSuggestions(index, payer, effMeal, 10), [index, payer, effMeal]);
  const amount = valueOf(expr);

  const press = (k) => {
    haptic(5);
    setExpr((s) => {
      if (k === 'C') return '0';
      if (k === '⌫') return s.length > 1 ? s.slice(0, -1) : '0';
      if (k === '=') return String(valueOf(s));
      if (OPS.includes(k)) {
        if (s === '0') return s;
        return OPS.includes(s.slice(-1)) ? s.slice(0, -1) + k : s + k;
      }
      if (s.length >= 14) return s;
      if (s === '0') return k === '00' ? '0' : k;
      return s + k;
    });
  };

  const reset = () => {
    setExpr('0'); setNote(''); setManualCat(null); setMeal(null); setTogether(false); setPicking(false);
  };

  const buildTx = (over = {}) => {
    const c = over.cat || cat;
    const tx = {
      amount: over.amount ?? amount,
      note: (over.note ?? note).trim(),
      type: c.type, group: c.group, category: c.category,
      date, payer,
    };
    const m = over.meal ?? effMeal;
    if (c.category === FOOD_CATEGORY && m) {
      tx.meal = m;
      if (over.together ?? together) tx.together = true;
    }
    return tx;
  };

  // $0 也可以記（例如公司便當、別人請客），只要寫了備註、有分類
  const blocker = !note.trim() ? '寫一下買了什麼' : !cat ? '選一個分類' : null;

  const save = () => {
    if (blocker || isSubmitting) {
      if (!note.trim()) noteRef.current?.focus();
      else if (!cat) setPicking(true);
      return;
    }
    onSave(buildTx(), { keepOpen: editing ? false : keepOpen, edit: editing });
    if (keepOpen && !editing) reset();
  };

  const saveNoSpend = (label) => {
    if (!foodCat || !meal || isSubmitting) return;
    onSave(buildTx({ amount: 0, note: label, cat: foodCat }), { keepOpen, noSpend: true });
    if (keepOpen) reset();
  };

  const pickSuggestion = (s) => {
    haptic(8);
    setNote(s.note);
    setManualCat(null);
    if (s.amount !== null && amount === 0) setExpr(String(s.amount));
  };

  const choosePayerForDevice = (p) => {
    setDevicePayer(p);
    setPayer(p);
    setAskPayer(false);
  };

  const dateChips = [['今天', 0], ['昨天', 1], ['前天', 2]];
  const isChipDate = dateChips.some(([, o]) => dayOffset(o) === date);
  const dateLabel = isChipDate ? null : `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

  const groupsForPicker = useMemo(() => [
    { key: 'monthly', label: '每月', items: categories.filter((c) => c.type !== 'annual') },
    { key: 'annual', label: '年度（一年一次或不定期）', items: categories.filter((c) => c.type === 'annual') },
  ].filter((g) => g.items.length), [categories]);

  return (
    <SheetShell onClose={onClose} z="z-[60]" avoidKeyboard={false}>
      {/* ── 第一次使用：這支手機是誰的 */}
      {askPayer && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 p-8" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.97), rgba(248, 246, 242,.96))' }}>
          <div className="text-[21px] font-bold tracking-tight text-slate-900">這支手機是誰在記帳？</div>
          <p className="text-sm text-slate-500 text-center -mt-2 leading-relaxed">之後記帳會自動記在這個人名下，<br />需要時點右上角頭像可以臨時切換。</p>
          <div className="flex gap-4">
            {Object.entries(PEOPLE).map(([k, p]) => (
              <button key={k} type="button" onClick={() => choosePayerForDevice(k)}
                className={`press glass-card !rounded-[26px] ${p.tint} w-28 py-5 flex flex-col items-center gap-2.5`}>
                <span className={`orb-icon ${p.orb} w-12 h-12 text-xl font-bold`}>{p.short}</span>
                <span className={`text-[15px] font-bold ${p.text}`}>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 頂列：標題、日期、記帳人、關閉 */}
      <div className="flex items-center gap-2 pl-6 pr-4 pt-1 pb-1">
        <h2 className="text-[20px] font-bold tracking-tight text-slate-900 mr-1 shrink-0">{editing ? '編輯' : '記一筆'}</h2>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-hide py-3 -my-3 px-2 -mx-1.5">
          {dateChips.map(([label, off]) => {
            const v = dayOffset(off);
            return (
              <button key={label} type="button" onClick={() => setDate(v)} aria-pressed={date === v} className="chip chip-sm shrink-0">{label}</button>
            );
          })}
          <label className={`chip chip-sm relative shrink-0 tabular-nums ${dateLabel ? 'on' : ''}`}>
            <CalendarDays className="w-3.5 h-3.5" strokeWidth={2.2} />{dateLabel}
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="absolute inset-0 opacity-0" aria-label="選擇日期" />
          </label>
        </div>
        <button type="button" onClick={() => setPayer(payer === 'myself' ? 'partner' : 'myself')}
          className={`press orb-icon ${PEOPLE[payer].orb} w-9 h-9 text-sm font-bold`}
          aria-label={`記帳人：${PEOPLE[payer].name}（點一下切換）`}>
          {PEOPLE[payer].short}
        </button>
        <button type="button" onClick={onClose} className="icon-btn glass-well !w-8 !h-8 text-slate-500 shrink-0" aria-label="關閉"><X className="w-4 h-4" strokeWidth={2.6} /></button>
      </div>

      {/* ── 金額 */}
      <div className="px-6 pt-1 flex items-end justify-between gap-3">
        <div className={`text-xs font-semibold pb-2.5 ${PEOPLE[payer].text}`}>{payer !== devicePayer && devicePayer ? `記在 ${PEOPLE[payer].name} 名下` : ''}</div>
        <div className="text-right min-w-0">
          <div className="font-num text-[13px] font-semibold text-slate-400 tabular-nums truncate h-[18px]">{hasOp(expr) ? expr : ''}</div>
          <Money value={amount} className={`text-[50px] leading-[1.05] tracking-[-0.035em] ${amount === 0 ? 'text-slate-300' : 'money-ink'}`} />
        </div>
      </div>

      {/* ── 備註＋分類 */}
      <div className="px-5 mt-2">
        <div className="field field-row !rounded-[20px] !pl-4 !pr-1.5">
          <input ref={noteRef} value={note} onChange={(e) => { setNote(e.target.value); if (!editing) setManualCat(null); }}
            placeholder="買了什麼？" className="!text-base font-medium" enterKeyHint="done"
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
          <button type="button" onClick={() => setPicking((v) => !v)}
            className={`press shrink-0 flex items-center gap-1.5 py-1 rounded-full text-[13px] font-bold ${
              cat ? `chip !p-1 !pr-2.5 ${auto && !manualCat && auto.kind === 'kw' ? 'on-amber' : ''}`
                : 'text-slate-400 border-[1.5px] border-dashed border-slate-300 pl-3 pr-2.5 !py-1.5'}`}>
            {cat && <CategoryIcon category={cat.category} group={cat.group} type={cat.type} size="xs" />}
            <span className="max-w-[7rem] truncate">{cat ? cat.category : '自動分類'}{cat && !manualCat && auto?.kind === 'kw' ? '？' : ''}</span>
            <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-300 ${picking ? 'rotate-180' : ''}`} strokeWidth={2.6} />
          </button>
        </div>
      </div>

      {/* ── AI 建議（Gemini）：點一下才採用 */}
      {!picking && aiNow && (
        <div className="px-5 mt-2.5 flex items-center gap-2 text-[13px]">
          <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
          {aiNow.loading ? <span className="text-slate-400">AI 想想看…</span>
            : aiNow.cat ? (
              <button type="button" onClick={() => { setManualCat(aiNow.cat); haptic(8); }} className="chip chip-sm on-violet !p-1 !pr-3">
                <CategoryIcon category={aiNow.cat.category} group={aiNow.cat.group} type={aiNow.cat.type} size="xs" />
                AI 建議：{aiNow.cat.category}<span className="font-medium opacity-70">（點一下採用）</span>
              </button>
            ) : <span className="text-slate-400">{aiNow.error ? `AI 沒回應：${aiNow.error}` : 'AI 也沒把握，請自己選分類'}</span>}
        </div>
      )}

      {/* ── 常用建議（只看這個人的紀錄） */}
      {!picking && suggestions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5 pt-3 pb-3 -mb-3 -mt-0.5">
          {suggestions.map((s) => (
            <button key={s.note} type="button" onClick={() => pickSuggestion(s)} aria-pressed={note === s.note} className="chip chip-sm shrink-0">
              {s.note}{s.amount !== null ? <span className="font-num opacity-60 tabular-nums">${s.amount.toLocaleString()}</span> : null}
            </button>
          ))}
        </div>
      )}

      {/* ── 日常飲食：哪一餐、兩人一起、沒花錢 */}
      {!picking && (isFood || (!cat && foodCat)) && (
        <div className="px-5 mt-3 flex items-center gap-1.5 flex-wrap">
          {[['lunch', '午餐', Sun], ['dinner', '晚餐', Moon]].map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => { if (meal === k) { setMeal(null); setTogether(false); } else setMeal(k); if (!cat && foodCat) setManualCat(foodCat); }}
              className={`chip chip-sm ${meal === k ? 'on-emerald' : ''}`}>
              {createElement(Icon, { className: 'w-3.5 h-3.5', strokeWidth: 2.3 })}{label}
            </button>
          ))}
          {meal && (
            <button type="button" onClick={() => setTogether(!together)} className={`chip chip-sm ${together ? 'on-indigo' : ''}`}>
              <Users className="w-3.5 h-3.5" strokeWidth={2.3} />兩人一起
            </button>
          )}
          {meal && !editing && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[11px] font-semibold text-slate-400 mr-0.5">沒花錢</span>
              {NO_SPEND_OPTIONS.map((o) => (
                <button key={o} type="button" onClick={() => saveNoSpend(o)} className="press glass-well px-2.5 py-1.5 rounded-full text-xs font-bold text-slate-600">{o}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 分類選擇（取代鍵盤區） */}
      {picking ? (
        <div data-keep-scroll className="mt-3 px-5 overflow-y-auto scrollbar-hide fade-up" style={{ maxHeight: '46dvh' }}>
          {groupsForPicker.map((g) => (
            <div key={g.key} className="mb-3.5">
              <div className="eyebrow mb-2 ml-1">{g.label}</div>
              <div className="grid grid-cols-3 gap-2">
                {g.items.map((c) => {
                  const on = cat && cat.type === c.type && cat.group === c.group && cat.category === c.category;
                  return (
                    <button key={`${c.type}|${c.group}|${c.category}`} type="button" onClick={() => { setManualCat(c); setPicking(false); haptic(8); }} aria-pressed={!!on}
                      className={`press flex items-center gap-1.5 p-1.5 pr-2 rounded-2xl text-xs font-bold text-left ${on ? 'btn-ink' : 'text-slate-700 bg-white/65'}`}
                      style={on ? undefined : { boxShadow: 'inset 0 1px 0 #fff, 0 0 0 0.5px var(--edge), 0 3px 8px -5px rgba(36, 34, 31,.3)' }}>
                      <CategoryIcon category={c.category} group={c.group} type={c.type} size="sm" />
                      <span className="truncate">{c.category}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 px-5 mt-3.5">
          {['7', '8', '9', '⌫', '4', '5', '6', '+', '1', '2', '3', '−', 'C', '0', '00', '='].map((k) => {
            const fn = ['⌫', '+', '−', 'C', '='].includes(k);
            return (
              <button key={k} type="button" onClick={() => press(k)} className={`key ${fn ? 'fn' : ''}`} aria-label={k === '⌫' ? '刪除' : k}>
                {k === '⌫' ? <Delete className="w-[22px] h-[22px]" strokeWidth={2} /> : k}
              </button>
            );
          })}
        </div>
      )}

      {/* ── 記下 */}
      <div className="flex items-center gap-2.5 px-5 mt-3.5 pb-5">
        {editing ? (
          <button type="button" onClick={() => onDelete && onDelete(editing)} className="btn btn-danger shrink-0 h-[54px] px-4 text-sm" aria-label="刪除這筆">
            <Trash2 className="w-4 h-4" />刪除
          </button>
        ) : (
          <button type="button" onClick={() => setKeepOpen(!keepOpen)} aria-pressed={keepOpen}
            className={`btn shrink-0 h-[54px] px-4 text-sm ${keepOpen ? 'btn-glass !text-slate-900' : 'glass-well !text-slate-400'}`}>
            <Repeat2 className="w-4 h-4" strokeWidth={2.4} />連續記
          </button>
        )}
        <button type="button" onClick={save} disabled={isSubmitting}
          className={`btn flex-1 min-w-0 h-[54px] text-[17px] ${blocker ? 'glass-well !text-slate-500' : 'btn-ink'}`}>
          {blocker || (editing ? '儲存' : '記下')}
        </button>
      </div>
    </SheetShell>
  );
};

export default QuickAddSheet;
