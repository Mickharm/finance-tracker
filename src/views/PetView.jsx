import { useMemo, useState } from 'react';
import { Cat, Stethoscope, Bath, ShieldCheck, Syringe, Star, Weight, Pill, Plus, Pencil, CalendarClock } from 'lucide-react';
import { ViewLoader } from '../components/ui';
import { getTodayString } from '../lib/utils';
import { fmt } from '../lib/format';
import { Money, Segmented, StackTube } from '../components/glass';
import {
  HeroButton, Section, AddButton, Empty, IconDot, Dot, Chips, Seg, Field, MoneyInput, TextInput, DateInput, DatePick, SmallInput, Sheet, LineChart,
} from '../components/v2';

// ─── 阿奇的紀錄（看診、洗澡、驅蟲、體重、疫苗…）────────────────────────────
// 資料在 pet_records：每筆 { kind, date, title, place, amount, costNote, note, weight, withCarrier, meds, monthOnly }
// 另有一筆 id＝'profile' 的基本資料 { kind:'profile', date:生日, name, breed, chip, homeDate }。
// 這裡的費用只是照顧紀錄的參考，不會進記帳的支出（支出照舊用「記一筆」記）。

const COL = 'pet_records';
const KINDS = {
  vet: { label: '看診', icon: Stethoscope, tone: 'rose' },
  bath: { label: '洗澡', icon: Bath, tone: 'blue' },
  deworm: { label: '驅蟲', icon: ShieldCheck, tone: 'emerald' },
  weight: { label: '體重', icon: Weight, tone: 'amber' },
  vaccine: { label: '疫苗', icon: Syringe, tone: 'indigo' },
  other: { label: '其他', icon: Star, tone: 'slate' },
};
const KIND_ORDER = ['vet', 'bath', 'deworm', 'weight', 'vaccine', 'other'];
const FILTERS = [['all', '全部'], ['vet', '看診'], ['bath', '洗澡'], ['deworm', '驅蟲'], ['weight', '體重'], ['misc', '其他']];
const NUMBERED = ['vet', 'bath', 'deworm', 'vaccine'];
const COST_KINDS = [['vet', '看診'], ['bath', '洗澡'], ['deworm', '驅蟲'], ['misc', '其他']];

const n = (v) => Number(v) || 0;
const parse = (d) => new Date(`${String(d).slice(0, 10)}T00:00:00`);
const asc = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
const kindOf = (r) => (KINDS[r.kind] ? r.kind : 'other');
const costGroup = (r) => (['vet', 'bath', 'deworm'].includes(r.kind) ? r.kind : 'misc');
const dateText = (r) => {
  const d = String(r.date || '');
  return r.monthOnly ? `${d.slice(0, 4)}/${Number(d.slice(5, 7))}` : `${d.slice(0, 4)}/${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
};
const shortDate = (r) => {
  const d = String(r.date || '');
  return r.monthOnly ? `${Number(d.slice(5, 7))} 月` : `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
};
const daysFrom = (d, today) => Math.round((parse(d) - parse(today)) / 86400000); // 正數＝未來
const ago = (days) => (days === 0 ? '今天' : days > 0 ? `${days} 天後` : `${-days} 天前`);
// 幾歲幾個月
const span = (from, to) => {
  if (!from) return '';
  const a = parse(from); const b = parse(to);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months--;
  if (months < 0) return '';
  const y = Math.floor(months / 12); const m = months % 12;
  return y ? `${y} 歲${m ? ` ${m} 個月` : ''}` : `${m} 個月`;
};
const spanPlain = (from, to) => span(from, to).replace('歲', '年');

// 一筆紀錄的標題與小標籤
const describe = (r, no) => {
  switch (kindOf(r)) {
    case 'vet': return { title: r.title || (r.meds ? '拿藥' : '看診'), tag: r.meds ? '拿藥' : no ? `第 ${no} 次` : null };
    case 'bath': return { title: '洗澡', tag: no ? `第 ${no} 次` : null };
    case 'deworm': return { title: r.title || '體外驅蟲', tag: no ? `第 ${no} 次` : null };
    case 'weight': return { title: `${n(r.weight)} kg`, tag: r.withCarrier ? '含籠' : null };
    case 'vaccine': return { title: r.title || '疫苗', tag: no ? `第 ${no} 劑` : null };
    default: return { title: r.title || '紀錄', tag: null };
  }
};

