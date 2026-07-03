import { useState, useMemo } from 'react';
import { Plus, X, ChevronDown, ChevronUp, Briefcase, User, Heart, Wallet, Coins } from 'lucide-react';
import { CleanSummaryCard, GlassButton, ViewLoader } from '../components/ui';
import { COLOR_VARIANTS, GLASS_CARD } from '../lib/constants';


const SalaryHistoryCard = ({ history, owner, onAdd, onDelete, onEdit, embedded = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerClass = embedded ? "bg-white/15 rounded-xl p-3 border border-white/25" : `${GLASS_CARD} p-5`;

  return (
    <div className={containerClass}>
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${embedded ? 'bg-white shadow-sm' : 'bg-slate-100'} text-slate-500`}>
            <Briefcase className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-700 text-sm">薪資成長紀錄</span>
        </div>
        <GlassButton onClick={(e) => { e.stopPropagation(); onAdd(owner); }} variant="ghost" className="px-2 py-1 text-xs">+ 調薪</GlassButton>
      </div>
      {isExpanded && (
        <div className="mt-4 space-y-3 pt-3 border-t border-slate-200/50">
          {history.length === 0 ? (
            <p className="text-xs text-slate-300 text-center py-2">尚無調薪紀錄</p>
          ) : (
            history.map((rec, idx) => {
              const prevRec = history[idx + 1];
              let percentChange = null;
              if (prevRec && prevRec.amount > 0) percentChange = ((rec.amount - prevRec.amount) / prevRec.amount) * 100;
              return (
                <div key={rec.id} onClick={() => onEdit && onEdit(rec)} className="flex justify-between items-center text-sm border-b border-slate-100 last:border-0 pb-2 last:pb-0 cursor-pointer hover:bg-slate-100/50 px-1 rounded transition-colors">
                  <div className="flex flex-col">
                    <span className="tabular-nums font-bold text-slate-700">${Number(rec.amount).toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400">{rec.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {percentChange !== null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${percentChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                        {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%
                      </span>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onDelete(rec.id); }} className="text-slate-300 hover:text-rose-400 p-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      {!isExpanded && history.length > 0 && (
        <div className="mt-2 text-xs text-slate-400 pl-11 flex justify-between items-center">
          <span>目前: <span className="tabular-nums text-slate-600 font-bold">${Number(history[0].amount).toLocaleString()}</span></span>
          {history.length > 1 && (() => {
            const grow = ((history[0].amount - history[history.length - 1].amount) / history[history.length - 1].amount) * 100;
            return <span className={`text-[10px] ${grow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>總成長 {grow.toFixed(0)}%</span>
          })()}
        </div>
      )}
    </div>
  );
};


const IncomeTrendChart = ({ incomes, variant }) => {
  const theme = COLOR_VARIANTS[variant] || COLOR_VARIANTS.slate;
  const data = useMemo(() => {
    const months = Array(12).fill(0);
    incomes.forEach(i => {
      const d = new Date(i.date);
      months[d.getMonth()] += Number(i.amount);
    });
    return months;
  }, [incomes]);
  const max = Math.max(...data, 1);

  return (
    <div className="bg-white/15 p-3 rounded-xl border border-white/25 mb-4">
      <h5 className="text-xs font-bold text-slate-500 mb-2">月度收入趨勢</h5>
      <div className="h-16 flex items-end gap-1">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
            <div className={`w-full min-w-[4px] rounded-t-sm transition-all duration-500 ${v > 0 ? theme.bg : 'bg-slate-100/50'}`} style={{ height: `${(v / max) * 100}%`, opacity: v > 0 ? 0.8 : 1 }}></div>
            {v > 0 && <div className="absolute bottom-full mb-1 text-[8px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-white/90 px-1 rounded shadow-sm">${(v / 1000).toFixed(0)}k</div>}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-slate-300 tabular-nums px-0.5">
        <span>1</span><span>6</span><span>12</span>
      </div>
    </div>
  );
};

