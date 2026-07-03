import { useState, useEffect, useRef } from 'react';
import { Plus, X, FolderOpen, ChevronDown, CheckCircle2, Check } from 'lucide-react';
import { AmountInput, ModalWrapper } from './ui';
import { GLASS_CARD, GLASS_INPUT } from '../lib/constants';


const GroupSettingsEditor = ({ title, groups, onSave }) => {
  const [localGroups, setLocalGroups] = useState(groups);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingSelection, setEditingSelection] = useState(null);
  const [drafts, setDrafts] = useState({}); // { [gIdx]: { name, budget } } — controlled add/edit inputs
  const saveTimerRef = useRef(null);

  useEffect(() => setLocalGroups(groups), [groups]);

  // Auto-save with debounce when localGroups changes (after user edits)
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      await onSave(localGroups);
      setHasUnsavedChanges(false);
      setTimeout(() => setIsSaving(false), 800);
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [localGroups, hasUnsavedChanges]);

  const updateLocalGroups = (newGroups) => {
    setLocalGroups(newGroups);
    setHasUnsavedChanges(true);
  };

  const handleSaveWrapper = async () => { setIsSaving(true); await onSave(localGroups); setHasUnsavedChanges(false); setTimeout(() => setIsSaving(false), 1000); };
  const addGroup = () => { if (newGroupName) { updateLocalGroups([...localGroups, { name: newGroupName, items: [] }]); } setNewGroupName(''); };
  const deleteGroup = (i) => updateLocalGroups(localGroups.filter((_, idx) => idx !== i));

  const setDraft = (gIdx, field, val) => setDrafts(prev => ({ ...prev, [gIdx]: { ...prev[gIdx], [field]: val } }));
  const clearDraft = (gIdx) => setDrafts(prev => ({ ...prev, [gIdx]: { name: '', budget: '' } }));

  const handleItemSubmit = (gIdx) => {
    const draft = drafts[gIdx] || {};
    const name = (draft.name || '').trim();
    if (!name) return;
    const budget = Number(draft.budget) || 0;
    const g = [...localGroups];
    if (editingSelection && editingSelection.gIdx === gIdx) {
      g[gIdx].items[editingSelection.iIdx] = { name, budget };
      setEditingSelection(null);
    } else {
      g[gIdx].items.push({ name, budget });
    }
    updateLocalGroups(g);
    clearDraft(gIdx);
  };

  const handleEditItem = (gIdx, iIdx) => {
    const item = localGroups[gIdx].items[iIdx];
    setEditingSelection({ gIdx, iIdx });
    setDrafts(prev => ({ ...prev, [gIdx]: { name: item.name, budget: String(item.budget) } }));
  };

  const delItem = (gi, ii) => {
    const g = [...localGroups];
    g[gi].items = g[gi].items.filter((_, i) => i !== ii);
    updateLocalGroups(g);
    if (editingSelection && editingSelection.gIdx === gi && editingSelection.iIdx === ii) { setEditingSelection(null); clearDraft(gi); }
  };

  const grandTotal = localGroups.reduce((s, g) => s + g.items.reduce((a, i) => a + Number(i.budget || 0), 0), 0);

  return (
    <div className="mb-10 animate-in fade-in">
      <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2">
        <div>
          <h3 className="text-lg font-bold text-slate-700">{title}</h3>
          <div className="text-xs text-slate-400 mt-0.5">預算總計 <span className="font-bold text-slate-600 tabular-nums">${grandTotal.toLocaleString()}</span></div>
        </div>
        <button onClick={handleSaveWrapper} className={`text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 font-bold ${isSaving ? 'bg-emerald-50 text-emerald-600' : hasUnsavedChanges ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>{isSaving ? <><Check className="w-3 h-3" /> 已儲存</> : hasUnsavedChanges ? '儲存變更' : <><Check className="w-3 h-3" /> 已儲存</>}</button>
      </div>
      <div className="space-y-4">
        {localGroups.map((group, gIdx) => {
          const groupTotal = group.items.reduce((a, i) => a + Number(i.budget || 0), 0);
          const draft = drafts[gIdx] || { name: '', budget: '' };
          const isEditingThis = editingSelection?.gIdx === gIdx;
          return (
            <div key={gIdx} className={`${GLASS_CARD} overflow-hidden p-0`}>
              <div className="bg-slate-50/50 p-4 flex justify-between items-center border-b border-slate-100">
                <span className="font-bold text-slate-600 text-sm flex items-center gap-2"><FolderOpen className="w-4 h-4 text-slate-400" /> {group.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 tabular-nums">${groupTotal.toLocaleString()}</span>
                  <button onClick={() => deleteGroup(gIdx)} className="text-slate-300 hover:text-rose-400"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {group.items.map((item, iIdx) => (
                  <div key={iIdx} onClick={() => handleEditItem(gIdx, iIdx)} className={`flex justify-between items-center text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors ${editingSelection?.gIdx === gIdx && editingSelection?.iIdx === iIdx ? 'bg-blue-50 ring-1 ring-blue-100' : ''}`}>
                    <span className="text-slate-500 font-medium">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-md">${Number(item.budget).toLocaleString()}</span>
                      <button onClick={(e) => { e.stopPropagation(); delItem(gIdx, iIdx); }} className="text-slate-200 hover:text-rose-400"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 mt-3 pt-2">
                  <input value={draft.name || ''} onChange={(e) => setDraft(gIdx, 'name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleItemSubmit(gIdx)} placeholder={isEditingThis ? '編輯項目名稱' : '項目名稱'} className={`${GLASS_INPUT} w-full text-xs py-2 px-3`} />
                  <AmountInput value={draft.budget ?? ''} onCommit={(v) => setDraft(gIdx, 'budget', v)} commitOnChange placeholder="$" className={`${GLASS_INPUT} w-24 text-xs py-2 px-3`} />
                  <button onClick={() => handleItemSubmit(gIdx)} className={`text-white px-3 rounded-lg transition-colors ${isEditingThis ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-700'}`}>
                    {isEditingThis ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-4">
        <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGroup()} placeholder="新增群組名稱..." className={`${GLASS_INPUT} flex-1 text-sm shadow-sm`} />
        <button onClick={addGroup} className="bg-white border border-slate-200 text-slate-600 px-5 rounded-xl shadow-sm hover:bg-slate-50 font-bold"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
};




const RecurringManagerModal = ({ isOpen, onClose, items, onSave, groups }) => {
  const [localItems, setLocalItems] = useState(items || []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', amount: '', group: '', category: '', payer: 'myself', day: '1', active: true });

  useEffect(() => { setLocalItems(items || []); }, [items]);

  useEffect(() => {
    if (isAdding && groups && groups.length > 0 && !editingId && !newItem.group) {
      setNewItem(prev => ({ ...prev, group: groups[0].name, category: groups[0].items[0]?.name || '' }));
    }
  }, [isAdding, groups, editingId]);

  const handleSaveItem = () => {
    if (!newItem.name || !newItem.amount) return;
    if (editingId) {
      setLocalItems(prev => prev.map(item => item.id === editingId ? { ...newItem, id: editingId } : item));
      setEditingId(null);
    } else {
      setLocalItems([...localItems, { ...newItem, id: Date.now().toString() }]);
    }
    setNewItem({ name: '', amount: '', group: '', category: '', payer: 'myself', day: '1', active: true });
    setIsAdding(false);
  };

  const handleEditClick = (item) => {
    setNewItem({ ...item, day: item.day || '1' });
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleCancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewItem({ name: '', amount: '', group: '', category: '', payer: 'myself', day: '1', active: true });
  };

  const handleDelete = (id) => {
    setLocalItems(localItems.filter(i => i.id !== id));
    if (editingId === id) handleCancelEdit();
  };
  const handleToggle = (id) => setLocalItems(localItems.map(i => i.id === id ? { ...i, active: !i.active } : i));
  const handleSave = () => { onSave(localItems); onClose(); };

  if (!isOpen) return null;
  return (
    <ModalWrapper title="固定支出設定" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex gap-2">
          <span className="text-amber-600 font-bold shrink-0">💡</span>
          <span className="text-xs text-amber-700">啟用中的項目會在每月第一次開啟 App 時「自動入帳」（多台裝置也只會入帳一次）。可設定入帳日 (1-31)，若當月無該日期將記於該月最後一天。</span>
        </div>

        {!isAdding && (
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {localItems.map(item => (
              <div key={item.id} onClick={() => handleEditClick(item)} className={`relative flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:border-indigo-300 transition-colors ${item.active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button onClick={(e) => { e.stopPropagation(); handleToggle(item.id); }} className={`p-1.5 rounded-full ${item.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 truncate">{item.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${item.payer === 'partner' ? 'bg-rose-100 text-rose-500' : 'bg-blue-100 text-blue-600'}`}>{item.payer === 'partner' ? '佳欣' : '士程'}</span>
                    </div>
                    <span className="text-xs text-slate-400">每月 {item.day || 1} 日 • ${Number(item.amount).toLocaleString()} • {item.group}-{item.category}</span>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 text-slate-300 hover:text-rose-400"><X className="w-4 h-4" /></button>
              </div>
            ))}
            {localItems.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">尚無設定項目</div>}
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 space-y-3">
          {!isAdding ? (
            <button onClick={() => setIsAdding(true)} className="w-full py-3 bg-slate-50 text-slate-500 font-bold rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> 新增項目
            </button>
          ) : (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase">{editingId ? '編輯項目' : '新增項目'}</h4>
                <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-6 gap-2">
                <input placeholder="名稱" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className={`${GLASS_INPUT} px-3 py-2 text-sm col-span-4`} />
                <div className="col-span-2 flex items-center bg-white/50 rounded-xl border border-slate-200 px-2 focus-within:ring-2 focus-within:ring-slate-400 focus-within:border-transparent transition-all">
                  <span className="text-xs text-slate-500 shrink-0 font-bold">每月</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newItem.day}
                    onChange={e => setNewItem({ ...newItem, day: e.target.value })}
                    className="w-full bg-transparent text-center font-bold text-slate-700 outline-none py-2 text-sm"
                    placeholder="1"
                  />
                  <span className="text-xs text-slate-500 shrink-0 font-bold">日</span>
                </div>
                <input type="number" placeholder="金額" value={newItem.amount} onChange={e => setNewItem({ ...newItem, amount: e.target.value })} className={`${GLASS_INPUT} px-3 py-2 text-sm col-span-6`} />

                <div className="relative col-span-3">
                  <select value={newItem.group} onChange={e => {
                    const g = (groups || []).find(grp => grp.name === e.target.value);
                    setNewItem({ ...newItem, group: e.target.value, category: g ? g.items[0]?.name : '' });
                  }} className={`${GLASS_INPUT} w-full px-3 py-2 text-sm appearance-none`}>
                    {(groups || []).map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative col-span-3">
                  <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className={`${GLASS_INPUT} w-full px-3 py-2 text-sm appearance-none`}>
                    {(groups || []).find(g => g.name === newItem.group)?.items.map(i => <option key={i.name} value={i.name}>{i.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>

                <div className="col-span-6 flex gap-2 pt-1">
                  <button onClick={() => setNewItem({ ...newItem, payer: 'myself' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${newItem.payer === 'myself' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400'}`}>士程</button>
                  <button onClick={() => setNewItem({ ...newItem, payer: 'partner' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${newItem.payer === 'partner' ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-white border-slate-200 text-slate-400'}`}>佳欣</button>
                </div>

                <button onClick={handleSaveItem} disabled={!newItem.name || !newItem.amount} className="col-span-6 bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-1 disabled:opacity-50 mt-2">
                  {editingId ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingId ? '確認修改' : '確認新增'}
                </button>
              </div>
            </div>
          )}
        </div>
        {!isAdding && <button onClick={handleSave} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-lg mt-4">儲存設定</button>}
      </div>
    </ModalWrapper>
  );
};

export { GroupSettingsEditor, RecurringManagerModal };
