import { useState } from 'react';
import { Plus, X, ArrowRightLeft } from 'lucide-react';
import { AmountInput, Card, GlassButton, ViewLoader } from '../components/ui';
import { GLASS_CARD } from '../lib/constants';
import { formatDetailedDate, getFixedDepositAmount } from '../lib/utils';


const StockGoalCard = ({ yearData, prevYearTotal, onUpdate, onDelete }) => {
  const [dragStartX, setDragStartX] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);

  const handleDragStart = (x) => { setDragStartX(x); setDragOffset(0); };
  const handleDragMove = (x) => {
    if (dragStartX !== null) {
      const offset = x - dragStartX;
      // Only allow left swipe (negative direction), clamp right swipe to 0
      setDragOffset(Math.min(0, offset));
    }
  };
  const handleDragEnd = () => {
    // Trigger delete only on left swipe exceeding threshold
    if (dragStartX !== null && dragOffset < -80 && onDelete) onDelete(yearData.id);
    setDragStartX(null);
    setDragOffset(0);
  };

  const isDragging = dragStartX !== null && dragOffset < -5;
  const swipeProgress = Math.min(Math.abs(dragOffset) / 80, 1);
  const cardStyle = isDragging ? {
    transform: `translateX(${dragOffset * 0.4}px) scale(${1 - swipeProgress * 0.04})`,
    opacity: 1 - swipeProgress * 0.2,
    transition: 'none'
  } : {
    transform: 'translateX(0) scale(1)',
    opacity: 1,
    transition: 'transform 0.3s ease, opacity 0.3s ease'
  };

  const fixedDeposit = getFixedDepositAmount(yearData.year);
  const targetROI = Number(yearData.roi) || 0;
  const targetAmount = (prevYearTotal + fixedDeposit) * (1 + targetROI / 100);
  const currentFirstrade = Number(yearData.firstrade) || 0;
  const currentIB = Number(yearData.ib) || 0;
  const currentWithdrawal = Number(yearData.withdrawal) || 0;
  const currentTotal = currentFirstrade + currentIB + currentWithdrawal;
  const isAchieved = currentTotal >= targetAmount;
  const diff = currentTotal - targetAmount;
  const errorPercent = targetAmount > 0 ? (diff / targetAmount) * 100 : 0;

  return (
    <div className="relative mb-4">
      {/* Delete indicator background */}
      {isDragging && (
        <div className="absolute inset-0 rounded-3xl flex items-center justify-center" style={{ backgroundColor: `rgba(192, 57, 43, ${swipeProgress * 0.15})` }}>
          <div className="flex items-center gap-2" style={{ opacity: swipeProgress }}>
            <X className="w-5 h-5 text-[#C0392B]" />
            <span className="text-sm font-bold text-[#C0392B]">{swipeProgress >= 1 ? '放開以刪除' : '左滑刪除'}</span>
          </div>
        </div>
      )}
      <div
        className={`${GLASS_CARD} p-5 relative overflow-hidden`}
        style={cardStyle}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => { handleDragMove(e.touches[0].clientX); if (isDragging) e.preventDefault(); }}
        onTouchEnd={() => handleDragEnd()}
        onMouseDown={(e) => { if (e.target.tagName !== 'INPUT') handleDragStart(e.clientX); }}
        onMouseMove={(e) => handleDragMove(e.clientX)}
        onMouseUp={() => handleDragEnd()}
        onMouseLeave={() => { setDragStartX(null); setDragOffset(0); }}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isAchieved ? 'bg-emerald-400' : (yearData.year < new Date().getFullYear() ? 'bg-rose-500' : 'bg-slate-300')}`}></div>
        <div className="flex justify-between items-start mb-4 pl-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {yearData.year}年
              {isAchieved ? (
                <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">達成</span>
              ) : (yearData.year < new Date().getFullYear()) ? (
                <span className="text-xs bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full font-bold">未達成</span>
              ) : (
                <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold">進行中</span>
              )}
              {currentWithdrawal > 0 && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">含提領</span>}
            </h3>
            <div className="text-xs text-slate-400 mt-1">固定存入: <span className="font-bold text-slate-600">${fixedDeposit.toLocaleString()}</span> (美金)</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">年化目標</div>
            <div className="flex items-center justify-end gap-1">
              <input type="number" defaultValue={yearData.roi} onBlur={(e) => onUpdate(yearData.id, 'roi', e.target.value)} className="w-12 text-right font-bold text-slate-800 border-b border-slate-200 focus:border-slate-500 outline-none bg-transparent" />
              <span className="text-sm font-bold text-slate-600">%</span>
            </div>
          </div>
        </div>
      <div className="grid grid-cols-2 gap-4 mb-4 pl-3">
        <div><label className="text-[10px] text-slate-400 uppercase font-bold">Firstrade (美金)</label><AmountInput value={yearData.firstrade} onCommit={(v) => onUpdate(yearData.id, 'firstrade', v)} className="w-full tabular-nums font-bold text-slate-700 border-b border-slate-100 focus:border-emerald-500 outline-none py-1 bg-transparent" placeholder="0" /></div>
        <div><label className="text-[10px] text-slate-400 uppercase font-bold">IB (美金)</label><AmountInput value={yearData.ib} onCommit={(v) => onUpdate(yearData.id, 'ib', v)} className="w-full tabular-nums font-bold text-slate-700 border-b border-slate-100 focus:border-emerald-500 outline-none py-1 bg-transparent" placeholder="0" /></div>
        <div className="col-span-2 relative"><label className="text-[10px] text-amber-400 uppercase font-bold">提領/調節 (美金)</label><AmountInput value={yearData.withdrawal} onCommit={(v) => onUpdate(yearData.id, 'withdrawal', v)} className="w-full tabular-nums font-bold text-slate-700 border-b border-amber-100 focus:border-amber-400 outline-none py-1 bg-transparent" placeholder="0" /></div>
      </div>
      <div className="bg-slate-50/50 rounded-xl p-3 pl-4 flex justify-between items-center">
        <div><div className="text-[10px] text-slate-400 mb-0.5 font-bold uppercase">目標金額</div><div className="font-bold text-slate-500 text-sm tabular-nums">${Math.round(targetAmount).toLocaleString()}</div></div>
        <div className="text-right"><div className="text-[10px] text-slate-400 mb-0.5 font-bold uppercase">實際總資產</div><div className={`font-bold text-lg tabular-nums ${isAchieved ? 'text-emerald-600' : 'text-slate-700'}`}>${Math.round(currentTotal).toLocaleString()}</div><div className={`text-[10px] font-medium ${isAchieved ? 'text-emerald-500' : 'text-slate-400'}`}>誤差: {diff > 0 ? '+' : ''}{Math.round(diff).toLocaleString()} ({errorPercent.toFixed(2)}%)</div></div>
      </div>
    </div>
    </div>
  );
};

const ExchangeItem = ({ item, onDelete, onEdit }) => {
  const isSell = item.type === 'sell';
  const isFT = item.account === 'FT';
  const twdAmount = Math.round(Number(item.usdAmount) * Number(item.rate));
  const accountTheme = isFT
    ? { bg: 'bg-[#D6DEEB]/60', text: 'text-[#485A85]', border: 'border-[#B4C4DE]' }
    : { bg: 'bg-[#F0EAC2]/60', text: 'text-[#8F8335]', border: 'border-[#E0D695]' };

  return (
    <div onClick={() => onEdit && onEdit(item)} className={`${GLASS_CARD} p-4 group border-l-4 ${onEdit ? 'cursor-pointer hover:bg-white/60' : ''} transition-all`} style={{ borderLeftColor: isSell ? '#C48286' : '#4DA391' }}>
      {/* Row 1: Account + Type + Amount + Delete */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded-lg font-bold text-xs ${accountTheme.bg} ${accountTheme.text} border ${accountTheme.border}`}>{isFT ? 'Firstrade' : 'IB'}</div>
          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${isSell ? 'bg-[#E8D3D1]/60 text-[#A65E62]' : 'bg-[#D1E6E1]/60 text-[#2F7567]'}`}>{isSell ? '賣出' : '買入'}</span>
          <span className="text-base font-bold text-slate-800 tabular-nums">${Number(item.usdAmount).toLocaleString()}</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="text-slate-300 hover:text-rose-400 transition-all p-1"><X className="w-4 h-4" /></button>
      </div>
      {/* Row 2: Date + Rate */}
      <div className="text-xs text-slate-400 mt-1">
        {formatDetailedDate(item.date)} • 匯率 {Number(item.rate).toFixed(2)}
      </div>
      {/* Row 3: TWD Amount */}
      <div className={`text-sm tabular-nums font-bold mt-1 ${isSell ? 'text-[#A65E62]' : 'text-[#2F7567]'}`}>
        {isSell ? '+' : '-'} NT$ {twdAmount.toLocaleString()}
      </div>
    </div>
  );
};

const StockGoalView = ({ goals, exchanges, onUpdate, onAddYear, onDeleteYear, onDeleteExchange, onAddExchangeClick, onEditExchange, loading = false }) => {
  const [activeTab, setActiveTab] = useState('goals');
  const sortedGoals = [...goals].sort((a, b) => b.year - a.year);
  const getEffectiveTotal = (g) => (Number(g?.firstrade) || 0) + (Number(g?.ib) || 0) + (Number(g?.withdrawal) || 0);
  const getActualTotal = (g) => (Number(g?.firstrade) || 0) + (Number(g?.ib) || 0);

  if (loading) return <ViewLoader label="載入存股資料..." />;
  return (
    <div className="pb-24 animate-in fade-in">
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
        <button onClick={() => setActiveTab('goals')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'goals' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>目標規劃</button>
        <button onClick={() => setActiveTab('exchange')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'exchange' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>換匯紀錄</button>
      </div>
      {activeTab === 'goals' ? (
        <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
          <div className="flex justify-end mb-2"><GlassButton onClick={onAddYear}><Plus className="w-3 h-3" /> 新增年份</GlassButton></div>
          {sortedGoals.length === 0 ? <div className="text-center text-slate-400 py-10">尚無資料 (從2022開始)</div> : sortedGoals.map((goal, index) => { const prevGoal = sortedGoals[index + 1]; const prevTotal = prevGoal ? getActualTotal(prevGoal) : 0; return <StockGoalCard key={goal.id} yearData={goal} prevYearTotal={prevTotal} onUpdate={onUpdate} onDelete={onDeleteYear} />; })}
        </div>
      ) : (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
          {/* Net Position Card - TOP */}
          <div className={`${GLASS_CARD} p-5 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#B4C4DE] rounded-full -mr-10 -mt-10 blur-xl opacity-40"></div>
            <div className="relative z-10">
              <div className="text-xs text-slate-400 uppercase font-bold mb-1">淨持有美金</div>
              <div className="text-2xl font-bold text-slate-800 tabular-nums">
                ${(() => {
                  const buyTotal = exchanges.filter(e => e.type !== 'sell').reduce((sum, e) => sum + Number(e.usdAmount), 0);
                  const sellTotal = exchanges.filter(e => e.type === 'sell').reduce((sum, e) => sum + Number(e.usdAmount), 0);
                  return (buyTotal - sellTotal).toLocaleString();
                })()}
              </div>
            </div>
          </div>

          {/* Buy/Sell Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`${GLASS_CARD} p-4 border-l-4`} style={{ borderLeftColor: '#4DA391' }}>
              <div className="text-lg font-bold text-[#2F7567] tabular-nums">${(() => {
                const buyRecords = exchanges.filter(e => e.type !== 'sell');
                return buyRecords.reduce((sum, e) => sum + Number(e.usdAmount), 0).toLocaleString();
              })()}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">累計買入 @ {(() => {
                const buyRecords = exchanges.filter(e => e.type !== 'sell');
                const totalUSD = buyRecords.reduce((sum, e) => sum + Number(e.usdAmount), 0);
                const totalTWD = buyRecords.reduce((sum, e) => sum + Number(e.usdAmount) * Number(e.rate), 0);
                return totalUSD > 0 ? (totalTWD / totalUSD).toFixed(2) : '0';
              })()}</div>
            </div>
            <div className={`${GLASS_CARD} p-4 border-l-4`} style={{ borderLeftColor: '#C48286' }}>
              <div className="text-lg font-bold text-[#A65E62] tabular-nums">${(() => {
                const sellRecords = exchanges.filter(e => e.type === 'sell');
                return sellRecords.reduce((sum, e) => sum + Number(e.usdAmount), 0).toLocaleString();
              })()}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">累計賣出 @ {(() => {
                const sellRecords = exchanges.filter(e => e.type === 'sell');
                const totalUSD = sellRecords.reduce((sum, e) => sum + Number(e.usdAmount), 0);
                const totalTWD = sellRecords.reduce((sum, e) => sum + Number(e.usdAmount) * Number(e.rate), 0);
                return totalUSD > 0 ? (totalTWD / totalUSD).toFixed(2) : '0';
              })()}</div>
            </div>
          </div>

          <div className="flex justify-between items-center px-1 mb-2">
            <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> 交易明細</h3>
            <GlassButton onClick={onAddExchangeClick}><Plus className="w-3 h-3" /> 新增換匯</GlassButton>
          </div>
          <div className="space-y-2">
            {exchanges.length === 0 ? <div className="text-center text-slate-400 py-10">尚無換匯紀錄</div> : exchanges.map(item => (<ExchangeItem key={item.id} item={item} onDelete={onDeleteExchange} onEdit={onEditExchange} />))}
          </div>
        </div>
      )}
    </div>
  );
};

export { StockGoalCard, ExchangeItem, StockGoalView };