const RecordRow = ({ r, no, upcoming, onOpen }) => {
  const k = KINDS[kindOf(r)];
  const { title, tag } = describe(r, no);
  const meta = [dateText(r), r.place, r.costNote].filter(Boolean).join('・');
  return (
    <button type="button" onClick={onOpen} className="row !items-start">
      <IconDot icon={r.kind === 'vet' && r.meds ? Pill : k.icon} tone={k.tone} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] leading-snug font-semibold text-slate-800 truncate">{title}</span>
          {tag && <span className={`tag tag-${k.tone} shrink-0`}>{tag}</span>}
          {upcoming && <span className="tag tag-amber shrink-0">預定</span>}
        </div>
        <div className="text-xs text-slate-500 truncate mt-0.5">{meta}</div>
        {r.note && <div className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2 whitespace-pre-line">{r.note}</div>}
      </div>
      {n(r.amount) > 0 && <span className="font-num text-[15px] font-bold tabular-nums text-slate-800 shrink-0 pt-px">{fmt(r.amount)}</span>}
    </button>
  );
};

// 新增／編輯一筆紀錄
const RecordSheet = ({ initial, records, onSave, onDelete, onClose }) => {
  const [f, setF] = useState(initial);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const kind = f.kind;
  // records 已經是由新到舊
  const same = useMemo(() => records.filter((r) => r.kind === kind && r.id !== f.id), [records, kind, f.id]);
  const places = [...new Set(same.map((r) => (r.place || '').trim()).filter(Boolean))].slice(0, 4);
  const last = same.find((r) => n(r.amount) > 0);
  const ok = !!f.date && (kind !== 'weight' || n(f.weight) > 0) && (kind !== 'other' || (f.title || '').trim());
  const submit = () => {
    const data = { kind, date: f.date, monthOnly: !!f.monthOnly, note: (f.note || '').trim() };
    if (kind === 'weight') {
      data.weight = n(f.weight);
      data.withCarrier = !!f.withCarrier;
    } else {
      data.title = (f.title || '').trim();
      data.place = (f.place || '').trim();
      data.amount = f.amount === '' || f.amount === null || f.amount === undefined ? null : n(f.amount);
      data.costNote = (f.costNote || '').trim();
      if (kind === 'vet') data.meds = !!f.meds;
    }
    onSave(data, f.id);
  };
  const titleLabel = { vet: '症狀／診斷', deworm: '藥品', vaccine: '疫苗名稱（可不填）', other: '名稱' }[kind];
  const titleHint = { vet: '例如：感冒、下巴粉刺', deworm: '例如：體外驅蟲（寵愛）', vaccine: '例如：三合一', other: '例如：結紮、剪指甲' }[kind];
  return (
    <Sheet title={f.id ? `編輯${KINDS[kind].label}紀錄` : '記一筆'} onClose={onClose} submitDisabled={!ok} onSubmit={submit} onDelete={f.id ? () => onDelete(f.id) : undefined}>
      {!f.id && <Chips options={KIND_ORDER.map((k) => [k, KINDS[k].label])} value={kind} onChange={(k) => set({ kind: k })} />}
      <Field label="日期（可以填未來的日期當作預定）"><DatePick value={f.date} onChange={(date) => set({ date, monthOnly: false })} /></Field>

      {kind === 'weight' ? (
        <div className="grid grid-cols-2 gap-3 items-end">
          <SmallInput label="體重" inputMode="decimal" value={f.weight ?? ''} onChange={(e) => set({ weight: e.target.value.replace(/[^\d.]/g, '') })} placeholder="4.0" suffix="kg" autoFocus={!f.id} />
          <Seg size="lg" options={[[false, '淨重'], [true, '含籠']]} value={!!f.withCarrier} onChange={(withCarrier) => set({ withCarrier })} />
        </div>
      ) : (
        <>
          {kind === 'vet' && <Seg size="lg" options={[[false, '看診'], [true, '只拿藥']]} value={!!f.meds} onChange={(meds) => set({ meds })} />}
          {titleLabel && <Field label={titleLabel}><TextInput value={f.title} onChange={(title) => set({ title })} placeholder={titleHint} /></Field>}
          <Field label={kind === 'vet' ? '醫院' : '地點'}>
            <TextInput value={f.place} onChange={(place) => set({ place })} placeholder={kind === 'vet' ? '例如：動物醫院的名字' : '例如：寵物美容的店名'} />
            {places.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {places.map((p) => <button key={p} type="button" onClick={() => set({ place: p })} aria-pressed={f.place === p} className="chip chip-sm">{p}</button>)}
              </div>
            )}
          </Field>
          <Field label="費用（可不填）">
            <MoneyInput value={f.amount ?? ''} onChange={(amount) => set({ amount })} />
            {!f.id && last && (
              <div className="flex justify-end mt-2.5">
                <button type="button" onClick={() => set({ amount: n(last.amount), costNote: last.costNote || '', place: f.place || last.place || '' })} className="chip chip-sm on-emerald tabular-nums">同上次 {fmt(last.amount)}</button>
              </div>
            )}
          </Field>
          <Field label="費用明細（可不填）"><TextInput value={f.costNote} onChange={(costNote) => set({ costNote })} placeholder="例如：1400 樂活＋100 刷牙" /></Field>
        </>
      )}
      <Field label="備註">
        <textarea value={f.note || ''} onChange={(e) => set({ note: e.target.value })} rows={4} placeholder="當天的狀況、醫生說了什麼…" className="field resize-none leading-relaxed" />
      </Field>
    </Sheet>
  );
};

