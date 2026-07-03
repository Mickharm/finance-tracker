import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, X, Save, Landmark, Building2, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { InputField, PrincipalTrendChart } from '../components/ui';
import { DEFAULT_PRINCIPAL_CONFIG, GLASS_CARD } from '../lib/constants';
import { LEDGER_ID } from '../lib/firebase';
import { getTodayString } from '../lib/utils';


const AssetGroup = ({ title, items, section, groupKey, onUpdate, onAdd, onDelete, accentColor = 'stone' }) => {
  const colorHex = { emerald: '#52B788', rose: '#E57373', stone: '#CBD5E1' };
  const subtotal = (items || []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  return (
    <div className={`${GLASS_CARD} p-0 mb-4 border-l-4`} style={{ borderLeftColor: colorHex[accentColor] || colorHex.stone }}>
      <div className="flex justify-between items-center px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          {section === 'assets' ? <Landmark className="w-4 h-4 text-slate-400" /> : <Building2 className="w-4 h-4 text-slate-400" />}
          <h4 className="font-bold text-slate-700 text-sm">{title}</h4>
          <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-bold">{(items || []).length}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm tabular-nums font-bold text-slate-700">${subtotal.toLocaleString()}</span>
          <button onClick={() => onAdd(section, groupKey)} className="p-1.5 bg-slate-100 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="px-4 pb-4 space-y-2">
        {(items || []).map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 group/item min-w-0">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0"></div>
            <input value={item.name} onChange={(e) => onUpdate(section, groupKey, idx, 'name', e.target.value)} placeholder="Name" className="flex-1 text-sm py-1.5 px-2 bg-transparent border-b border-transparent focus:border-slate-300 outline-none text-slate-600 transition-colors min-w-0" />
            <div className="relative w-36 flex-shrink-0">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">$</span>
              <input type="text" inputMode="numeric" value={Number(item.amount).toLocaleString()} onChange={(e) => { const v = e.target.value.replace(/,/g, ''); if (!isNaN(v)) onUpdate(section, groupKey, idx, 'amount', v); }} className="w-full text-sm py-1.5 pl-5 pr-2 tabular-nums text-right text-slate-700 font-bold bg-transparent border-b border-transparent focus:border-slate-300 outline-none transition-colors" />
            </div>
            <button onClick={() => onDelete(section, groupKey, idx)} className="p-1 text-slate-300 hover:text-rose-400 transition-all flex-shrink-0"><X className="w-3 h-3" /></button>
          </div>
        ))}
        {(items || []).length === 0 && <div className="text-center text-xs text-slate-300 py-3">No items</div>}
      </div>
    </div>
  );
};

