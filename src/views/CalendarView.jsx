import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, CheckCircle2 } from 'lucide-react';
import { GLASS_CARD } from '../lib/constants';
import { getTodayString, toLocalISOString } from '../lib/utils';


const MealToggleButton = ({ status, onToggle, icon: Icon, label }) => {
  const getStyle = () => {
    if (status === true) return 'bg-[#F1FAEE] border-[#D8F3DC] text-[#2D6A4F]';
    if (status === false) return 'bg-[#FDECEA] border-[#FADBD8] text-[#C0392B]';
    return 'bg-slate-50 border-slate-200 text-slate-400';
  };
  const getIcon = () => {
    if (status === true) return <CheckCircle2 className="w-3.5 h-3.5" />;
    if (status === false) return <X className="w-3.5 h-3.5" />;
    return <Icon className="w-3.5 h-3.5" />;
  };
  const getText = () => {
    if (status === true) return '有吃';
    if (status === false) return '沒吃';
    return '未標記';
  };
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${getStyle()}`}
    >
      {getIcon()}
      <span>{label}</span>
      <span className="opacity-70">· {getText()}</span>
    </button>
  );
};

const CalendarView = ({ transactions, selectedDate, setSelectedDate, deleteTransaction, onEdit, onAddExpense, onRequestHistory }) => {
  const [viewDate, setViewDate] = useState(selectedDate);
  const [selectedDay, setSelectedDay] = useState(null);
  useEffect(() => setViewDate(selectedDate), [selectedDate]);

  // Reset selectedDay when month changes
  const handleMonthChange = (direction) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(viewDate.getMonth() + direction);
    setViewDate(newDate);
    setSelectedDay(null); // Reset selection when changing months
    // Request historical data for the new year if needed
    if (onRequestHistory) {
      onRequestHistory(newDate.getFullYear());
    }
  };

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const daysInMonth = getDaysInMonth(viewDate);
  const startDay = getFirstDayOfMonth(viewDate);
  const calendarCells = [];
  for (let i = 0; i < startDay; i++) calendarCells.push(<div key={`pad-${i}`} className="h-24 bg-slate-50/20"></div>);
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const dateStr = toLocalISOString(currentDate);
    const dayTrans = transactions.filter(t => t.date === dateStr);
    const dayTotal = dayTrans.reduce((sum, t) => sum + Number(t.amount), 0);
    const isSelected = selectedDay === day;
    const isToday = getTodayString() === dateStr;
    
    // Auto-detect meal status from transactions
    let lunch = null;
    let dinner = null;
    
    // Using string matching for category variations (e.g. 午餐, 晚餐, Lunch, Dinner)
    const lunchTrans = dayTrans.filter(t => t.category?.includes('午') || t.category?.toLowerCase() === 'lunch');
    if (lunchTrans.length > 0) {
      if (lunchTrans.some(t => t.note?.includes('減肥') || t.note?.includes('斷食') || t.note?.includes('沒吃'))) lunch = false; // Intentionally skipped
      else lunch = true; // Has a record (even if $0 treated meal)
    }
    
    const dinnerTrans = dayTrans.filter(t => t.category?.includes('晚') || t.category?.toLowerCase() === 'dinner');
    if (dinnerTrans.length > 0) {
      if (dinnerTrans.some(t => t.note?.includes('減肥') || t.note?.includes('斷食') || t.note?.includes('沒吃'))) dinner = false;
      else dinner = true;
    }
    
    const dayMeal = (lunch !== null || dinner !== null) ? { lunch, dinner } : null;

    calendarCells.push(
      <div key={day} onClick={() => setSelectedDay(day)} className={`h-24 border-t border-r border-slate-100/50 p-1.5 flex flex-col justify-between transition-colors cursor-pointer relative ${isSelected ? 'bg-white/55' : 'bg-white/20'} ${day % 7 === 0 ? 'border-r-0' : ''}`}>
        <div className="flex justify-between items-start">
          <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>{day}</span>
          {dayMeal && (
            <div className="flex gap-0.5">
              {dayMeal.lunch !== null && (
                <span className={`text-[10px] leading-none ${dayMeal.lunch ? 'text-[#E0A23E]' : 'text-[#E57373] line-through'}`}>☀</span>
              )}
              {dayMeal.dinner !== null && (
                <span className={`text-[10px] leading-none ${dayMeal.dinner ? 'text-[#5A7099]' : 'text-[#E57373] line-through'}`}>☽</span>
              )}
            </div>
          )}
        </div>
        {dayTotal > 0 && (<div className="w-full text-right"><span className={`text-[11px] font-bold tabular-nums ${dayTrans.some(t => t.type === 'annual') ? 'text-amber-600' : 'text-slate-700'}`}>${dayTotal.toLocaleString()}</span></div>)}
        {isSelected && <div className="absolute inset-1 border-2 border-[#7FB3D5]/60 rounded-lg pointer-events-none"></div>}
      </div>
    );
  }
  const selectedDateStr = selectedDay ? toLocalISOString(new Date(viewDate.getFullYear(), viewDate.getMonth(), selectedDay)) : null;
  const selectedTrans = selectedDateStr ? transactions.filter(t => t.date === selectedDateStr) : [];
  const monthTotal = transactions.filter(t => { const d = new Date(t.date); return d.getFullYear() === viewDate.getFullYear() && d.getMonth() === viewDate.getMonth(); }).reduce((s, t) => s + Number(t.amount), 0);
  return (
    <div className="pb-24 animate-in fade-in duration-300 relative">
      <div className="flex justify-between items-end mb-4 px-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{viewDate.toLocaleString('zh-TW', { month: 'long', year: 'numeric' })}</h2>
          <div className="text-xs text-slate-400 mt-0.5">本月支出 <span className="font-bold text-slate-600 tabular-nums">${monthTotal.toLocaleString()}</span></div>
        </div>
        <div className="flex gap-2"><button onClick={() => handleMonthChange(-1)} className="p-2 bg-white/60 rounded-xl shadow-sm border border-white/60 text-slate-600 active:scale-95 transition-transform"><ChevronLeft className="w-5 h-5" /></button><button onClick={() => handleMonthChange(1)} className="p-2 bg-white/60 rounded-xl shadow-sm border border-white/60 text-slate-600 active:scale-95 transition-transform"><ChevronRight className="w-5 h-5" /></button></div>
      </div>
      <div className={`${GLASS_CARD} p-0 border border-slate-100`}>
        <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100 rounded-t-3xl overflow-hidden">{['日', '一', '二', '三', '四', '五', '六'].map(d => (<div key={d} className="py-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{d}</div>))}</div>
        <div className="grid grid-cols-7 rounded-b-3xl overflow-hidden">{calendarCells}</div>
      </div>
      {/* Daily Detail Panel with Meal Tracking */}
      {selectedDay && (
        <div className="mt-4 animate-in fade-in duration-200">
          <div className={`${GLASS_CARD} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                  {selectedDay}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-700">{selectedTrans.length} 筆消費</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums text-slate-800">${selectedTrans.reduce((s, t) => s + Number(t.amount), 0).toLocaleString()}</div>
              </div>
            </div>

            {selectedTrans.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">當日無消費紀錄</div>
            ) : (
              <div className="space-y-2">
                {selectedTrans.map(t => (
                  <div
                    key={t.id}
                    onClick={() => onEdit && onEdit(t)}
                    className="flex items-center justify-between p-2 bg-slate-50/50 rounded-xl hover:bg-slate-100/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${t.type === 'annual' ? 'bg-amber-400' : 'bg-slate-400'}`}></span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 align-baseline">
                            <span className="text-sm font-bold text-slate-700 leading-tight">{t.note || t.category}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${t.payer === 'partner' ? 'bg-rose-100 text-rose-500' : 'bg-blue-100 text-blue-600'}`}>
                              {t.payer === 'partner' ? '佳欣' : '士程'}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-slate-400 mt-0.5">{t.group} / {t.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm tabular-nums font-medium text-slate-600">-${Number(t.amount).toLocaleString()}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTransaction(t.id); }}
                        className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => onAddExpense && onAddExpense(selectedDateStr)} className="w-full mt-3 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs hover:border-[#7FB3D5] hover:text-[#5A7099] transition-all flex items-center justify-center gap-1.5 active:scale-95">
              <Plus className="w-3.5 h-3.5" /> 在這天新增支出
            </button>
          </div>
        </div>
      )}

      {/* 移除原本的 FAB，改用全域的 Context-aware FAB */}
    </div>
  );
};

export { MealToggleButton, CalendarView };