// 基本資料
const ProfileSheet = ({ initial, onSave, onClose }) => {
  const [f, setF] = useState({ name: '阿奇', breed: '', chip: '', date: '', homeDate: '', ...initial });
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Sheet title="基本資料" onClose={onClose} submitDisabled={!(f.name || '').trim()}
      onSubmit={() => onSave({ kind: 'profile', name: f.name.trim(), breed: (f.breed || '').trim(), chip: (f.chip || '').trim(), date: f.date || getTodayString(), homeDate: f.homeDate || '' })}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="名字"><TextInput value={f.name} onChange={set('name')} /></Field>
        <Field label="品種"><TextInput value={f.breed} onChange={set('breed')} placeholder="例如：英短 金漸層" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="生日"><DateInput value={f.date} onChange={set('date')} /></Field>
        <Field label="到家的日子"><DateInput value={f.homeDate} onChange={set('homeDate')} /></Field>
      </div>
      <Field label="晶片號碼"><TextInput value={f.chip} onChange={set('chip')} inputMode="numeric" className="font-num tabular-nums tracking-wide" /></Field>
    </Sheet>
  );
};

const Stat = ({ label, value, sub }) => (
  <div className="min-w-0">
    <div className="text-[11px] font-semibold text-slate-500 truncate">{label}</div>
    <div className="font-num text-[19px] leading-tight font-bold tabular-nums text-slate-800 mt-1 truncate">{value}</div>
    {sub && <div className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</div>}
  </div>
);