const PrincipalView = ({ user, db, appId, requestDelete, requestConfirmation }) => {
  const [config, setConfig] = useState(DEFAULT_PRINCIPAL_CONFIG);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snapshotDate, setSnapshotDate] = useState(getTodayString());
  const [activeTab, setActiveTab] = useState('edit');
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    if (!user) return;
    const configRef = doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'principal_config');
    const unsubConfig = onSnapshot(configRef, (s) => s.exists() ? setConfig(s.data()) : setDoc(configRef, DEFAULT_PRINCIPAL_CONFIG));
    const historyRef = collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'principal_history');
    const q = query(historyRef, orderBy('date', 'desc'));
    const unsubHistory = onSnapshot(q, (s) => {
      setHistory(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => { unsubConfig(); unsubHistory(); };
  }, [user]);

  const totalBank = (config.assets.bank || []).reduce((s, i) => s + Number(i.amount), 0);
  const totalInvest = (config.assets.invest || []).reduce((s, i) => s + Number(i.amount), 0);
  const totalAssets = totalBank + totalInvest;
  const totalLiabilities = (config.liabilities.encumbrance || []).reduce((s, i) => s + Number(i.amount), 0);
  const netWorth = totalAssets - totalLiabilities;

  const updateItem = (section, group, idx, field, val) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    newConfig[section][group][idx][field] = field === 'amount' ? Number(val) : val;
    setConfig(newConfig);
    setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'principal_config'), newConfig);
  };
  const addItem = (section, group) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    if (!newConfig[section][group]) newConfig[section][group] = [];
    newConfig[section][group].push({ name: '', amount: 0 });
    setConfig(newConfig);
    setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'principal_config'), newConfig);
  };
  const deleteItem = (section, group, idx) => {
    requestConfirmation({ message: '確定移除此項目？', onConfirm: () => {
      const newConfig = JSON.parse(JSON.stringify(config));
      newConfig[section][group] = newConfig[section][group].filter((_, i) => i !== idx);
      setConfig(newConfig);
      setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'principal_config'), newConfig);
    } });
  };
  const handleAddSnapshot = () => {
    requestConfirmation({ message: `確定結算 ${snapshotDate} 的金額？`, title: '結算確認', onConfirm: () => {
      addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'principal_history'), {
        date: new Date(snapshotDate).toISOString(), netPrincipal: netWorth, details: config, createdAt: serverTimestamp()
      }).catch(e => console.error('snapshot sync failed:', e));
    } });
  };
  const handleDeleteHistory = (id) => requestDelete('刪除此紀錄？', () => deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'principal_history', id)));

  const displayedHistory = showAllHistory ? history : history.slice(0, 5);

  return (
    <div className="pb-24 space-y-5 animate-in fade-in">
      {/* Trend Chart */}
      <PrincipalTrendChart history={history} />

      {/* Current (live) net worth — what you're inventorying right now */}
      <div className={`${GLASS_CARD} p-5`}>
        <div className="text-xs text-slate-400 uppercase font-bold mb-1">目前淨值</div>
        <div className="text-3xl font-bold text-slate-800 tabular-nums tracking-tight">${netWorth.toLocaleString()}</div>
        <div className="text-[10px] text-slate-400 mt-1.5 tabular-nums">總資產 ${totalAssets.toLocaleString()} − 總負債 ${totalLiabilities.toLocaleString()}</div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`${GLASS_CARD} p-4 border-l-4`} style={{ borderLeftColor: '#52B788' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] text-slate-400 font-bold uppercase">總資產</span>
          </div>
          <div className="text-xl font-bold text-slate-800 tabular-nums">${totalAssets.toLocaleString()}</div>
          <div className="flex flex-col gap-0.5 mt-2">
            <span className="text-[9px] text-slate-400 tabular-nums">銀行 ${totalBank.toLocaleString()}</span>
            <span className="text-[9px] text-slate-400 tabular-nums">投資 ${totalInvest.toLocaleString()}</span>
          </div>
        </div>
        <div className={`${GLASS_CARD} p-4 border-l-4`} style={{ borderLeftColor: '#E57373' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px] text-slate-400 font-bold uppercase">總負債</span>
          </div>
          <div className="text-xl font-bold text-slate-800 tabular-nums">${totalLiabilities.toLocaleString()}</div>
          <div className="flex flex-col gap-0.5 mt-2">
            <span className="text-[9px] text-slate-400 tabular-nums">負債比 {totalAssets > 0 ? ((totalLiabilities / totalAssets) * 100).toFixed(1) : '0'}%</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        {[{ key: 'edit', label: '編輯資產' }, { key: 'history', label: '結算紀錄' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-slate-800 text-white shadow-lg shadow-slate-300/30' : 'bg-white/60 text-slate-400 border border-slate-100 hover:bg-slate-50'}`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'edit' ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Assets Section */}
          <div>
            <h3 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3 ml-1 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> 資產組成 Assets
            </h3>
            <AssetGroup title="銀行帳戶" items={config.assets.bank} section="assets" groupKey="bank" onUpdate={updateItem} onAdd={addItem} onDelete={deleteItem} accentColor="emerald" />
            <AssetGroup title="投資項目" items={config.assets.invest} section="assets" groupKey="invest" onUpdate={updateItem} onAdd={addItem} onDelete={deleteItem} accentColor="emerald" />
          </div>
          {/* Liabilities Section */}
          <div>
            <h3 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-3 ml-1 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div> 負債組成 Liabilities
            </h3>
            <AssetGroup title="房價圈存" items={config.liabilities.encumbrance} section="liabilities" groupKey="encumbrance" onUpdate={updateItem} onAdd={addItem} onDelete={deleteItem} accentColor="rose" />
          </div>
          {/* Snapshot Action */}
          <div className={`${GLASS_CARD} p-5`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-500"><Save className="w-5 h-5" /></div>
              <div>
                <h3 className="font-bold text-slate-700 text-sm">結算當前資產</h3>
                <p className="text-[10px] text-slate-400">將目前資產配置儲存為歷史紀錄</p>
              </div>
            </div>
            <div className="flex gap-3">
              <InputField label="結算日期" type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} className="flex-1" />
              <button onClick={handleAddSnapshot} className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors shadow-lg shadow-slate-300/30 self-end">結算</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 animate-in fade-in duration-200">
          {displayedHistory.length === 0 ? (
            <div className={`${GLASS_CARD} flex flex-col items-center justify-center h-48 text-slate-300 border-dashed`}>
              <Clock className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">尚無結算紀錄</p>
            </div>
          ) : (
            <>
              {displayedHistory.map((rec, idx) => {
                const prevRec = history[history.indexOf(rec) + 1];
                const growth = prevRec ? rec.netPrincipal - prevRec.netPrincipal : 0;
                const growthPct = prevRec && prevRec.netPrincipal !== 0 ? (growth / Math.abs(prevRec.netPrincipal)) * 100 : 0;
                return (
                  <div key={rec.id} className={`${GLASS_CARD} p-4 group`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center mt-1">
                          <div className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-slate-800' : 'bg-slate-300'}`}></div>
                          {idx < displayedHistory.length - 1 && <div className="w-px h-8 bg-slate-200 mt-1"></div>}
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 font-medium mb-0.5">{new Date(rec.date).toLocaleDateString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                          <div className="text-lg font-bold text-slate-800 tabular-nums">${rec.netPrincipal.toLocaleString()}</div>
                          {prevRec && growth !== 0 && (
                            <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${growth > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {growth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              <span>{growth > 0 ? '+' : ''}{growth.toLocaleString()} ({growthPct.toFixed(1)}%)</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteHistory(rec.id)} className="p-1.5 text-slate-300 hover:text-rose-400 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-all"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
              {history.length > 5 && (
                <button onClick={() => setShowAllHistory(!showAllHistory)} className="w-full py-2.5 text-xs text-slate-400 font-bold hover:text-slate-600 transition-colors">
                  {showAllHistory ? '收起' : `展開全部 (${history.length} 筆)`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export { AssetGroup, PrincipalView };
