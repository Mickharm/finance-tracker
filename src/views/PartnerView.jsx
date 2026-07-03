import { useState, useMemo } from 'react';
import { Plus, X, ChevronDown, ChevronUp, PiggyBank, Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { CleanSummaryCard, GlassButton, ViewLoader } from '../components/ui';
import { GLASS_CARD } from '../lib/constants';


const PartnerYearGroup = ({ year, transactions, onDelete, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const yearStats = useMemo(() => {
    const savings = transactions.filter(t => t.type === 'saving').reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    return { net: savings - expenses, savings, expenses };
  }, [transactions]);
  return (
    <div className={`${GLASS_CARD} overflow-hidden mb-3`}>
      <div onClick={() => setIsExpanded(!isExpanded)} className="bg-slate-50/50 p-4 flex justify-between items-center cursor-pointer transition-colors hover:bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${isExpanded ? 'bg-white shadow-sm text-slate-600' : 'text-slate-400'}`}>{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
          <span className="font-bold text-slate-700 text-sm">{year}年度</span>
        </div>
        <div className="flex items-center gap-3"><span className={`tabular-nums font-bold text-sm ${yearStats.net >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{yearStats.net > 0 ? '+' : ''}${yearStats.net.toLocaleString()}</span></div>
      </div>
      {isExpanded && (<div className="p-2 space-y-2">{transactions.map(tx => (
        <div key={tx.id} onClick={() => onEdit(tx)} className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all group cursor-pointer">
          <div className="flex gap-3 items-center">
            <div className={`p-2 rounded-xl ${tx.type === 'saving' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{tx.type === 'saving' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}</div>
            <div className="flex flex-col"><span className="font-bold text-slate-700 text-xs">{tx.type === 'saving' ? '存入' : '支出'}</span><span className="text-[10px] text-slate-400 flex items-center gap-1">{tx.date} {tx.note && `• ${tx.note}`}</span></div>
          </div>
          <div className="flex items-center gap-3"><span className={`tabular-nums font-bold text-sm ${tx.type === 'saving' ? 'text-emerald-600' : 'text-rose-500'}`}>{tx.type === 'saving' ? '+' : '-'}${Number(tx.amount).toLocaleString()}</span><button onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }} className="text-slate-300 hover:text-rose-400 p-1"><X className="w-4 h-4" /></button></div>
        </div>
      ))}</div>)}
    </div>
  );
};

const PartnerView = ({ partnerTransactions, onDelete, onAdd, onEdit, loading = false }) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const groupedTransactions = useMemo(() => { const groups = {}; partnerTransactions.forEach(tx => { const year = new Date(tx.date).getFullYear(); if (!groups[year]) groups[year] = []; groups[year].push(tx); }); return Object.entries(groups).sort((a, b) => b[0] - a[0]); }, [partnerTransactions]);
  const totalSavings = partnerTransactions.filter(t => t.type === 'saving').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenses = partnerTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalSavings - totalExpenses;
  if (loading) return <ViewLoader label="載入儲蓄資料..." />;
  return (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <CleanSummaryCard title="佳欣儲蓄總覽" value={balance.toLocaleString()} subValue={`投入 $${totalSavings.toLocaleString()} - 支出 $${totalExpenses.toLocaleString()}`} icon={PiggyBank} trend={balance > 0 ? '正成長' : '負成長'} variant="emerald" />
      <div className="flex flex-col gap-4">
        <div onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="flex justify-between items-center px-1 cursor-pointer select-none hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
          <h3 className="font-bold text-slate-700 flex items-center gap-2"><Wallet className="w-4 h-4" /> 資金變動紀錄 {isHistoryOpen ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}</h3>
          <GlassButton onClick={(e) => { e.stopPropagation(); onAdd({}); }}><Plus className="w-3 h-3" /> 新增紀錄</GlassButton>
        </div>
        {isHistoryOpen && (partnerTransactions.length === 0 ? (<div className={`${GLASS_CARD} flex flex-col items-center justify-center h-48 text-slate-300 border-dashed`}><PiggyBank className="w-12 h-12 mb-2 opacity-20" /><p className="text-sm">尚無儲蓄紀錄</p></div>) : (groupedTransactions.map(([year, txs]) => (<PartnerYearGroup key={year} year={year} transactions={txs} onDelete={onDelete} onEdit={onEdit} />))))}
      </div>
    </div>
  );
};

export { PartnerYearGroup, PartnerView };