const PersonCard = ({ name, owner, incomes, total, history, icon: Icon, onAddSalary, onDeleteSalary, onEditSalary, onAddIncome, onDeleteIncome, variant = 'slate' }) => {
  const theme = COLOR_VARIANTS[variant] || COLOR_VARIANTS.slate;
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={`${GLASS_CARD} overflow-hidden p-0 transition-all duration-500`}>
      {/* Header / Summary Section */}
      <div className={`relative p-5 cursor-pointer ${!isExpanded ? 'hover:bg-white/30' : ''}`} onClick={() => setIsExpanded(!isExpanded)}>
        <div className={`absolute top-0 right-0 w-32 h-32 ${theme.bg} rounded-full -mr-10 -mt-10 blur-2xl opacity-40 transition-opacity duration-500 group-hover:opacity-60`}></div>

        <div className="relative z-10 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme.iconBg} ${theme.iconText} shadow-sm`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-700 text-lg">{name}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">年度累計收入</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-800 tracking-tight tabular-nums">${total.toLocaleString()}</div>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-300 ml-auto mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-300 ml-auto mt-1" />}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-5 animate-in slide-in-from-top-2 duration-300">

          {/* Trend Chart */}
          <IncomeTrendChart incomes={incomes} variant={variant} />

          {/* Salary History Section */}
          <div>
            <SalaryHistoryCard history={history} owner={owner} onAdd={onAddSalary} onDelete={onDeleteSalary} onEdit={onEditSalary} embedded={true} />
          </div>

          {/* Details Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <Coins className="w-3 h-3" /> 收入明細
              </h4>
              <GlassButton onClick={() => onAddIncome(owner)} className="px-2 py-1 text-xs" variant="ghost"><Plus className="w-3 h-3" /> 新增</GlassButton>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
              {incomes.map(inc => (
                <div key={inc.id} onClick={() => onAddIncome(owner, inc)} className="group relative flex justify-between items-center p-2.5 rounded-xl border border-slate-100 bg-white/40 hover:bg-white/70 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-1 h-8 rounded-full ${theme.bg} opacity-60`}></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{inc.category}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        {inc.date}
                        {inc.note && <span className="text-slate-500 max-w-[100px] truncate">• {inc.note}</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm tabular-nums font-bold ${theme.text}`}>+${Number(inc.amount).toLocaleString()}</span>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteIncome(inc.id); }} className="text-slate-300 hover:text-rose-400 p-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {incomes.length === 0 && <div className="text-center text-xs text-slate-300 py-4 flex flex-col items-center gap-2">尚無紀錄</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const IncomeView = ({ incomes, salaryHistory, onAddSalary, onDeleteSalary, onDeleteIncome, onAddIncome, onEditSalary, selectedDate, loading = false }) => {
  if (loading) return <ViewLoader label="載入收入資料..." />;
  const currentYear = selectedDate.getFullYear();
  const yearlyIncomes = incomes.filter(i => new Date(i.date).getFullYear() === currentYear);
  const myselfIncomes = yearlyIncomes.filter(i => i.owner === 'myself');
  const partnerIncomes = yearlyIncomes.filter(i => i.owner === 'partner');
  const myselfTotal = myselfIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const partnerTotal = partnerIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const myselfHistory = salaryHistory.filter(s => s.owner === 'myself').sort((a, b) => new Date(b.date) - new Date(a.date));
  const partnerHistory = salaryHistory.filter(s => s.owner === 'partner').sort((a, b) => new Date(b.date) - new Date(a.date));
  const incomeTotal = myselfTotal + partnerTotal;
  const myselfPct = incomeTotal > 0 ? (myselfTotal / incomeTotal) * 100 : 50;
  const partnerPct = incomeTotal > 0 ? (partnerTotal / incomeTotal) * 100 : 50;
  return (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <CleanSummaryCard title="年度總收入" value={incomeTotal.toLocaleString()} subValue={`${currentYear}年度`} icon={Wallet} />
      {incomeTotal > 0 && (
        <div className={`${GLASS_CARD} p-4`}>
          <div className="flex justify-between items-center text-xs font-bold mb-2">
            <span className="text-blue-600">士程 <span className="tabular-nums">${myselfTotal.toLocaleString()}</span></span>
            <span className="text-rose-500"><span className="tabular-nums">${partnerTotal.toLocaleString()}</span> 佳欣</span>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-100">
            <div className="bg-blue-400 h-full transition-all duration-500" style={{ width: `${myselfPct}%` }} />
            <div className="bg-rose-400 h-full transition-all duration-500" style={{ width: `${partnerPct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1 tabular-nums">
            <span>{myselfPct.toFixed(0)}%</span>
            <span>{partnerPct.toFixed(0)}%</span>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-6">
        <PersonCard name="士程" owner="myself" incomes={myselfIncomes} total={myselfTotal} history={myselfHistory} icon={User} onAddSalary={onAddSalary} onDeleteSalary={onDeleteSalary} onDeleteIncome={onDeleteIncome} onAddIncome={onAddIncome} onEditSalary={onEditSalary} variant="blue" />
        <PersonCard name="佳欣" owner="partner" incomes={partnerIncomes} total={partnerTotal} history={partnerHistory} icon={Heart} onAddSalary={onAddSalary} onDeleteSalary={onDeleteSalary} onDeleteIncome={onDeleteIncome} onAddIncome={onAddIncome} onEditSalary={onEditSalary} variant="rose" />
      </div>
    </div>
  );
};

export { SalaryHistoryCard, IncomeTrendChart, PersonCard, IncomeView };
