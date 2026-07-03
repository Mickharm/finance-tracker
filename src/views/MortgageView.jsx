import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Building2, Clock, Calculator, Coins, Receipt, CheckCircle2 } from 'lucide-react';
import { StandardList, ViewLoader } from '../components/ui';
import { COLOR_VARIANTS, GLASS_CARD } from '../lib/constants';
import { FINNHUB_API_KEY, formatDetailedDate, getCachedPrices, setCachedPrices } from '../lib/utils';


const MortgagePlanView = ({ startDate = "2025-02-01" }) => {
  const schedule = useMemo(() => {
    let rows = [];
    let currentDate = new Date(startDate);
    currentDate.setDate(1);
    const periods = [{ count: 18, pay: 10177, rate: 1.77 }, { count: 42, pay: 12757, rate: 2.225 }, { count: 420, pay: 23593, rate: 2.225 }];
    let totalPay = 0;
    let periodCounter = 1;
    const today = new Date();
    for (let p of periods) {
      for (let i = 0; i < p.count; i++) {
        totalPay += p.pay;
        const isPaid = (currentDate.getFullYear() < today.getFullYear()) || (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() < today.getMonth());
        rows.push({ id: periodCounter, date: new Date(currentDate), amount: p.pay, cumulative: totalPay, rate: p.rate, isPaid: isPaid });
        currentDate.setMonth(currentDate.getMonth() + 1);
        periodCounter++;
      }
    }
    return rows;
  }, [startDate]);

  const yearlyGroups = useMemo(() => {
    const groups = {};
    schedule.forEach(row => { const year = row.date.getFullYear(); if (!groups[year]) groups[year] = []; groups[year].push(row); });
    return groups;
  }, [schedule]);



  const [expandedYear, setExpandedYear] = useState(null);
  const currentStatus = schedule.find(r => !r.isPaid) || schedule[schedule.length - 1];
  const theme = COLOR_VARIANTS.cyan;

  return (
    <div className={`${GLASS_CARD} p-5 mb-6 ${theme.glow}`}>
      <div onClick={() => setExpandedYear(expandedYear ? null : 'overview')} className="flex justify-between items-center mb-4 cursor-pointer">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-100 text-cyan-600">
            <Clock className="w-4 h-4" />
          </div>
          房貸還款計劃 (40年)
        </h3>
        {expandedYear ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {expandedYear && (
        <div className="grid grid-cols-2 gap-3 mb-4 animate-in slide-in-from-top-2 duration-200">
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-400 mb-1">下期 ({currentStatus?.id}期)</div>
            <div className="text-lg font-bold text-slate-800 tabular-nums">${currentStatus?.amount.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400">利率 {currentStatus?.rate}%</div>
          </div>
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-400 mb-1">累計已還款</div>
            <div className="text-lg font-bold text-slate-800 tabular-nums">${schedule.filter(r => r.isPaid).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      {!expandedYear && (
        <div className="flex justify-between items-center px-2 pb-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-bold">下期金額</span>
            <span className="tabular-nums font-bold text-slate-600 text-sm">${currentStatus?.amount.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 uppercase font-bold">累計已還</span>
            <span className="tabular-nums font-bold text-slate-600 text-sm">${schedule.filter(r => r.isPaid).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      {expandedYear && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-hide animate-in slide-in-from-top-4 duration-300">
          {Object.entries(yearlyGroups).map(([year, rows]) => (
            <div key={year} className="border border-slate-100 rounded-xl overflow-hidden">
              <div onClick={(e) => { e.stopPropagation(); setExpandedYear(Number(year) === expandedYear ? 'overview' : Number(year)); }} className="bg-white/80 p-3 flex justify-between items-center text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50">
                <span>{year}年度 ({rows.length}期)</span>
                {Number(year) === expandedYear ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>
              {Number(year) === expandedYear && (
                <div className="bg-white/50 backdrop-blur-sm">
                  <div className="grid grid-cols-5 text-[10px] text-slate-400 px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                    <span>狀態</span><span>日期</span><span className="text-center">期數</span><span className="text-right">金額</span><span className="text-right">利率</span>
                  </div>
                  {rows.map(row => (
                    <div key={row.id} className={`grid grid-cols-5 text-xs px-3 py-2 border-b border-slate-100 last:border-0 items-center ${row.isPaid ? 'bg-[#F1FAEE]/40' : 'hover:bg-slate-50/30'}`}>
                      <span>{row.isPaid ? <CheckCircle2 className="w-3 h-3 text-[#52B788]" /> : <span className="w-3 h-3 rounded-full border border-slate-200 block"></span>}</span>
                      <span className={`tabular-nums ${row.isPaid ? 'text-[#2D6A4F] font-bold' : 'text-slate-500'}`}>{row.date.getMonth() + 1}月</span>
                      <span className="text-center text-slate-400">#{row.id}</span>
                      <span className={`text-right font-bold tabular-nums ${row.isPaid ? 'text-[#2D6A4F]' : 'text-slate-700'}`}>${row.amount.toLocaleString()}</span>
                      <span className="text-right text-slate-400">{row.rate}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MortgageView = ({ mortgageExpenses, mortgageAnalysis, mortgageFunding, deleteMortgageExp, deleteMortgageAnalysis, deleteMortgageFunding, setMortgageExpType, setIsAddMortgageExpModalOpen, setIsAddMortgageAnalysisModalOpen, setIsAddMortgageFundingModalOpen, onEditExp, onEditAnalysis, onEditFunding, loading = false }) => {
  const downPaymentExp = mortgageExpenses.filter(e => e.type === 'down_payment');
  const applianceExp = mortgageExpenses.filter(e => e.type === 'misc_appliances');
  const totalDownPaymentExp = downPaymentExp.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalApplianceExp = applianceExp.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalAnalysis = mortgageAnalysis.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalFunding = mortgageFunding.reduce((sum, item) => {
    const amt = Number(item.amount);
    const shares = item.shares && Number(item.shares) > 0 ? Number(item.shares) : 1;
    const rate = item.rate && Number(item.rate) > 0 ? Number(item.rate) : 1;
    return sum + (amt * shares * rate);
  }, 0);

  const [prices, setPrices] = useState({});

  useEffect(() => {
    const fetchFundingPrices = async () => {
      const symbols = mortgageFunding
        .filter(item => item.symbol && item.symbol.trim() !== '')
        .map(item => item.symbol.trim().toUpperCase());

      if (symbols.length === 0) return;

      const cached = getCachedPrices();
      const newPrices = {};
      const symbolsToFetch = [];
      for (const symbol of symbols) {
        if (cached[symbol]) { newPrices[symbol] = cached[symbol].price || cached[symbol]; }
        else { symbolsToFetch.push(symbol); }
      }
      for (const symbol of symbolsToFetch) {
        try {
          const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
          if (res.ok) {
            const data = await res.json();
            if (data.c) newPrices[symbol] = data.c;
          }
        } catch (e) { console.warn(e); }
        await new Promise(r => setTimeout(r, 50));
      }
      if (symbolsToFetch.length > 0) {
        const cacheUpdate = {};
        symbolsToFetch.forEach(s => { if (newPrices[s]) cacheUpdate[s] = { price: newPrices[s], change: 0 }; });
        setCachedPrices(cacheUpdate);
      }
      setPrices(newPrices);
    };
    fetchFundingPrices();
  }, [mortgageFunding]);

  if (loading) return <ViewLoader label="載入房產資料..." />;
  return (
    <div className="pb-24 space-y-6 animate-in fade-in duration-500">
      <StandardList
        title="頭期雜支與進程"
        items={downPaymentExp}
        onDelete={deleteMortgageExp}
        onAdd={(type) => { setMortgageExpType(type); setIsAddMortgageExpModalOpen(true); }}
        onEdit={(item) => onEditExp(item)}
        type="down_payment"
        icon={Building2}
        totalLabel="總計"
        totalValue={totalDownPaymentExp}
        variant="amber"
        isCollapsible={true}
        defaultExpanded={false}
        itemRenderer={(item) => (
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-slate-700 text-sm block">{item.name}</span>
              <span className="text-[10px] text-slate-400">{formatDetailedDate(item.date)}</span>
              {item.note && <span className="text-xs text-slate-500 block mt-1">{item.note}</span>}
              {item.brand && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-1 inline-block">{item.brand}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="tabular-nums font-bold text-slate-700">${Number(item.amount).toLocaleString()}</span>
            </div>
          </div>
        )}
      />

      <StandardList
        title="購買房產划算試算"
        items={mortgageAnalysis}
        onDelete={deleteMortgageAnalysis}
        onAdd={() => setIsAddMortgageAnalysisModalOpen(true)}
        onEdit={(item) => onEditAnalysis(item)}
        icon={Calculator}
        totalLabel="試算總成本"
        totalValue={totalAnalysis}
        variant="emerald"
        isCollapsible={true}
        defaultExpanded={false}
        itemRenderer={(item) => (
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-slate-600 font-medium">{item.name}</span>
            <span className="tabular-nums font-bold text-slate-800">${Number(item.amount).toLocaleString()}</span>
          </div>
        )}
      />

      <StandardList
        title="頭期款來源"
        items={mortgageFunding}
        onDelete={deleteMortgageFunding}
        onAdd={() => setIsAddMortgageFundingModalOpen(true)}
        onEdit={(item) => onEditFunding(item)}
        icon={Coins}
        totalLabel="提領資金"
        totalValue={totalFunding}
        variant="indigo"
        isCollapsible={true}
        defaultExpanded={false}
        itemRenderer={(item) => {
          const hasShares = Number(item.shares) > 0;
          const rate = Number(item.rate) || 1;
          const soldPrice = Number(item.amount);
          const shares = hasShares ? Number(item.shares) : 1;
          const itemTotal = soldPrice * shares * rate;

          const currentPrice = prices[item.symbol?.trim().toUpperCase()];
          let diff = null;
          if (currentPrice && hasShares) {
            // Estimate current value (TWD) based on user rate.
            // If rate=1 (TWD), price is TWD. If rate=30 (USD->TWD), price is USD*rate.
            // Finnhub returns price in the currency of the exchange (usually USD for US stocks).
            const currentTotal = currentPrice * shares * rate;
            diff = currentTotal - itemTotal;
          }

          return (
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-bold text-slate-700 text-sm">
                  {item.source || '資金來源'}
                  {item.symbol && <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-600 px-1 rounded">{item.symbol}</span>}
                </span>
                <span className="tabular-nums font-bold text-emerald-600">${itemTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{hasShares ? `${Number(item.shares).toLocaleString()}股 x $${Number(item.amount).toLocaleString()}` : `$${Number(item.amount).toLocaleString()}`}{rate !== 1 && ` (匯率 ${rate})`}</span>
                <span>{formatDetailedDate(item.date)}</span>
              </div>
              {diff !== null && (
                <div className={`mt-1 text-[10px] font-bold ${diff > 0 ? 'text-emerald-500' : 'text-rose-500'} flex items-center gap-1`}>
                  {diff > 0 ? '若沒賣獲利: +' : '若沒賣虧損: '}${Math.abs(Math.round(diff)).toLocaleString()}
                  {diff > 0 ? '(持股獲利)' : '(持股虧損)'}
                </div>
              )}
            </div>
          );
        }}
      />

      <MortgagePlanView />

      <StandardList
        title="雜支紀錄"
        items={applianceExp}
        onDelete={deleteMortgageExp}
        onAdd={(type) => { setMortgageExpType(type); setIsAddMortgageExpModalOpen(true); }}
        onEdit={(item) => onEditExp(item)}
        type="misc_appliances"
        icon={Receipt}
        totalLabel="支出總計"
        totalValue={totalApplianceExp}
        variant="blue"
        isCollapsible={true}
        defaultExpanded={false}
        itemRenderer={(item) => (
          <div className="flex justify-between items-center">
            <div>
              <span className="font-bold text-slate-700 text-sm block">{item.name}</span>
              <span className="text-[10px] text-slate-400">{formatDetailedDate(item.date)} {item.brand && `• ${item.brand}`}</span>
              {item.note && <span className="text-xs text-slate-500 block mt-1">{item.note}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="tabular-nums font-bold text-slate-700">${Number(item.amount).toLocaleString()}</span>
            </div>
          </div>
        )}
      />
    </div>
  );
};

export { MortgagePlanView, MortgageView };