const PetView = ({ records, loading = false, onSave, onRemove }) => {
  const [filter, setFilter] = useState('all');
  const [sheet, setSheet] = useState(null); // { kind: 'record', initial } | { kind: 'profile' }
  const [today] = useState(() => getTodayString()); // 進到這一頁當下的日期

  const profile = useMemo(() => records.find((r) => r.kind === 'profile') || null, [records]);
  const list = useMemo(() => records.filter((r) => r.kind !== 'profile' && r.date).sort((a, b) => asc(b, a)), [records]);
  // 還沒發生的（預定）：只記到月份的，那個月結束前都算
  const isUpcoming = (r) => (r.monthOnly ? r.date.slice(0, 7) >= today.slice(0, 7) : r.date > today);
  const listAsc = useMemo(() => [...list].reverse(), [list]); // 由舊到新
  const past = list.filter((r) => !isUpcoming(r));
  const upcoming = listAsc.filter(isUpcoming);

  // 第幾次（看診不含只拿藥的）
  const ordinals = useMemo(() => {
    const map = new Map();
    for (const kind of NUMBERED) {
      listAsc.filter((r) => r.kind === kind && !(kind === 'vet' && r.meds)).forEach((r, i) => map.set(r.id, i + 1));
    }
    return map;
  }, [listAsc]);

  const lastOf = (kind) => past.find((r) => r.kind === kind && !(kind === 'vet' && r.meds));
  const weights = listAsc.filter((r) => !isUpcoming(r) && r.kind === 'weight' && !r.withCarrier && n(r.weight) > 0);
  const latestW = weights[weights.length - 1];
  const prevW = weights[weights.length - 2];
  const heaviest = weights.reduce((m, r) => (!m || n(r.weight) > n(m.weight) ? r : m), null);
  const trend = weights.map((r) => ({ x: `${r.date.slice(2, 4)}/${Number(r.date.slice(5, 7))}`, y: n(r.weight) }));
  const lastBath = lastOf('bath');
  const lastDeworm = lastOf('deworm');
  const lastVet = lastOf('vet');

  // 花費（只算已經發生的）
  const cost = useMemo(() => {
    const by = { vet: 0, bath: 0, deworm: 0, misc: 0 };
    let year = 0;
    for (const r of list) {
      if (r.monthOnly ? r.date.slice(0, 7) >= today.slice(0, 7) : r.date > today) continue;
      by[costGroup(r)] += n(r.amount);
      if (r.date.startsWith(today.slice(0, 4))) year += n(r.amount);
    }
    return { by, year, total: by.vet + by.bath + by.deworm + by.misc };
  }, [list, today]);

  const shown = list.filter((r) => filter === 'all' || (filter === 'misc' ? ['vaccine', 'other'].includes(kindOf(r)) : r.kind === filter));
  const byYear = (() => {
    const map = new Map();
    for (const r of shown) { const y = r.date.slice(0, 4); if (!map.has(y)) map.set(y, []); map.get(y).push(r); }
    return [...map.entries()];
  })();

  const openNew = (kind) => setSheet({ kind: 'record', initial: { id: null, kind, date: today, title: kind === 'deworm' ? (lastDeworm?.title || '') : '', place: '', amount: '', costNote: '', note: '', weight: '', withCarrier: false, meds: false } });
  const openEdit = (r) => setSheet({ kind: 'record', initial: { ...r, kind: kindOf(r), amount: r.amount ?? '', weight: r.weight ?? '' } });
  const save = (data, id) => { onSave(COL, data, id, id ? '已更新' : '已記下'); setSheet(null); };
  const remove = (id) => { setSheet(null); onRemove(COL, id, '確定刪除這筆紀錄？'); };

  if (loading) return <ViewLoader label="載入阿奇的紀錄..." />;

  const name = profile?.name || '阿奇';
  const age = profile?.date ? span(profile.date, today) : '';
  const delta = latestW && prevW ? n(latestW.weight) - n(prevW.weight) : 0;
  const facts = [
    profile?.date && ['生日', dateText({ date: profile.date })],
    profile?.homeDate && ['到家', `${dateText({ date: profile.homeDate })}・${spanPlain(profile.homeDate, today)}`],
    profile?.chip && ['晶片', profile.chip],
  ].filter(Boolean);

  return (
    <div className="space-y-6 stagger">
      {/* ── 阿奇 */}
      <section className="glass-card tint-amber p-5">
        <div className="flex items-center gap-3.5">
          <span className="orb-icon orb-amber w-[60px] h-[60px]"><Cat className="w-8 h-8" strokeWidth={1.7} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[28px] leading-tight font-extrabold tracking-tight text-slate-900 truncate">{name}</div>
            <div className="text-[13px] text-slate-500 mt-0.5 truncate">{[profile?.breed, age].filter(Boolean).join('・') || '點右邊的筆填基本資料'}</div>
          </div>
          <HeroButton icon={Plus} label="記一筆" onClick={() => openNew(filter !== 'all' && filter !== 'misc' ? filter : 'bath')} />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5">
          <Stat label="體重" value={latestW ? `${n(latestW.weight)} kg` : '—'}
            sub={latestW ? <>{shortDate(latestW)}{delta ? <span className="font-num font-semibold text-slate-500">・{delta > 0 ? '+' : '−'}{Math.abs(delta).toFixed(2).replace(/0$/, '')}</span> : null}</> : '還沒有紀錄'} />
          <Stat label="上次洗澡" value={lastBath ? ago(daysFrom(lastBath.date, today)) : '—'} sub={lastBath ? shortDate(lastBath) : '還沒有紀錄'} />
          <Stat label="上次驅蟲" value={lastDeworm ? ago(daysFrom(lastDeworm.date, today)) : '—'} sub={lastDeworm ? shortDate(lastDeworm) : '還沒有紀錄'} />
        </div>

        {upcoming.length > 0 && (
          <div className="mt-4 pt-3.5 flex items-start gap-2" style={{ boxShadow: 'inset 0 0.5px 0 0 var(--hair)' }}>
            <CalendarClock className="w-4 h-4 text-amber-700 shrink-0 mt-1" strokeWidth={2.2} />
            <div className="flex flex-wrap gap-1.5">
              {upcoming.map((r) => (
                <button key={r.id} type="button" onClick={() => openEdit(r)} className="chip chip-sm on-amber">
                  {shortDate(r)} {KINDS[kindOf(r)].label}{!r.monthOnly && <span className="font-medium opacity-70">{ago(daysFrom(r.date, today))}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={() => setSheet({ kind: 'profile' })} className="press w-full mt-4 pt-3.5 flex items-center gap-3 text-left" style={{ boxShadow: 'inset 0 0.5px 0 0 var(--hair)' }}>
          <div className="flex-1 min-w-0 space-y-1">
            {facts.length === 0 && <div className="text-xs text-slate-500">還沒有基本資料（生日、到家的日子、晶片號碼）</div>}
            {facts.map(([l, v]) => (
              <div key={l} className="flex gap-2 text-xs"><span className="w-8 shrink-0 font-semibold text-slate-400">{l}</span><span className="font-num font-semibold text-slate-600 tabular-nums truncate">{v}</span></div>
            ))}
          </div>
          <Pencil className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={2.2} />
        </button>
      </section>

      {/* ── 體重 */}
      <Section title="體重" extra={<AddButton label="記體重" onClick={() => openNew('weight')} />}>
        <div className="glass-card px-4 pt-4 pb-3">
          <LineChart points={trend} color="#B08A3E" color2="#DCC489" formatY={(v) => `${v} kg`} />
          {heaviest && (
            <div className="mt-2 pt-3 flex justify-between text-[13px] text-slate-500" style={{ boxShadow: 'inset 0 0.5px 0 0 var(--hair)' }}>
              <span>共 <span className="font-num font-bold text-slate-700">{weights.length}</span> 次紀錄</span>
              <span>最重 <span className="font-num font-bold text-slate-700">{n(heaviest.weight)} kg</span>（{dateText({ date: heaviest.date, monthOnly: true })}）</span>
            </div>
          )}
        </div>
      </Section>

      {/* ── 花費 */}
      {cost.total > 0 && (
        <Section title="照顧花費" extra={<span className="text-[13px] text-slate-500">今年 <span className="font-num font-bold text-slate-700">{fmt(cost.year)}</span></span>}>
          <div className="glass-card p-5">
            <div className="eyebrow">到家以來（這裡有記費用的）</div>
            <div className="mt-1.5"><Money value={cost.total} animate id="pet-cost" className="text-[34px] leading-tight money-ink" /></div>
            <StackTube className="mt-3.5" height={12} parts={COST_KINDS.map(([k]) => ({ key: k, value: cost.by[k], tone: k === 'misc' ? 'slate' : KINDS[k].tone }))} />
            <div className="grid grid-cols-3 gap-2 mt-4">
              {COST_KINDS.filter(([k]) => k !== 'misc' || cost.by.misc > 0).slice(0, 3).map(([k, label]) => (
                <div key={k} className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><Dot tone={k === 'misc' ? 'slate' : KINDS[k].tone} className="!w-2 !h-2" />{label}</div>
                  <div className="font-num text-[17px] font-bold tabular-nums text-slate-800 mt-0.5 truncate">{fmt(cost.by[k])}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-3">只是這一頁紀錄的加總，不會算進記帳的支出。</p>
          </div>
        </Section>
      )}

      {/* ── 紀錄 */}
      <Section title="紀錄" extra={<span className="text-[13px] font-semibold text-slate-400">{shown.length} 筆</span>}>
        <Segmented scroll options={FILTERS} value={filter} onChange={setFilter} className="mb-4" />
        {byYear.length === 0 ? <Empty>還沒有紀錄，按上面的「記一筆」開始</Empty> : (
          <div className="space-y-4">
            {byYear.map(([y, rows]) => {
              const sum = rows.reduce((s, r) => s + n(r.amount), 0);
              return (
                <div key={y}>
                  <div className="flex justify-between px-2 mb-1.5 text-[13px] font-bold text-slate-500">
                    <span>{y} 年・{rows.length} 筆</span>
                    {sum > 0 && <span className="font-num tabular-nums">{fmt(sum)}</span>}
                  </div>
                  <div className="glass-card r-tile list">
                    {rows.map((r) => <RecordRow key={r.id} r={r} no={ordinals.get(r.id)} upcoming={isUpcoming(r)} onOpen={() => openEdit(r)} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {lastVet && filter === 'vet' && <p className="text-xs text-slate-400 px-2 mt-3">上次看診是 {ago(daysFrom(lastVet.date, today))}（{dateText(lastVet)}）。</p>}
      </Section>

      {sheet?.kind === 'record' && (
        <RecordSheet key={sheet.initial.id || `new-${sheet.initial.kind}`} initial={sheet.initial} records={list} onSave={save} onDelete={remove} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'profile' && (
        <ProfileSheet initial={profile || {}} onClose={() => setSheet(null)}
          onSave={(data) => { onSave(COL, data, 'profile', '已更新基本資料'); setSheet(null); }} />
      )}
    </div>
  );
};

export { PetView };
