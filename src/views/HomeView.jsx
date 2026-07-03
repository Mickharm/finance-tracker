import { Calendar, PieChart, Target } from 'lucide-react';
import { BudgetProgressBar, GroupCard } from '../components/ui';
import { GLASS_CARD } from '../lib/constants';





const HomeView = ({ monthlyStats, annualStats, yearlyTotalStats }) => {
  const totalAnnualBudget = yearlyTotalStats ? yearlyTotalStats.totalBudget : (monthlyStats.totalBudget * 12 + annualStats.totalBudget);
  const totalAnnualUsed = yearlyTotalStats ? yearlyTotalStats.totalUsed : (monthlyStats.totalUsed + annualStats.totalUsed);
  const totalRemaining = totalAnnualBudget - totalAnnualUsed;
  const isOverBudget = totalRemaining < 0;
  const currentMonth = new Date().getMonth() + 1;
  const monthlyAvgSpending = currentMonth > 0 ? Math.round(totalAnnualUsed / currentMonth) : 0;
  const usedPct = totalAnnualBudget > 0 ? (totalAnnualUsed / totalAnnualBudget) * 100 : 0;

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      <div className={`${GLASS_CARD} p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-xl ${isOverBudget ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
            <PieChart className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">年度總預算</h2>
            <div className="text-xl sm:text-2xl font-bold text-slate-800 tabular-nums break-all line-clamp-1">${totalAnnualBudget.toLocaleString()}</div>
          </div>
        </div>
        <div className="mb-4">
          <div className="w-full bg-slate-100/70 rounded-full h-2 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${isOverBudget ? 'bg-[#E57373]' : usedPct > 85 ? 'bg-[#E8BE6E]' : 'bg-[#52B788]'}`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] font-medium text-slate-400">
            <span className={isOverBudget ? 'text-[#C0392B] font-bold' : ''}>已用 {Math.round(usedPct)}%</span>
            <span>全年進度</span>
          </div>
        </div>
        <div className="flex flex-row gap-4 w-full">
          <div className="flex-1 overflow-hidden">
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">今年總花費</div>
            <div className="text-base sm:text-lg font-bold text-slate-700 tabular-nums truncate">${totalAnnualUsed.toLocaleString()}</div>
          </div>
          <div className="flex-1 overflow-hidden text-right">
            <div className={`text-[10px] font-bold uppercase mb-1 ${isOverBudget ? 'text-[#E57373]' : 'text-[#52B788]'}`}>{isOverBudget ? '超支' : '剩餘'}</div>
            <div className={`text-base sm:text-lg font-bold tabular-nums truncate ${isOverBudget ? 'text-[#C0392B]' : 'text-[#2D6A4F]'}`}>{isOverBudget ? '-' : ''}${Math.abs(totalRemaining).toLocaleString()}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-200/40 flex justify-between items-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase">月均支出 ({currentMonth}月)</span>
          <span className="text-sm font-bold text-slate-700 tabular-nums">${monthlyAvgSpending.toLocaleString()}</span>
        </div>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="w-8 h-8 rounded-full bg-[#F1FAEE] flex items-center justify-center text-[#2D6A4F]"><Calendar className="w-4 h-4" /></div>
          <div><h2 className="text-lg font-bold text-slate-800 leading-tight">月度預算</h2><p className="text-xs text-slate-400 font-bold tracking-wide uppercase">經常性支出</p></div>
        </div>
        <div className={`${GLASS_CARD} p-5 mb-4 relative overflow-hidden`}>
          <BudgetProgressBar current={monthlyStats.totalUsed} total={monthlyStats.totalBudget} label="本月總剩餘" colorTheme="emerald" />
        </div>
        <div className="space-y-3">{monthlyStats.groups.map(g => (<GroupCard key={g.name} group={g} colorTheme="emerald" />))}</div>
      </section>
      <section>
        <div className="flex items-center gap-2 mb-4 px-1 mt-10">
          <div className="w-8 h-8 rounded-full bg-[#EAEEF6] flex items-center justify-center text-[#4E5D82]"><Target className="w-4 h-4" /></div>
          <div><h2 className="text-lg font-bold text-slate-800 leading-tight">年度預算</h2><p className="text-xs text-slate-400 font-bold tracking-wide uppercase">年度支出</p></div>
        </div>

        {/* Annual Summary - Same design as monthly */}
        <div className={`${GLASS_CARD} p-5 mb-4 relative overflow-hidden`}>
          <BudgetProgressBar
            key={annualStats.totalBudget}
            current={annualStats.totalUsed}
            total={annualStats.totalBudget}
            label="本年總已用"
            colorTheme="indigo"
          />
        </div>
        <div className="space-y-3">{annualStats.groups.map(g => (<GroupCard key={g.name} group={g} colorTheme="indigo" />))}</div>
      </section>
    </div>
  );
};

export { HomeView };
