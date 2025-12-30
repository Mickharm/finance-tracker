import * as React from 'react';
const { useState, useEffect, useMemo, useCallback, useRef } = React;
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import {
  Menu, ChevronLeft, ChevronRight, Plus, X, Calendar, DollarSign,
  PieChart, Home, Target, Users, Settings as SettingsIcon, FolderOpen,
  ChevronDown, ChevronUp, Briefcase, User, Heart, PiggyBank,
  Wallet, ArrowUpCircle, ArrowDownCircle, BarChart2, Save, Landmark,
  Building2, Clock, ToggleLeft, ToggleRight, ClipboardList, Calculator,
  Coins, Receipt, CheckCircle2, Check, ArrowRightLeft, PenTool, Hash, FileText,
  TrendingUp, TrendingDown, RefreshCw, Layers, Search, Lock
} from 'lucide-react';
import icon from './assets/icon.png';

// --- 1. Infrastructure & Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAZwgJfZqiej9DOl42a2pLoN7sio3dr9vk",
  authDomain: "accounting-assistant-12f5f.firebaseapp.com",
  projectId: "accounting-assistant-12f5f",
  storageBucket: "accounting-assistant-12f5f.firebasestorage.app",
  messagingSenderId: "334790576786",
  appId: "1:334790576786:web:61f27c567113f70a3bf44b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'finance-tracker-production';
const FINNHUB_API_KEY = 'd58c17hr01qptoarifpgd58c17hr01qptoarifq0';
const LEDGER_ID = 'Mick'; // Hardcoded Shared Ledger ID

// --- 2. Constants & Data Structures ---
const GLASS_CARD = "bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg shadow-slate-200/50 rounded-3xl";
const GLASS_INPUT = "w-full min-w-0 max-w-full box-border bg-white/50 backdrop-blur-sm border border-white/60 focus:bg-white/80 focus:border-slate-300 transition-all outline-none rounded-2xl text-base p-4 appearance-none";

const COLOR_VARIANTS = {
  slate: {
    bg: 'bg-slate-100/50', border: 'border-slate-200', text: 'text-slate-700',
    iconBg: 'bg-slate-100', iconText: 'text-slate-600', bar: 'bg-slate-600',
    glow: 'border-slate-200 shadow-sm'
  },
  stone: {
    bg: 'bg-stone-100/50', border: 'border-stone-200', text: 'text-stone-700',
    iconBg: 'bg-stone-100', iconText: 'text-stone-600', bar: 'bg-stone-500',
    glow: 'border-stone-200 shadow-sm'
  },
  sky: {
    bg: 'bg-sky-50/50', border: 'border-sky-100', text: 'text-sky-800',
    iconBg: 'bg-sky-100', iconText: 'text-sky-600', bar: 'bg-sky-400',
    glow: 'border-sky-200 shadow-lg shadow-sky-100/50'
  },
  blue: {
    bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-800',
    iconBg: 'bg-blue-100', iconText: 'text-blue-600', bar: 'bg-blue-500',
    glow: 'border-blue-200 shadow-lg shadow-blue-100/50'
  },
  rose: {
    bg: 'bg-rose-50/50', border: 'border-rose-100', text: 'text-rose-800',
    iconBg: 'bg-rose-100', iconText: 'text-rose-600', bar: 'bg-rose-400',
    glow: 'border-rose-200 shadow-lg shadow-rose-100/50'
  },
  emerald: {
    bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-800',
    iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', bar: 'bg-emerald-500',
    glow: 'border-emerald-200 shadow-lg shadow-emerald-100/50'
  },
  amber: {
    bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-800',
    iconBg: 'bg-amber-100', iconText: 'text-amber-600', bar: 'bg-amber-400',
    glow: 'border-amber-200 shadow-lg shadow-amber-100/50'
  },
  indigo: {
    bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-800',
    iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', bar: 'bg-indigo-500',
    glow: 'border-indigo-200 shadow-lg shadow-indigo-100/50'
  },
  cyan: {
    bg: 'bg-cyan-50/50', border: 'border-cyan-100', text: 'text-cyan-800',
    iconBg: 'bg-cyan-100', iconText: 'text-cyan-600', bar: 'bg-cyan-500',
    glow: 'border-cyan-200 shadow-lg shadow-cyan-100/50'
  },
};

const DEFAULT_SETTINGS = { monthlyGroups: [], annualGroups: [], recurringItems: [], lastRecurringCheck: '' };
const DEFAULT_PRINCIPAL_CONFIG = { assets: { bank: [], invest: [] }, liabilities: { encumbrance: [] } };
const INCOME_CATEGORIES = ['薪水', '年終獎金', '激勵獎金', '其他獎金'];

const MENU_SECTIONS = [
  {
    title: '記帳功能',
    items: [
      { id: 'home', label: '帳務總覽', icon: Home },
      { id: 'calendar', label: '每日明細', icon: Calendar },
      { id: 'visualization', label: '支出分析', icon: BarChart2 },
      { id: 'income', label: '收入管理', icon: DollarSign },
      { id: 'settings', label: '預算設定', icon: SettingsIcon },
    ]
  },
  {
    title: '儲蓄功能',
    items: [
      { id: 'watchlist', label: '定投名單', icon: Layers },
      { id: 'stock_goals', label: '存股計畫', icon: Target },
      { id: 'partner', label: '佳欣儲蓄', icon: Users },
      { id: 'principal', label: '資產淨值', icon: PieChart },
      { id: 'mortgage', label: '房產投資', icon: Building2 },
    ]
  }
];
const MENU_ITEMS_FLAT = MENU_SECTIONS.flatMap(section => section.items);

// --- Helper Functions ---
const formatDetailedDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (週${weekdays[date.getDay()]})`;
};
const toLocalISOString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const getTodayString = () => toLocalISOString(new Date());
const getFixedDepositAmount = (year) => {
  if (year >= 2022 && year <= 2029) return 20000;
  if (year >= 2040) return 30000;
  return 0;
};

// --- Components ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, message, title = "確認", confirmText = "確定", confirmColor = "bg-slate-800" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${GLASS_CARD} p-6 w-full max-w-xs animate-in zoom-in-95 duration-200`}>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold active:scale-95 transition-transform text-xs">取消</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform text-xs ${confirmColor}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const ModalWrapper = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={onClose} />
    <div className={`relative w-full rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-2xl shadow-2xl`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800 tracking-tight pl-2">{title}</h3>
        <button type="button" onClick={onClose} className="p-2 bg-slate-100/50 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors z-10 relative">
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const InputField = ({ label, type = "text", value, onChange, placeholder, required = false, autoFocus = false, children, className = "" }) => (
  <div className={`space-y-1.5 w-full ${className}`}>
    {label && <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>}
    <div className="relative w-full min-w-0">
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} autoFocus={autoFocus} className={GLASS_INPUT} />
      {children}
    </div>
  </div>
);

// Calculator Input Component
const CalculatorInput = ({ value, onChange, label }) => {
  const [displayValue, setDisplayValue] = useState(String(value !== undefined && value !== null ? value : '0'));
  const [expression, setExpression] = useState('');

  useEffect(() => {
    setDisplayValue(String(value !== undefined && value !== null ? value : '0'));
  }, [value]);

  const handleButton = (btn) => {
    let newVal = displayValue;

    if (btn === 'AC') {
      newVal = '0';
      setExpression('');
      onChange('0');
    } else if (btn === '=') {
      try {
        const cleanExpression = displayValue.replace(/[+\-*/]$/, '');
        // eslint-disable-next-line no-eval
        const result = Math.round(eval(cleanExpression.replace(/,/g, '')) || 0);
        newVal = result.toString();
        setExpression('');
        onChange(newVal);
      } catch (e) { newVal = '0'; }
    } else if (btn === '⌫') {
      newVal = String(displayValue).slice(0, -1) || '0';
      if (!isNaN(Number(newVal)) && !expression) onChange(newVal);
    } else if (['+', '-', '*', '/'].includes(btn)) {
      if (['+', '-', '*', '/'].includes(String(displayValue).slice(-1))) {
        newVal = String(displayValue).slice(0, -1) + btn;
      } else {
        newVal = String(displayValue) + btn;
      }
      setExpression(newVal);
    } else {
      // Numbers, ., 00
      if (String(displayValue) === '0' && !expression && btn !== '.') {
        newVal = btn;
      } else {
        newVal = String(displayValue) + btn;
      }
      // Basic validation to prevent invalid formats like 1..0 or operators in weird places
      if (!['+', '-', '*', '/'].some(op => newVal.includes(op)) || expression) {
        onChange(newVal);
      }
    }
    setDisplayValue(newVal);
  };

  const buttons = [
    ['AC', '÷', '×', '⌫'],
    ['7', '8', '9', '-'],
    ['4', '5', '6', '+'],
    ['1', '2', '3', '='],
    ['0', '00', '.']
  ];

  const formatDisplay = (val) => {
    try {
      return String(val).split(/([+\-*/])/).map(part => {
        if (['+', '-', '*', '/'].includes(part)) return ` ${part} `;
        if (part === '') return '';
        // If it's a valid number
        if (!isNaN(Number(part))) {
          // If it ends with '.', Number() will strip it, so we strictly check usage
          if (part.endsWith('.')) {
            return Number(part.slice(0, -1)).toLocaleString() + '.';
          }
          // If it has decimal part, ensure we don't lose .0 or .00 (e.g. 1.0)
          if (part.includes('.')) {
            const [int, dec] = part.split('.');
            return Number(int).toLocaleString() + '.' + dec;
          }
          return Number(part).toLocaleString();
        }
        return part;
      }).join('');
    } catch { return val; }
  };

  return (
    <div className="space-y-3">
      {label && <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>}
      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
        <div className="text-right mb-4 overflow-x-auto scrollbar-hide">
          <div className="text-3xl font-bold text-slate-800 font-mono tracking-tight whitespace-nowrap">
            {formatDisplay(displayValue)}
          </div>
          {expression && <div className="text-xs text-slate-400 font-mono h-4 opacity-0">.</div>}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {buttons.flat().map((btn, idx) => (
            <button
              key={`${btn}-${idx}`}
              type="button"
              onClick={() => handleButton(btn === '÷' ? '/' : btn === '×' ? '*' : btn)}
              className={`py-3.5 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-sm
                ${btn === 'AC' ? 'bg-rose-100 text-rose-600' :
                  btn === '⌫' ? 'bg-amber-100 text-amber-600' :
                    ['÷', '×', '-', '+', '='].includes(btn) ? 'bg-slate-200 text-slate-700' :
                      btn === '0' ? 'col-span-2 bg-white text-slate-800 border border-slate-200' :
                        'bg-white text-slate-800 border border-slate-200'
                }`}
              style={btn === '0' ? { gridColumn: 'span 2' } : {}}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const GlassButton = ({ onClick, children, className = "", disabled = false, variant = 'primary', type = "button" }) => {
  const variants = {
    primary: "bg-slate-800 text-white shadow-lg shadow-slate-300/30 hover:bg-slate-900",
    danger: "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100",
    success: "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100",
    ghost: "bg-white/50 text-slate-600 hover:bg-white border border-white/20"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`relative overflow-hidden px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm ${variants[variant]} ${className}`}>{children}</button>
  );
};

const BudgetProgressBar = ({ current, total, label, variant = 'main', colorTheme = 'slate', showDetails = true, showOverBudgetLabel = true }) => {
  const remaining = total - current;
  const percentage = total > 0 ? Math.max(0, (remaining / total) * 100) : 0;
  const usedPercentage = total > 0 ? (current / total) * 100 : 0;
  const isOverBudget = remaining < 0;
  const theme = COLOR_VARIANTS[colorTheme] || COLOR_VARIANTS.slate;
  let statusColor = theme.bar;
  if (isOverBudget) statusColor = 'bg-rose-400';
  else if (percentage < 20) statusColor = 'bg-amber-300';

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${theme.text} opacity-80 flex items-center gap-2`}>{label} {isOverBudget && showOverBudgetLabel && <span className="bg-rose-50 text-rose-600 text-[10px] px-1.5 py-0.5 rounded-md shadow-sm">超支</span>}</span>
        {showDetails && (
          <div className="flex items-baseline gap-1 text-right">
            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{isOverBudget && showOverBudgetLabel ? '超支' : '剩餘'}</span>
            <span className={`font-mono font-bold ${isOverBudget ? 'text-rose-500' : 'text-slate-700'} ${Math.abs(remaining) > 1000000 ? 'text-sm' : ''}`}>{isOverBudget ? '-' : ''}${Math.abs(remaining).toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className={`w-full bg-slate-100/50 rounded-full h-1.5 overflow-hidden`}><div className={`h-full transition-all duration-1000 ease-out ${statusColor}`} style={{ width: `${isOverBudget ? 100 : percentage}%` }} /></div>
      {showDetails && variant === 'main' && (<div className="flex justify-between mt-1.5 text-[10px] text-slate-400 font-medium"><span>{Math.round(usedPercentage)}% 已用</span><span>總額: ${total.toLocaleString()}</span></div>)}
    </div>
  );
};

const Card = ({ children, className = "", variant = 'slate' }) => { return (<div className={`${GLASS_CARD} p-5 ${className}`}>{children}</div>); };

const PrincipalTrendChart = ({ history }) => {
  const data = useMemo(() => [...history].reverse().slice(-12), [history]);
  if (!data || data.length < 2) { return (<div className={`${GLASS_CARD} p-6 mb-6 flex flex-col items-center justify-center h-48`}><PieChart className="w-8 h-8 text-slate-300 mb-2" /><span className="text-xs text-slate-400 font-medium">累積更多紀錄後顯示趨勢圖</span></div>); }
  const width = 100; const height = 50; const padding = 5;
  const values = data.map(d => d.netPrincipal);
  const minVal = Math.min(...values); const maxVal = Math.max(...values); const range = maxVal - minVal || 1;
  const points = data.map((d, i) => { const x = padding + (i / (data.length - 1)) * (width - 2 * padding); const y = height - padding - ((d.netPrincipal - minVal) / range) * (height - 2 * padding); return `${x},${y}`; }).join(' ');
  const currentNet = values[values.length - 1]; const prevNet = values.length > 1 ? values[values.length - 2] : currentNet; const growth = currentNet - prevNet;
  return (
    <div className={`${GLASS_CARD} p-6 mb-6 relative overflow-hidden`}><div className="relative z-10 mb-4"><h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">歷史資產淨值趨勢</h2><div className="flex items-baseline gap-2"><div className="text-3xl font-bold text-slate-800 font-mono tracking-tight">${currentNet.toLocaleString()}</div>{growth !== 0 && (<span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${growth > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{growth > 0 ? '+' : ''}{growth.toLocaleString()}</span>)}</div></div><div className="w-full h-32 relative"><svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none"><line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeWidth="0.5" strokeDasharray="2" /><line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f1f5f9" strokeWidth="0.5" strokeDasharray="2" /><polyline points={points} fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />{data.map((d, i) => { const x = padding + (i / (data.length - 1)) * (width - 2 * padding); const y = height - padding - ((d.netPrincipal - minVal) / range) * (height - 2 * padding); return (<circle key={i} cx={x} cy={y} r={i === data.length - 1 ? 2 : 1} className={i === data.length - 1 ? "fill-slate-800" : "fill-white stroke-slate-400 stroke-[0.5]"} />); })}</svg></div><div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1 px-1"><span>{new Date(data[0].date).toLocaleDateString()}</span><span>{new Date(data[data.length - 1].date).toLocaleDateString()}</span></div></div>
  );
};

const CleanSummaryCard = ({ title, value, subValue, icon: Icon, trend, variant = 'slate' }) => {
  const theme = COLOR_VARIANTS[variant] || COLOR_VARIANTS.slate;
  return (<div className={`${GLASS_CARD} p-6 mb-6 ${theme.glow}`}><div className="flex justify-between items-start mb-2"><div className={`p-2 rounded-xl ${theme.iconBg} ${theme.iconText}`}>{Icon ? <Icon className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}</div>{trend && <span className={`bg-slate-50/50 text-slate-500 text-[10px] px-2 py-1 rounded-full font-bold`}>{trend}</span>}</div><div><h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</h2><div className="text-3xl font-bold text-slate-800 font-mono tracking-tight">${value}</div>{subValue && <div className="text-xs text-slate-400 mt-1">{subValue}</div>}</div></div>);
};

const GroupCard = ({ group, colorTheme = 'slate' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = COLOR_VARIANTS[colorTheme] || COLOR_VARIANTS.slate;
  const isOverBudget = group.used > group.budget;
  const remaining = group.budget - group.used;
  return (
    <div className={`${GLASS_CARD} p-5 hover:border-slate-300 transition-all duration-300`}>
      <div className="flex flex-col cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${theme.iconBg} ${theme.iconText}`}>{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
            <h3 className="text-sm font-bold text-slate-700 tracking-tight">{group.name}</h3>
            {isOverBudget && <span className="bg-rose-100 text-rose-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">超支</span>}
          </div>
          <div className="text-right">
            <span className={`text-sm font-mono font-bold ${isOverBudget ? 'text-rose-500' : 'text-slate-800'}`}>${group.used.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 ml-1">/ ${group.budget.toLocaleString()}</span>
          </div>
        </div>
        <div className={`w-full bg-slate-100/50 rounded-full h-1.5 overflow-hidden`}>
          <div className={`h-full transition-all duration-500 ${isOverBudget ? 'bg-rose-400' : theme.bar}`} style={{ width: `${Math.min((group.used / group.budget) * 100, 100)}%` }} />
        </div>
      </div>
      {isExpanded && (<div className="mt-5 pl-2 space-y-3 animate-in slide-in-from-top-1 duration-200 border-t border-slate-100/50 pt-3">{group.items.map((item, idx) => (<div key={idx}><div className="flex justify-between text-xs mb-1.5 font-medium text-slate-500"><span>{item.name}</span><span className="text-slate-400 font-mono">${item.used.toLocaleString()} <span className="text-slate-300">/</span> ${item.budget.toLocaleString()}</span></div><div className={`w-full bg-slate-100/50 rounded-full h-1 overflow-hidden`}><div className={`h-full transition-all duration-500 ${item.used > item.budget ? 'bg-rose-400' : theme.bar}`} style={{ width: `${Math.min((item.used / item.budget) * 100, 100)}%` }} /></div></div>))}</div>)}
    </div>
  );
};

// --- Watchlist Feature (Fixing Fetch Logic) ---
const WatchlistGroup = ({ group, onUpdateStock, onDeleteStock, onDeleteGroup, onAddStock, totalSystemBudget, prices }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newSymbol, setNewSymbol] = useState('');
  const handleAdd = () => { if (newSymbol) { onAddStock(group.id, newSymbol.toUpperCase()); setNewSymbol(''); } };
  // --- Recurring Expenses Manager ---
  const RecurringManagerModal = ({ isOpen, onClose, items, onSave }) => {
    const [localItems, setLocalItems] = useState(items || []);
    const [newItem, setNewItem] = useState({ name: '', amount: '', group: '', category: '', payer: 'myself', active: true });

    useEffect(() => { setLocalItems(items || []); }, [items]);

    const handleAddItem = () => {
      if (!newItem.name || !newItem.amount) return;
      setLocalItems([...localItems, { ...newItem, id: Date.now().toString() }]);
      setNewItem({ name: '', amount: '', group: '', category: '', payer: 'myself', active: true });
    };

    const handleDelete = (id) => setLocalItems(localItems.filter(i => i.id !== id));
    const handleToggle = (id) => setLocalItems(localItems.map(i => i.id === id ? { ...i, active: !i.active } : i));
    const handleSave = () => { onSave(localItems); onClose(); };

    if (!isOpen) return null;
    return (
      <ModalWrapper title="固定支出設定" onClose={onClose}>
        <div className="space-y-4">
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex gap-2">
            <span className="text-amber-600 font-bold shrink-0">💡</span>
            <span className="text-xs text-amber-700">此處設定每月固定支出的項目（如房租、訂閱）。每月首次開啟 App 時，系統會自動詢問是否加入這些支出。</span>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {localItems.map(item => (
              <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border ${item.active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button onClick={() => handleToggle(item.id)} className={`p-1.5 rounded-full ${item.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 truncate">{item.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${item.payer === 'partner' ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>{item.payer === 'partner' ? '佳欣' : '士程'}</span>
                    </div>
                    <span className="text-xs text-slate-400">${Number(item.amount).toLocaleString()} • {item.group}-{item.category}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-rose-400"><X className="w-4 h-4" /></button>
              </div>
            ))}
            {localItems.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">尚無設定項目</div>}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase">新增項目</h4>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="名稱 (如: 房租)" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className={`${GLASS_INPUT} px-3 py-2 text-sm`} />
              <input type="number" placeholder="金額" value={newItem.amount} onChange={e => setNewItem({ ...newItem, amount: e.target.value })} className={`${GLASS_INPUT} px-3 py-2 text-sm`} />
              <input placeholder="群組 (如: 居住)" value={newItem.group} onChange={e => setNewItem({ ...newItem, group: e.target.value })} className={`${GLASS_INPUT} px-3 py-2 text-sm`} />
              <input placeholder="分類 (如: 房租)" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className={`${GLASS_INPUT} px-3 py-2 text-sm`} />
              <div className="col-span-2 flex gap-2">
                <select value={newItem.payer} onChange={e => setNewItem({ ...newItem, payer: e.target.value })} className={`${GLASS_INPUT} px-3 py-2 text-sm flex-1`}>
                  <option value="myself">付款：士程</option>
                  <option value="partner">付款：佳欣</option>
                </select>
                <button onClick={handleAddItem} disabled={!newItem.name || !newItem.amount} className="bg-slate-800 text-white px-4 rounded-xl font-bold flex items-center justify-center gap-1 disabled:opacity-50"><Plus className="w-4 h-4" /> 新增</button>
              </div>
            </div>
          </div>
          <button onClick={handleSave} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-lg mt-4">儲存設定</button>
        </div>
      </ModalWrapper>
    );
  };

  const RecurringConfirmModal = ({ isOpen, onClose, items, onConfirm, onSkip }) => {
    if (!isOpen || items.length === 0) return null;
    const total = items.reduce((sum, i) => sum + Number(i.amount), 0);
    return (
      <ModalWrapper title="本月固定支出確認" onClose={onClose}>
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="text-sm text-slate-500 mb-1">檢測到新的月份，是否加入以下固定支出？</div>
            <div className="text-2xl font-bold text-slate-800 font-mono">${total.toLocaleString()}</div>
          </div>
          <div className="space-y-2 bg-slate-50 p-3 rounded-xl max-h-[40vh] overflow-y-auto">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                <span className="text-slate-600 font-medium">{item.name}</span>
                <span className="font-mono font-bold text-slate-700">${Number(item.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 pt-2">
            <button onClick={onConfirm} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> 確認入帳
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={onClose} className="bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold">
                稍後提醒
              </button>
              <button onClick={onSkip} className="bg-slate-100 text-slate-500 py-3 rounded-xl font-bold text-xs">
                本月不入帳
              </button>
            </div>
          </div>
        </div>
      </ModalWrapper>
    );
  };
  const groupTotalBudget = useMemo(() => group.items.reduce((sum, item) => sum + (Number(item.budget) || 0), 0), [group.items]);
  const groupPercentage = totalSystemBudget > 0 ? (groupTotalBudget / totalSystemBudget) * 100 : 0;
  const theme = COLOR_VARIANTS.indigo;
  return (
    <div className={`${GLASS_CARD} p-5 hover:border-indigo-300 transition-all duration-300 mb-4 ${theme.glow}`}>
      <div className="flex justify-between items-center mb-4"><div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}><div className={`p-1.5 rounded-lg ${theme.iconBg} ${theme.iconText}`}>{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div><div><h3 className="text-sm font-bold text-slate-700 tracking-tight">{group.name}</h3><span className="text-[10px] text-slate-400 font-medium">佔總預算 {groupPercentage.toFixed(1)}%</span></div></div><div className="flex items-center gap-2"><button onClick={(e) => { e.stopPropagation(); onDeleteGroup(); }} className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"><X className="w-3.5 h-3.5" /></button></div></div>
      {isExpanded && (<div className="space-y-4 animate-in slide-in-from-top-1 duration-200 border-t border-slate-100/50 pt-3">{group.items.map((stock, idx) => { const priceData = prices[stock.symbol]; const budget = Number(stock.budget) || 0; const price = priceData ? priceData.price : 0; const shares = price > 0 ? Math.floor(budget / price) : 0; const isUp = priceData?.change >= 0; const stockPercentage = groupTotalBudget > 0 ? (budget / groupTotalBudget) * 100 : 0; return (<div key={idx} className="flex flex-col gap-2 border-b border-slate-100/50 last:border-0 pb-3 last:pb-0"><div className="flex justify-between items-center"><div><div className="flex items-center gap-2"><span className="font-bold text-slate-800 text-base">{stock.symbol}</span><span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded">佔比 {stockPercentage.toFixed(1)}%</span>{priceData && (<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${isUp ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{priceData.change.toFixed(2)}%</span>)}</div><div className="text-xs text-slate-400 font-mono mt-0.5">現價: ${price > 0 ? price.toFixed(2) : '---'}</div></div><button onClick={() => onDeleteStock(group.id, idx)} className="text-slate-300 hover:text-rose-400 p-1"><X className="w-4 h-4" /></button></div><div className="bg-slate-50/50 rounded-xl p-3 flex items-center gap-3"><div className="flex-1"><label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">定投預算 (USD)</label><input type="number" value={stock.budget} onChange={(e) => onUpdateStock(group.id, idx, 'budget', e.target.value)} className="w-full bg-white/50 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 outline-none focus:border-indigo-300" placeholder="500" /></div><div className="text-right"><div className="text-[10px] text-slate-400 font-bold uppercase mb-1">可購股數</div><div className="text-xl font-bold text-indigo-600 font-mono">{shares} <span className="text-xs text-slate-400 font-sans">股</span></div></div></div></div>); })}<div className="mt-2 pt-2 border-t border-slate-100/50"><div className="flex gap-2"><input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="輸入代碼" className={`${GLASS_INPUT} py-2 px-3 text-xs uppercase`} /><button onClick={handleAdd} className="bg-slate-800 text-white px-4 rounded-xl hover:bg-slate-700 font-bold text-xs shadow-lg"><Plus className="w-4 h-4" /></button></div></div></div>)}
    </div>
  );
};

const WatchlistView = ({ user, db, appId, requestConfirmation }) => {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [prices, setPrices] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);

  // FIXED: Robust Fetching
  const fetchAllPrices = useCallback(async (currentGroups) => {
    setLoading(true);
    const allSymbols = new Set();
    currentGroups.forEach(g => g.items.forEach(s => {
      if (s.symbol && s.symbol.trim() !== '') allSymbols.add(s.symbol.trim().toUpperCase());
    }));

    if (allSymbols.size === 0) {
      setLoading(false);
      return;
    }

    const newPrices = {};
    // Process symbols in chunks to avoid overwhelming the network
    const symbolsArray = Array.from(allSymbols);
    for (const symbol of symbolsArray) {
      try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
        if (response.ok) {
          const data = await response.json();
          if (data.c) newPrices[symbol] = { price: data.c, change: data.dp };
        }
      } catch (e) {
        console.warn(`Error fetching ${symbol}:`, e);
      }
      // Tiny delay to prevent rate limiting (optional but safer)
      await new Promise(r => setTimeout(r, 100));
    }

    setPrices(prev => ({ ...prev, ...newPrices }));
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'watchlist_config');
    const unsub = onSnapshot(ref, (s) => {
      if (s.exists()) {
        const data = s.data().groups || [];
        setGroups(data);
        if (data.length > 0) fetchAllPrices(data);
      } else setGroups([]);
    });
    return () => unsub();
  }, [user, fetchAllPrices]);

  const totalSystemBudget = useMemo(() => groups.reduce((acc, group) => acc + group.items.reduce((gAcc, item) => gAcc + (Number(item.budget) || 0), 0), 0), [groups]);
  const saveGroups = async (newGroups) => await setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'watchlist_config'), { groups: newGroups });

  const addGroup = async () => {
    if (!newGroupName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const newGroups = [...groups, { id: Date.now().toString(), name: newGroupName, items: [] }];
      await saveGroups(newGroups);
      setNewGroupName('');
      setIsAddGroupOpen(false);
    } catch (e) { console.error("Error adding group:", e); } finally { setIsSubmitting(false); }
  };

  const deleteGroup = (id) => requestConfirmation({ message: '確定刪除此群組？', onConfirm: async () => { const newGroups = groups.filter(g => g.id !== id); await saveGroups(newGroups); } });
  const addStock = async (groupId, symbol) => { const newGroups = groups.map(g => { if (g.id === groupId) return { ...g, items: [...g.items, { symbol, budget: 0 }] }; return g; }); await saveGroups(newGroups); fetchAllPrices(newGroups); };
  const updateStock = async (groupId, idx, field, value) => { const newGroups = groups.map(g => { if (g.id === groupId) { const newItems = [...g.items]; newItems[idx][field] = value; return { ...g, items: newItems }; } return g; }); await saveGroups(newGroups); };
  const deleteStock = async (groupId, idx) => { const newGroups = groups.map(g => { if (g.id === groupId) { const newItems = g.items.filter((_, i) => i !== idx); return { ...g, items: newItems }; } return g; }); await saveGroups(newGroups); };

  return (
    <div className="pb-24 space-y-6 animate-in fade-in">
      <div className="flex justify-between items-end mb-2 px-2">
        <div><h2 className="text-xl font-bold text-slate-800">投資名單</h2><p className="text-xs text-slate-400 font-mono mt-1">{lastUpdated ? `最後更新: ${lastUpdated.toLocaleTimeString()}` : '更新中...'}</p></div>
        <button onClick={() => fetchAllPrices(groups)} className={`p-2 rounded-xl bg-white shadow-sm border border-slate-100 text-indigo-600 ${loading ? 'animate-spin' : ''}`}><RefreshCw className="w-5 h-5" /></button>
      </div>
      <div className="mb-4">
        {!isAddGroupOpen ? (
          <button onClick={() => setIsAddGroupOpen(true)} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm hover:border-indigo-300 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> 新增追蹤清單</button>
        ) : (
          <div className={`${GLASS_CARD} p-3 flex gap-2 animate-in slide-in-from-top-2 duration-200`}><input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGroup()} placeholder="輸入群組名稱" className={`${GLASS_INPUT} py-2 px-3 text-xs uppercase`} autoFocus /><button onClick={addGroup} disabled={isSubmitting} className="bg-indigo-600 text-white px-4 rounded-xl font-bold shadow-md hover:bg-indigo-700"><Check className="w-4 h-4" /></button><button onClick={() => setIsAddGroupOpen(false)} className="bg-slate-100 text-slate-500 px-3 rounded-xl hover:bg-slate-200"><X className="w-4 h-4" /></button></div>
        )}
      </div>
      <div>{groups.map(g => (<WatchlistGroup key={g.id} group={g} totalSystemBudget={totalSystemBudget} prices={prices} onAddStock={addStock} onUpdateStock={updateStock} onDeleteStock={deleteStock} onDeleteGroup={() => deleteGroup(g.id)} />))}</div>
    </div>
  );
};

const SalaryHistoryCard = ({ history, owner, onAdd, onDelete, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (<div className={`${GLASS_CARD} p-5`}><div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}><div className="flex items-center gap-3"><div className="p-2 bg-slate-100 rounded-xl text-slate-500"><Briefcase className="w-4 h-4" /></div><span className="font-bold text-slate-700 text-sm">薪資成長紀錄</span></div><GlassButton onClick={(e) => { e.stopPropagation(); onAdd(owner); }} variant="ghost" className="px-2 py-1 text-xs">+ 調薪</GlassButton></div>{isExpanded && (<div className="mt-4 space-y-3 pt-3 border-t border-slate-100/50">{history.length === 0 ? (<p className="text-xs text-slate-300 text-center py-2">尚無調薪紀錄</p>) : (history.map((rec, idx) => { const prevRec = history[idx + 1]; let percentChange = null; if (prevRec && prevRec.amount > 0) percentChange = ((rec.amount - prevRec.amount) / prevRec.amount) * 100; return (<div key={rec.id} onClick={() => onEdit && onEdit(rec)} className="flex justify-between items-center text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0 cursor-pointer hover:bg-slate-50 px-1 rounded transition-colors"><div className="flex flex-col"><span className="font-mono font-bold text-slate-700">${Number(rec.amount).toLocaleString()}</span><span className="text-[10px] text-slate-400">{rec.date}</span></div><div className="flex items-center gap-2">{percentChange !== null && (<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${percentChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%</span>)}<button onClick={(e) => { e.stopPropagation(); onDelete(rec.id); }} className="text-slate-300 hover:text-rose-400 p-1"><X className="w-3 h-3" /></button></div></div>); }))}</div>)}{!isExpanded && history.length > 0 && <div className="mt-2 text-xs text-slate-400 pl-11">目前: <span className="font-mono text-slate-600 font-bold">${Number(history[0].amount).toLocaleString()}</span></div>}</div>);
};

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
        <div className="flex items-center gap-3"><span className={`font-mono font-bold text-sm ${yearStats.net >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{yearStats.net > 0 ? '+' : ''}${yearStats.net.toLocaleString()}</span></div>
      </div>
      {isExpanded && (<div className="p-2 space-y-2">{transactions.map(tx => (
        <div key={tx.id} onClick={() => onEdit(tx)} className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all group cursor-pointer">
          <div className="flex gap-3 items-center">
            <div className={`p-2 rounded-xl ${tx.type === 'saving' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{tx.type === 'saving' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}</div>
            <div className="flex flex-col"><span className="font-bold text-slate-700 text-xs">{tx.type === 'saving' ? '存入' : '支出'}</span><span className="text-[10px] text-slate-400 flex items-center gap-1">{tx.date} {tx.note && `• ${tx.note}`}</span></div>
          </div>
          <div className="flex items-center gap-3"><span className={`font-mono font-bold text-sm ${tx.type === 'saving' ? 'text-emerald-600' : 'text-rose-500'}`}>{tx.type === 'saving' ? '+' : '-'}${Number(tx.amount).toLocaleString()}</span><button onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }} className="text-slate-300 hover:text-rose-400 p-1"><X className="w-4 h-4" /></button></div>
        </div>
      ))}</div>)}
    </div>
  );
};

const AssetGroup = ({ title, items, section, groupKey, onUpdate, onAdd, onDelete }) => (
  <div className={`${GLASS_CARD} p-4 mb-4`}>
    <div className="flex justify-between items-center mb-3">
      <h4 className={`font-bold text-slate-700 flex items-center gap-2`}>
        {section === 'assets' ? <Landmark className="w-4 h-4 text-slate-400" /> : <Building2 className="w-4 h-4 text-slate-400" />}
        {title}
      </h4>
      <button onClick={() => onAdd(section, groupKey)} className="p-1.5 bg-slate-100 rounded-lg text-slate-500 hover:bg-slate-200"><Plus className="w-4 h-4" /></button>
    </div>
    <div className="space-y-3">
      {(items || []).map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200 min-w-0">
          <input value={item.name} onChange={(e) => onUpdate(section, groupKey, idx, 'name', e.target.value)} placeholder="項目名稱" className={`${GLASS_INPUT} flex-1 text-base py-2 px-3`} />
          <div className="relative w-28 min-w-0">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
            <input type="number" value={item.amount} onChange={(e) => onUpdate(section, groupKey, idx, 'amount', e.target.value)} className={`${GLASS_INPUT} w-full text-base py-2 pl-5 pr-2 font-mono text-right text-slate-700 font-bold`} />
          </div>
          <button onClick={() => onDelete(section, groupKey, idx)} className="text-slate-300 hover:text-rose-400"><X className="w-3 h-3" /></button>
        </div>
      ))}
    </div>
    <div className="mt-3 pt-2 border-t border-slate-100/50 flex justify-between text-xs font-bold text-slate-600">
      <span>小計</span>
      <span>${(items || []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0).toLocaleString()}</span>
    </div>
  </div>
);

const StockGoalCard = ({ yearData, prevYearTotal, onUpdate }) => {
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
    <div className={`${GLASS_CARD} p-5 mb-4 relative overflow-hidden`}>
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
            <input type="number" value={yearData.roi} onChange={(e) => onUpdate(yearData.id, 'roi', e.target.value)} className="w-12 text-right font-bold text-slate-800 border-b border-slate-200 focus:border-slate-500 outline-none bg-transparent" />
            <span className="text-sm font-bold text-slate-600">%</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4 pl-3">
        <div><label className="text-[10px] text-slate-400 uppercase font-bold">Firstrade (美金)</label><input type="number" value={yearData.firstrade} onChange={(e) => onUpdate(yearData.id, 'firstrade', e.target.value)} className="w-full font-mono font-bold text-slate-700 border-b border-slate-100 focus:border-emerald-500 outline-none py-1 bg-transparent" placeholder="0" /></div>
        <div><label className="text-[10px] text-slate-400 uppercase font-bold">IB (美金)</label><input type="number" value={yearData.ib} onChange={(e) => onUpdate(yearData.id, 'ib', e.target.value)} className="w-full font-mono font-bold text-slate-700 border-b border-slate-100 focus:border-emerald-500 outline-none py-1 bg-transparent" placeholder="0" /></div>
        <div className="col-span-2 relative"><label className="text-[10px] text-amber-400 uppercase font-bold">提領/調節 (美金)</label><input type="number" value={yearData.withdrawal} onChange={(e) => onUpdate(yearData.id, 'withdrawal', e.target.value)} className="w-full font-mono font-bold text-slate-700 border-b border-amber-100 focus:border-amber-400 outline-none py-1 bg-transparent" placeholder="0" /></div>
      </div>
      <div className="bg-slate-50/50 rounded-xl p-3 pl-4 flex justify-between items-center">
        <div><div className="text-[10px] text-slate-400 mb-0.5 font-bold uppercase">目標金額</div><div className="font-bold text-slate-500 text-sm font-mono">${Math.round(targetAmount).toLocaleString()}</div></div>
        <div className="text-right"><div className="text-[10px] text-slate-400 mb-0.5 font-bold uppercase">實際總資產</div><div className={`font-bold text-lg font-mono ${isAchieved ? 'text-emerald-600' : 'text-slate-700'}`}>${Math.round(currentTotal).toLocaleString()}</div><div className={`text-[10px] font-medium ${isAchieved ? 'text-emerald-500' : 'text-slate-400'}`}>誤差: {diff > 0 ? '+' : ''}{Math.round(diff).toLocaleString()} ({errorPercent.toFixed(2)}%)</div></div>
      </div>
    </div >
  );
};

const ExchangeItem = ({ item, onDelete }) => (
  <div className={`${GLASS_CARD} p-4 flex justify-between items-center group`}>
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg font-bold text-xs bg-slate-50 text-slate-600`}>
        {item.account === 'FT' ? 'FT' : 'IB'}
      </div>
      <div>
        <div className="text-sm font-bold text-slate-700">
          買入 ${Number(item.usdAmount).toLocaleString()}
        </div>
        <div className="text-[10px] text-slate-400">
          {formatDetailedDate(item.date)} @ {item.rate}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-xs font-mono text-slate-500">NT$ {Math.round(item.usdAmount * item.rate).toLocaleString()}</div>
      </div>
      <button onClick={() => onDelete(item.id)} className="text-slate-300 hover:text-rose-400 transition-all"><X className="w-4 h-4" /></button>
    </div>
  </div>
);

// 統一的列表元件
const StandardList = ({ title, items, onDelete, onAdd, onEdit, icon: Icon, type, totalLabel, totalValue, itemRenderer, variant = 'slate', isCollapsible = false, defaultExpanded = true }) => {
  const theme = COLOR_VARIANTS[variant] || COLOR_VARIANTS.slate;
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`${GLASS_CARD} overflow-hidden p-0 mb-6 ${theme.glow}`}>
      <div
        className={`p-5 flex justify-between items-center ${isCollapsible ? 'cursor-pointer hover:bg-slate-50/50 transition-colors' : ''} ${!isExpanded ? 'border-b-0' : 'border-b border-slate-50'}`}
        onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${theme.iconBg} ${theme.iconText}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-700">{title}</h3>
            {!isExpanded && totalLabel && (
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{totalLabel}: </span>
                <span className="font-mono font-bold text-slate-600">${totalValue.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton onClick={(e) => { e.stopPropagation(); onAdd(type); }} className="text-xs px-2 py-1"><Plus className="w-3 h-3" /> 新增</GlassButton>
          {isCollapsible && (isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-3">
            {items.length === 0 ? <p className="text-center text-xs text-slate-300 py-4">無紀錄</p> : items.map((item) => (
              <div key={item.id} onClick={() => onEdit && onEdit(item)} className={`border-b border-slate-100 last:border-0 pb-3 last:pb-0 group relative pr-8 ${onEdit ? 'cursor-pointer hover:bg-slate-50/50 rounded-lg p-2 transition-colors' : ''}`}>
                {itemRenderer(item)}
                <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="absolute top-1/2 -translate-y-1/2 right-2 z-10 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {totalLabel && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{totalLabel}</span>
              <span className="text-xl font-bold text-slate-800 font-mono">${totalValue.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
            <div className="text-lg font-bold text-slate-800 font-mono">${currentStatus?.amount.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400">利率 {currentStatus?.rate}%</div>
          </div>
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-400 mb-1">累計已還款</div>
            <div className="text-lg font-bold text-slate-800 font-mono">${schedule.filter(r => r.isPaid).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      {!expandedYear && (
        <div className="flex justify-between items-center px-2 pb-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-bold">下期金額</span>
            <span className="font-mono font-bold text-slate-600 text-sm">${currentStatus?.amount.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 uppercase font-bold">累計已還</span>
            <span className="font-mono font-bold text-slate-600 text-sm">${schedule.filter(r => r.isPaid).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</span>
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
                    <div key={row.id} className={`grid grid-cols-5 text-xs px-3 py-2 border-b border-slate-100 last:border-0 items-center ${row.isPaid ? 'bg-emerald-50/30' : 'hover:bg-slate-50/30'}`}>
                      <span>{row.isPaid ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <span className="w-3 h-3 rounded-full border border-slate-200 block"></span>}</span>
                      <span className={`font-mono ${row.isPaid ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>{row.date.getMonth() + 1}月</span>
                      <span className="text-center text-slate-400">#{row.id}</span>
                      <span className="text-right font-bold font-mono ${row.isPaid ? 'text-emerald-700' : 'text-slate-700'}">${row.amount.toLocaleString()}</span>
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

const PersonColumn = ({ name, owner, incomes, total, history, icon: Icon, onAddSalary, onDeleteSalary, onEditSalary, onAddIncome, onDeleteIncome, variant = 'slate' }) => {
  const theme = COLOR_VARIANTS[variant] || COLOR_VARIANTS.slate;
  return (
    <div className={`flex flex-col gap-4 w-full`}>
      <div className={`${GLASS_CARD} p-5 relative overflow-hidden`}>
        <div className={`absolute top-0 right-0 w-24 h-24 ${theme.bg} rounded-full -mr-10 -mt-10 blur-xl opacity-60`}></div>
        <div className="flex justify-between items-start mb-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme.iconBg} ${theme.iconText}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-700">{name}</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-800 tracking-tight font-mono mb-1 relative z-10">${total.toLocaleString()}</div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider relative z-10">年度累計收入</div>
      </div>
      <SalaryHistoryCard history={history} owner={owner} onAdd={onAddSalary} onDelete={onDeleteSalary} onEdit={onEditSalary} />
      <div className={`${GLASS_CARD} p-5`}>
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-bold text-slate-700">收入明細 </h4>
          <GlassButton onClick={() => onAddIncome(owner)} className="px-2 py-1 text-xs" variant="ghost">新增</GlassButton>
        </div>
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
          {incomes.map(inc => (
            <div key={inc.id} onClick={() => onAddIncome(owner, inc)} className="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl group border border-transparent hover:border-slate-200 transition-all cursor-pointer">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-700">{inc.category}</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  {inc.date}
                  {inc.note && <span className="text-slate-500">• {inc.note}</span>}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-emerald-600">+${Number(inc.amount).toLocaleString()}</span>
                <button onClick={(e) => { e.stopPropagation(); onDeleteIncome(inc.id); }} className="text-slate-300 hover:text-rose-400 p-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {incomes.length === 0 && <div className="text-center text-xs text-slate-300 py-4">尚無收入紀錄</div>}
        </div>
      </div>
    </div>
  );
};

// --- 4. Sub-Views ---


// --- 6. View Components (Top Layer) ---

const HomeView = ({ monthlyStats, annualStats, yearlyTotalStats }) => {
  // Use passed yearly stats for the summary card if available, otherwise fallback (for safety)
  const totalAnnualBudget = yearlyTotalStats ? yearlyTotalStats.totalBudget : (monthlyStats.totalBudget * 12 + annualStats.totalBudget);
  const totalAnnualUsed = yearlyTotalStats ? yearlyTotalStats.totalUsed : (monthlyStats.totalUsed + annualStats.totalUsed);
  const totalRemaining = totalAnnualBudget - totalAnnualUsed;
  const isOverBudget = totalRemaining < 0;

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      {/* Annual Summary Card */}
      <div className={`${GLASS_CARD} p-6 border-l-4 ${isOverBudget ? 'border-rose-400' : 'border-emerald-400'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-xl ${isOverBudget ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">年度總預算</h2>
            <div className="text-xl sm:text-2xl font-bold text-slate-800 font-mono break-all line-clamp-1">${totalAnnualBudget.toLocaleString()}</div>
          </div>
        </div>
        <div className="flex flex-row gap-4 w-full">
          <div className="bg-slate-50/50 rounded-xl p-3 flex-1 overflow-hidden">
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">已花費</div>
            <div className="text-base sm:text-lg font-bold text-slate-700 font-mono truncate">${totalAnnualUsed.toLocaleString()}</div>
          </div>
          <div className={`rounded-xl p-3 flex-1 overflow-hidden ${isOverBudget ? 'bg-rose-50/50' : 'bg-emerald-50/50'}`}>
            <div className={`text-[10px] font-bold uppercase mb-1 ${isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>{isOverBudget ? '超支' : '剩餘'}</div>
            <div className={`text-base sm:text-lg font-bold font-mono truncate ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>{isOverBudget ? '-' : ''}${Math.abs(totalRemaining).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><Calendar className="w-4 h-4" /></div>
          <div><h2 className="text-lg font-bold text-slate-800 leading-tight">月度預算</h2><p className="text-xs text-slate-400 font-bold tracking-wide uppercase">經常性支出</p></div>
        </div>
        <div className={`${GLASS_CARD} p-5 mb-4 relative overflow-hidden border-l-4 border-slate-400`}>
          <BudgetProgressBar current={monthlyStats.totalUsed} total={monthlyStats.totalBudget} label="本月總剩餘" colorTheme="slate" />
        </div>
        <div className="space-y-3">{monthlyStats.groups.map(g => (<GroupCard key={g.name} group={g} colorTheme="slate" />))}</div>
      </section>
      <section>
        <div className="flex items-center gap-2 mb-4 px-1 mt-10">
          <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600"><Target className="w-4 h-4" /></div>
          <div><h2 className="text-lg font-bold text-slate-800 leading-tight">年度預算</h2><p className="text-xs text-slate-400 font-bold tracking-wide uppercase">年度特別支出</p></div>
        </div>

        {/* Annual Summary - Same design as monthly */}
        <div className={`${GLASS_CARD} p-5 mb-4 relative overflow-hidden border-l-4 border-stone-400`}>
          <BudgetProgressBar
            key={annualStats.totalBudget}
            current={annualStats.totalUsed}
            total={annualStats.totalBudget}
            label="本年總剩餘"
            colorTheme="stone"
          />
        </div>
        <div className="space-y-3">{annualStats.groups.map(g => (<GroupCard key={g.name} group={g} colorTheme="stone" />))}</div>
      </section>
    </div>
  );
};

const MortgageView = ({ mortgageExpenses, mortgageAnalysis, mortgageFunding, deleteMortgageExp, deleteMortgageAnalysis, deleteMortgageFunding, setMortgageExpType, setIsAddMortgageExpModalOpen, setIsAddMortgageAnalysisModalOpen, setIsAddMortgageFundingModalOpen, onEditExp, onEditAnalysis, onEditFunding }) => {
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

      const newPrices = {};
      // Use sequential fetching to respect rate limits more reliably
      for (const symbol of symbols) {
        try {
          const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
          if (res.ok) {
            const data = await res.json();
            if (data.c) newPrices[symbol] = data.c;
          }
        } catch (e) { console.warn(e); }
        // Tiny delay
        await new Promise(r => setTimeout(r, 50));
      }
      setPrices(newPrices);
    };
    fetchFundingPrices();
  }, [mortgageFunding]);

  return (
    <div className="pb-24 space-y-6 animate-in fade-in duration-500">
      <StandardList
        title="頭期雜支與進程"
        items={downPaymentExp}
        onDelete={deleteMortgageExp}
        onAdd={(type) => { setMortgageExpType(type); setIsAddMortgageExpModalOpen(true); }}
        onEdit={(item) => onEditExp(item)}
        type="down_payment"
        icon={ClipboardList}
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
              <span className="font-mono font-bold text-slate-700">${Number(item.amount).toLocaleString()}</span>
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
            <span className="font-mono font-bold text-slate-800">${Number(item.amount).toLocaleString()}</span>
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
                <span className="font-mono font-bold text-emerald-600">${itemTotal.toLocaleString()}</span>
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
              <span className="font-mono font-bold text-slate-700">${Number(item.amount).toLocaleString()}</span>
            </div>
          </div>
        )}
      />
    </div>
  );
};

const CalendarView = ({ transactions, selectedDate, setSelectedDate, deleteTransaction, onEdit, onAddExpense }) => {
  const [viewDate, setViewDate] = useState(selectedDate);
  const [selectedDay, setSelectedDay] = useState(null);
  useEffect(() => setViewDate(selectedDate), [selectedDate]);

  // Reset selectedDay when month changes
  const handleMonthChange = (direction) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(viewDate.getMonth() + direction);
    setViewDate(newDate);
    setSelectedDay(null); // Reset selection when changing months
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
    calendarCells.push(
      <div key={day} onClick={() => setSelectedDay(day)} className={`h-24 border-t border-r border-slate-100/50 p-1 flex flex-col justify-between transition-colors cursor-pointer relative ${isSelected ? 'bg-slate-50/50 shadow-inner' : 'bg-white/30'} ${day % 7 === 0 ? 'border-r-0' : ''}`}>
        <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>{day}</span>
        {dayTotal > 0 && (<div className="mb-1 flex flex-col items-end px-1 w-full"><span className="text-[10px] text-slate-400 font-medium">總計</span><span className={`text-[10px] font-bold truncate w-full text-right ${dayTrans.some(t => t.type === 'annual') ? 'text-amber-600' : 'text-slate-600'}`}>${dayTotal.toLocaleString()}</span></div>)}
        {isSelected && <div className="absolute inset-1 border-2 border-slate-400/50 rounded-lg pointer-events-none"></div>}
      </div>
    );
  }
  const selectedDateStr = selectedDay ? toLocalISOString(new Date(viewDate.getFullYear(), viewDate.getMonth(), selectedDay)) : null;
  const selectedTrans = selectedDateStr ? transactions.filter(t => t.date === selectedDateStr) : [];
  return (
    <div className="pb-24 animate-in fade-in duration-300 relative">
      <div className="flex justify-between items-center mb-4 px-2"><h2 className="text-xl font-bold text-slate-800">{viewDate.toLocaleString('zh-TW', { month: 'long', year: 'numeric' })}</h2><div className="flex gap-2"><button onClick={() => handleMonthChange(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600"><ChevronLeft className="w-5 h-5" /></button><button onClick={() => handleMonthChange(1)} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600"><ChevronRight className="w-5 h-5" /></button></div></div>
      <div className={`${GLASS_CARD} p-0 border border-slate-100`}>
        <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100 rounded-t-3xl overflow-hidden">{['日', '一', '二', '三', '四', '五', '六'].map(d => (<div key={d} className="py-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{d}</div>))}</div>
        <div className="grid grid-cols-7 rounded-b-3xl overflow-hidden">{calendarCells}</div>
      </div>
      {/* Redesigned Daily Detail Panel */}
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
                <div className="text-lg font-bold font-mono text-slate-800">${selectedTrans.reduce((s, t) => s + Number(t.amount), 0).toLocaleString()}</div>
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
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${t.payer === 'partner' ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
                              {t.payer === 'partner' ? '佳欣' : '士程'}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-slate-400 mt-0.5">{t.group} / {t.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-mono font-medium text-slate-600">-${Number(t.amount).toLocaleString()}</span>
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
          </div>
        </div>
      )}
      {/* Add expense FAB */}
      {/* Add expense FAB - Fixed position */}
      {onAddExpense && <button onClick={onAddExpense} className="fixed bottom-6 right-6 w-14 h-14 bg-slate-800 rounded-full shadow-2xl shadow-slate-400/50 flex items-center justify-center text-white hover:bg-slate-900 hover:scale-105 transition-all active:scale-95 z-50"><Plus className="w-6 h-6" /></button>}
    </div>
  );
};

const IncomeView = ({ incomes, salaryHistory, onAddSalary, onDeleteSalary, onDeleteIncome, onAddIncome, onEditSalary, selectedDate }) => {
  const currentYear = selectedDate.getFullYear();
  const yearlyIncomes = incomes.filter(i => new Date(i.date).getFullYear() === currentYear);
  const myselfIncomes = yearlyIncomes.filter(i => i.owner === 'myself');
  const partnerIncomes = yearlyIncomes.filter(i => i.owner === 'partner');
  const myselfTotal = myselfIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const partnerTotal = partnerIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const myselfHistory = salaryHistory.filter(s => s.owner === 'myself').sort((a, b) => new Date(b.date) - new Date(a.date));
  const partnerHistory = salaryHistory.filter(s => s.owner === 'partner').sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <CleanSummaryCard title="年度總收入" value={(myselfTotal + partnerTotal).toLocaleString()} subValue={`${currentYear}年度`} icon={Wallet} />
      <div className="flex flex-col gap-6">
        <PersonColumn name="士程" owner="myself" incomes={myselfIncomes} total={myselfTotal} history={myselfHistory} icon={User} onAddSalary={onAddSalary} onDeleteSalary={onDeleteSalary} onDeleteIncome={onDeleteIncome} onAddIncome={onAddIncome} onEditSalary={onEditSalary} variant="blue" />
        <PersonColumn name="佳欣" owner="partner" incomes={partnerIncomes} total={partnerTotal} history={partnerHistory} icon={Heart} onAddSalary={onAddSalary} onDeleteSalary={onDeleteSalary} onDeleteIncome={onDeleteIncome} onAddIncome={onAddIncome} onEditSalary={onEditSalary} variant="rose" />
      </div>
    </div>
  );
};

const PartnerView = ({ partnerTransactions, onDelete, onAdd, onEdit }) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const groupedTransactions = useMemo(() => { const groups = {}; partnerTransactions.forEach(tx => { const year = new Date(tx.date).getFullYear(); if (!groups[year]) groups[year] = []; groups[year].push(tx); }); return Object.entries(groups).sort((a, b) => b[0] - a[0]); }, [partnerTransactions]);
  const totalSavings = partnerTransactions.filter(t => t.type === 'saving').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenses = partnerTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalSavings - totalExpenses;
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

const VisualizationView = ({ transactions }) => {
  const [baseYear, setBaseYear] = useState(new Date().getFullYear());
  const [compareYear, setCompareYear] = useState(new Date().getFullYear() - 1);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null); // Drill-down state: month
  const [selectedCategory, setSelectedCategory] = useState(null); // Drill-down state: category

  const generateYearOptions = () => { const currentY = new Date().getFullYear(); const startY = 2020; const years = []; for (let y = currentY + 1; y >= startY; y--) { years.push(y); } return years; };
  const availableYears = useMemo(() => generateYearOptions(), []);

  const getMonthlyData = (year) => { const months = Array(12).fill(0); transactions.forEach(t => { const d = new Date(t.date); if (d.getFullYear() === year) { months[d.getMonth()] += Number(t.amount); } }); return months; };
  const baseData = useMemo(() => getMonthlyData(baseYear), [transactions, baseYear]);
  const compareData = useMemo(() => getMonthlyData(compareYear), [transactions, compareYear]);
  const maxVal = Math.max(...baseData, ...compareData, 1);

  // Filter breakdown data based on selected month or full year
  const breakdownData = useMemo(() => {
    if (isCompareMode) return [];
    const stats = {};
    let total = 0;
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (d.getFullYear() === baseYear) {
        if (selectedMonth !== null && d.getMonth() !== selectedMonth) return; // Filter by month if selected
        const amount = Number(t.amount);
        stats[t.category] = (stats[t.category] || 0) + amount;
        total += amount;
      }
    });
    return Object.entries(stats).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value, percent: total > 0 ? (value / total) * 100 : 0 }));
  }, [transactions, baseYear, isCompareMode, selectedMonth]);

  const monthlyDiffs = useMemo(() => { if (!isCompareMode) return []; return baseData.map((val, idx) => ({ month: idx + 1, base: val, compare: compareData[idx], diff: val - compareData[idx] })); }, [baseData, compareData, isCompareMode]);

  // Get detailed transactions for selected month/category
  const detailedTransactions = useMemo(() => {
    if (selectedMonth === null && selectedCategory === null) return [];
    return transactions.filter(t => {
      const d = new Date(t.date);
      const matchYear = d.getFullYear() === baseYear;
      const matchMonth = selectedMonth !== null ? d.getMonth() === selectedMonth : true;
      const matchCategory = selectedCategory !== null ? t.category === selectedCategory : true;
      return matchYear && matchMonth && matchCategory;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, baseYear, selectedMonth, selectedCategory]);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">{isCompareMode ? '年度支出比較' : '年度支出分析'}</h2>
          <button onClick={() => { setIsCompareMode(!isCompareMode); setSelectedMonth(null); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isCompareMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {isCompareMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />} 比較模式
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">{isCompareMode ? '主年份' : '選擇年份'}</label>
            <select value={baseYear} onChange={(e) => { setBaseYear(Number(e.target.value)); setSelectedMonth(null); setSelectedCategory(null); }} className={`w-full ${GLASS_INPUT} px-3 py-2 font-bold text-slate-700`}>{availableYears.map(y => (<option key={y} value={y}>{y}</option>))}</select>
          </div>
          {isCompareMode && (<div className="flex-1 animate-in slide-in-from-right-2 duration-200"><label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">對比年份</label><select value={compareYear} onChange={(e) => setCompareYear(Number(e.target.value))} className={`w-full ${GLASS_INPUT} px-3 py-2 font-bold text-slate-500`}>{availableYears.map(y => (<option key={y} value={y}>{y}</option>))}</select></div>)}
        </div>

        <div className="h-64 flex items-end justify-between gap-0.5 mt-4 relative overflow-x-auto">
          {/* Background Grid */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div className="border-t border-dashed border-slate-100 w-full h-px"></div>
            <div className="border-t border-dashed border-slate-100 w-full h-px"></div>
            <div className="border-t border-dashed border-slate-100 w-full h-px"></div>
            <div className="border-t border-slate-200 w-full h-px"></div>
          </div>

          {baseData.map((val, idx) => (
            <div
              key={idx}
              onClick={() => { if (!isCompareMode) { setSelectedMonth(selectedMonth === idx ? null : idx); setSelectedCategory(null); } }}
              className={`flex-1 flex flex-col justify-end items-center h-full z-10 group relative ${!isCompareMode ? 'cursor-pointer' : ''}`}
            >
              {/* Value Label moved above the bar */}
              <div className="mb-2 text-[10px] font-bold text-slate-500 transition-all group-hover:scale-110 group-hover:text-slate-800">
                {isCompareMode ? (monthlyDiffs[idx]?.diff !== 0 && (
                  <span className={`flex items-center gap-0.5 ${monthlyDiffs[idx]?.diff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {monthlyDiffs[idx]?.diff > 0 ? '+' : ''}{Math.round(monthlyDiffs[idx]?.diff / 1000)}k
                  </span>
                )) : (
                  <span>{val > 0 ? `${Math.round(val / 1000)}k` : ''}</span>
                )}
              </div>

              {/* Bar */}
              <div className="w-full max-w-[20px] bg-slate-100 rounded-t-lg relative overflow-visible transition-all duration-500" style={{ height: `${maxVal > 0 ? (val / maxVal) * 100 : 0}%` }}>
                <div className={`absolute inset-x-0 bottom-0 top-0 rounded-t-lg transition-all duration-300 ${!isCompareMode && selectedMonth === idx ? 'bg-slate-800 shadow-lg shadow-slate-300' : 'bg-slate-300 group-hover:bg-slate-400'}`}></div>
                {isCompareMode && (
                  <div className="absolute inset-x-0 bottom-0 bg-slate-800/20 rounded-t-lg border-t border-slate-500/30" style={{ height: `${maxVal > 0 ? (compareData[idx] / maxVal) * 100 : 0}%` }}></div>
                )}
              </div>

              {/* X Axis Label */}
              <div className={`mt-2 text-[9px] font-bold transition-colors whitespace-nowrap ${selectedMonth === idx ? 'text-slate-800 scale-110' : 'text-slate-400 group-hover:text-slate-600'}`}>{idx + 1}</div>
            </div>
          ))}
        </div>
      </Card>

      {isCompareMode ? (
        <Card>
          <h3 className="text-sm font-bold text-slate-700 mb-4">每月差異分析 ({baseYear} vs {compareYear})</h3>
          <div className="space-y-3">
            {monthlyDiffs.map((item) => (
              <div key={item.month} className="flex justify-between items-center text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                <span className="text-slate-500 w-8">{item.month}月</span>
                <div className="flex-1 px-4 text-xs text-gray-400 text-center">${item.base.toLocaleString()} vs ${item.compare.toLocaleString()}</div>
                <span className={`font-mono font-bold ${item.diff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{item.diff > 0 ? '+' : ''}{item.diff.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 rounded-lg"><PieChart className="w-4 h-4 text-slate-500" /></div>
                {selectedMonth !== null ? `${baseYear}年 ${selectedMonth + 1}月 支出組成` : `${baseYear} 年度支出組成`}
                {(selectedMonth !== null || selectedCategory !== null) && <button onClick={(e) => { e.stopPropagation(); setSelectedMonth(null); setSelectedCategory(null); }} className="text-[10px] bg-slate-100 px-2 py-1 rounded-full text-slate-500 hover:bg-slate-200">重設篩選</button>}
              </h3>
            </div>
            <div className="space-y-4">
              {breakdownData.length > 0 ? breakdownData.map((item) => (
                <div key={item.name} onClick={() => setSelectedCategory(selectedCategory === item.name ? null : item.name)} className={`cursor-pointer transition-all hover:bg-slate-50 p-2 rounded-xl border border-transparent ${selectedCategory === item.name ? 'bg-slate-50 border-slate-200' : ''}`}>
                  <div className="flex justify-between items-end mb-1 text-sm">
                    <span className="text-slate-600 font-medium">{item.name}</span>
                    <span className="font-bold text-slate-800">${item.value.toLocaleString()} <span className="text-xs text-slate-400 font-normal">({item.percent.toFixed(1)}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-slate-700 rounded-full transition-all duration-500" style={{ width: `${item.percent}%` }}></div>
                  </div>
                </div>
              )) : (
                <div className="text-center text-slate-400 py-6 text-sm">該時段尚無支出資料</div>
              )}
            </div>
          </Card>

          {(selectedMonth !== null || selectedCategory !== null) && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-sm font-bold text-slate-500 mb-3 px-2">詳細明細 </h3>
              <div className="space-y-3">
                {detailedTransactions.map(t => (
                  <div key={t.id} onClick={() => { setNewTrans({ ...t, amount: t.amount }); setEditingId(t.id); setIsAddTxModalOpen(true); }} className={`${GLASS_CARD} p-4 flex justify-between items-center cursor-pointer hover:bg-white/60 transition-colors`}>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{t.category}</span>
                      <span className="text-xs text-slate-400">{formatDetailedDate(t.date)} {t.note && `• ${t.note}`}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-800">${Number(t.amount).toLocaleString()}</span>
                      {/* Delete removed in Analysis View */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const PrincipalView = ({ user, db, appId, requestDelete, requestConfirmation }) => { const [config, setConfig] = useState(DEFAULT_PRINCIPAL_CONFIG); const [history, setHistory] = useState([]); const [loading, setLoading] = useState(true); const [snapshotDate, setSnapshotDate] = useState(getTodayString()); useEffect(() => { if (!user) return; const configRef = doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'principal_config'); onSnapshot(configRef, (s) => s.exists() ? setConfig(s.data()) : setDoc(configRef, DEFAULT_PRINCIPAL_CONFIG)); const historyRef = collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'principal_history'); const q = query(historyRef, orderBy('date', 'desc')); onSnapshot(q, (s) => { setHistory(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }); }, [user]); const updateItem = (section, group, idx, field, val) => { const newConfig = JSON.parse(JSON.stringify(config)); newConfig[section][group][idx][field] = field === 'amount' ? Number(val) : val; setConfig(newConfig); setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'principal_config'), newConfig); }; const addItem = (section, group) => { const newConfig = JSON.parse(JSON.stringify(config)); if (!newConfig[section][group]) newConfig[section][group] = []; newConfig[section][group].push({ name: '', amount: 0 }); setConfig(newConfig); setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'principal_config'), newConfig); }; const deleteItem = (section, group, idx) => { requestConfirmation({ message: '確定移除此項目？', onConfirm: () => { const newConfig = JSON.parse(JSON.stringify(config)); newConfig[section][group] = newConfig[section][group].filter((_, i) => i !== idx); setConfig(newConfig); setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'principal_config'), newConfig); } }); }; const handleAddSnapshot = () => { requestConfirmation({ message: `確定結算 ${snapshotDate} 的金額？`, title: '結算確認', onConfirm: async () => { const ta = (config.assets.bank || []).reduce((s, i) => s + Number(i.amount), 0) + (config.assets.invest || []).reduce((s, i) => s + Number(i.amount), 0); const tl = (config.liabilities.encumbrance || []).reduce((s, i) => s + Number(i.amount), 0); await addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'principal_history'), { date: new Date(snapshotDate).toISOString(), netPrincipal: ta - tl, details: config, createdAt: serverTimestamp() }); } }); }; const handleDeleteHistory = (id) => requestDelete('刪除此紀錄？', () => deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'principal_history', id))); return (<div className="pb-24 space-y-6 animate-in fade-in"><PrincipalTrendChart history={history} /><div className="flex flex-col gap-4"><div><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">存款組成 (Assets)</h3><AssetGroup title="銀行帳戶" items={config.assets.bank} section="assets" groupKey="bank" onUpdate={updateItem} onAdd={addItem} onDelete={deleteItem} /><AssetGroup title="投資項目" items={config.assets.invest} section="assets" groupKey="invest" onUpdate={updateItem} onAdd={addItem} onDelete={deleteItem} /></div><div><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">負債組成 (Liabilities)</h3><AssetGroup title="房價圈存" items={config.liabilities.encumbrance} section="liabilities" groupKey="encumbrance" onUpdate={updateItem} onAdd={addItem} onDelete={deleteItem} /></div></div><div className={`${GLASS_CARD} p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end`}><InputField label="結算日期" type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} className="w-full sm:flex-1" /><GlassButton onClick={handleAddSnapshot} className="w-full sm:flex-1 py-4 rounded-xl sm:h-[58px]"><Save className="w-5 h-5" /> 結算本期金額</GlassButton></div><div><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2"><Clock className="w-3 h-3" /> 歷次結算紀錄</h3><div className="space-y-3">{history.map(rec => (<div key={rec.id} className="bg-white/60 p-4 rounded-xl border border-slate-100 flex justify-between items-center backdrop-blur-sm"><div><div className="font-bold text-slate-800">${rec.netPrincipal.toLocaleString()}</div><div className="text-[10px] text-slate-400">{new Date(rec.date).toLocaleDateString()}</div></div><button onClick={() => handleDeleteHistory(rec.id)}><X className="w-4 h-4 text-slate-300 hover:text-rose-400" /></button></div>))}</div></div></div>); };

const StockGoalView = ({ goals, exchanges, onUpdate, onAddYear, onDeleteExchange, onAddExchangeClick }) => {
  const [activeTab, setActiveTab] = useState('goals');
  const sortedGoals = [...goals].sort((a, b) => b.year - a.year);
  const getEffectiveTotal = (g) => (Number(g?.firstrade) || 0) + (Number(g?.ib) || 0) + (Number(g?.withdrawal) || 0);
  const getActualTotal = (g) => (Number(g?.firstrade) || 0) + (Number(g?.ib) || 0);

  // 計算換匯總結
  const { totalUSD, totalTWD } = exchanges.reduce((acc, curr) => {
    const usd = Number(curr.usdAmount);
    const rate = Number(curr.rate);
    return { totalUSD: acc.totalUSD + usd, totalTWD: acc.totalTWD + (usd * rate) };
  }, { totalUSD: 0, totalTWD: 0 });
  const avgRate = totalUSD > 0 ? (totalTWD / totalUSD) : 0;

  return (
    <div className="pb-24 animate-in fade-in">
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
        <button onClick={() => setActiveTab('goals')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'goals' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>目標規劃</button>
        <button onClick={() => setActiveTab('exchange')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'exchange' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>換匯紀錄</button>
      </div>
      {activeTab === 'goals' ? (
        <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
          <div className="flex justify-end mb-2"><GlassButton onClick={onAddYear}><Plus className="w-3 h-3" /> 新增年份</GlassButton></div>
          {sortedGoals.length === 0 ? <div className="text-center text-slate-400 py-10">尚無資料 (從2022開始)</div> : sortedGoals.map((goal, index) => { const prevGoal = sortedGoals[index + 1]; const prevTotal = prevGoal ? getActualTotal(prevGoal) : 0; return <StockGoalCard key={goal.id} yearData={goal} prevYearTotal={prevTotal} onUpdate={onUpdate} />; })}
        </div>
      ) : (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
          <CleanSummaryCard title="累計買入美金" value={totalUSD.toLocaleString()} subValue={`平均匯率: ${avgRate.toFixed(4)}`} icon={ArrowRightLeft} />
          <div className="flex justify-between items-center px-1 mb-2">
            <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> 交易明細</h3>
            <GlassButton onClick={onAddExchangeClick}><Plus className="w-3 h-3" /> 新增換匯</GlassButton>
          </div>
          <div className="space-y-2">
            {exchanges.length === 0 ? <div className="text-center text-slate-400 py-10">尚無換匯紀錄</div> : exchanges.map(item => (<ExchangeItem key={item.id} item={item} onDelete={onDeleteExchange} />))}
          </div>
        </div>
      )}
    </div>
  );
};

const GroupSettingsEditor = ({ title, groups, onSave, idPrefix }) => {
  const [localGroups, setLocalGroups] = useState(groups);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingSelection, setEditingSelection] = useState(null); // { gIdx, iIdx }

  useEffect(() => setLocalGroups(groups), [groups]);

  const handleSaveWrapper = async () => { setIsSaving(true); await onSave(localGroups); setTimeout(() => setIsSaving(false), 1000); };
  const addGroup = () => { if (newGroupName) setLocalGroups([...localGroups, { name: newGroupName, items: [] }]); setNewGroupName(''); };
  const deleteGroup = (i) => setLocalGroups(localGroups.filter((_, idx) => idx !== i));

  const handleItemSubmit = (gIdx) => {
    const nameInput = document.getElementById(`${idPrefix}-n-${gIdx}`);
    const budgetInput = document.getElementById(`${idPrefix}-b-${gIdx}`);
    const name = nameInput.value;
    const budget = name ? budgetInput.value : 0;

    if (!name) return;

    if (editingSelection && editingSelection.gIdx === gIdx) {
      // Update existing
      const g = [...localGroups];
      g[gIdx].items[editingSelection.iIdx] = { name, budget };
      setLocalGroups(g);
      setEditingSelection(null);
    } else {
      // Add new
      const g = [...localGroups];
      g[gIdx].items.push({ name, budget });
      setLocalGroups(g);
    }
    nameInput.value = '';
    budgetInput.value = '';
  };

  const handleEditItem = (gIdx, iIdx) => {
    const item = localGroups[gIdx].items[iIdx];
    setEditingSelection({ gIdx, iIdx });
    const nameInput = document.getElementById(`${idPrefix}-n-${gIdx}`);
    const budgetInput = document.getElementById(`${idPrefix}-b-${gIdx}`);
    if (nameInput && budgetInput) {
      nameInput.value = item.name;
      budgetInput.value = item.budget;
      nameInput.focus();
    }
  };

  const delItem = (gi, ii) => {
    const g = [...localGroups];
    g[gi].items = g[gi].items.filter((_, i) => i !== ii);
    setLocalGroups(g);
    if (editingSelection && editingSelection.gIdx === gi && editingSelection.iIdx === ii) {
      setEditingSelection(null);
      document.getElementById(`${idPrefix}-n-${gi}`).value = '';
      document.getElementById(`${idPrefix}-b-${gi}`).value = '';
    }
  };

  return (
    <div className="mb-10 animate-in fade-in">
      <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2">
        <h3 className="text-lg font-bold text-slate-700">{title}</h3>
        <button onClick={handleSaveWrapper} className={`text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 font-bold ${isSaving ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>{isSaving ? <><Check className="w-3 h-3" /> 已儲存</> : '儲存變更'}</button>
      </div>
      <div className="space-y-4">
        {localGroups.map((group, gIdx) => (
          <div key={gIdx} className={`${GLASS_CARD} overflow-hidden p-0`}>
            <div className="bg-slate-50/50 p-4 flex justify-between items-center border-b border-slate-100">
              <span className="font-bold text-slate-600 text-sm flex items-center gap-2"><FolderOpen className="w-4 h-4 text-slate-400" /> {group.name}</span>
              <button onClick={() => deleteGroup(gIdx)} className="text-slate-300 hover:text-rose-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {group.items.map((item, iIdx) => (
                <div key={iIdx} onClick={() => handleEditItem(gIdx, iIdx)} className={`flex justify-between items-center text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors ${editingSelection?.gIdx === gIdx && editingSelection?.iIdx === iIdx ? 'bg-blue-50 ring-1 ring-blue-100' : ''}`}>
                  <span className="text-slate-500 font-medium">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-md">${Number(item.budget).toLocaleString()}</span>
                    <button onClick={(e) => { e.stopPropagation(); delItem(gIdx, iIdx); }} className="text-slate-200 hover:text-rose-400"><X className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 mt-3 pt-2">
                <input id={`${idPrefix}-n-${gIdx}`} placeholder="項目名稱" className={`${GLASS_INPUT} w-full text-xs py-2 px-3`} />
                <input id={`${idPrefix}-b-${gIdx}`} placeholder="$" type="number" className={`${GLASS_INPUT} w-20 text-xs py-2 px-3`} />
                <button onClick={() => handleItemSubmit(gIdx)} className={`text-white px-3 rounded-lg transition-colors ${editingSelection?.gIdx === gIdx ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-700'}`}>
                  {editingSelection?.gIdx === gIdx ? <RefreshCw className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="新增群組名稱..." className={`${GLASS_INPUT} flex-1 text-sm shadow-sm`} />
        <button onClick={addGroup} className="bg-white border border-slate-200 text-slate-600 px-5 rounded-xl shadow-sm hover:bg-slate-50 font-bold"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
};


// --- Main Application Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* Force update removed - failed */

  const [editingId, setEditingId] = useState(null); // Track ID of item being edited
  const mainRef = useRef(null);

  // Modals
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isAddSalaryModalOpen, setIsAddSalaryModalOpen] = useState(false);
  const [isAddPartnerTxModalOpen, setIsAddPartnerTxModalOpen] = useState(false);

  // Mortgage Modals
  const [isAddMortgageExpModalOpen, setIsAddMortgageExpModalOpen] = useState(false);
  const [mortgageExpType, setMortgageExpType] = useState('down_payment');
  const [isAddMortgageAnalysisModalOpen, setIsAddMortgageAnalysisModalOpen] = useState(false);
  const [isAddMortgageFundingModalOpen, setIsAddMortgageFundingModalOpen] = useState(false);
  const [isAddExchangeModalOpen, setIsAddExchangeModalOpen] = useState(false);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', title: '確認', confirmText: '確定', confirmColor: 'bg-slate-800', onConfirm: () => { } });

  const [currentView, setCurrentView] = useState('home');
  const [selectedDate, setSelectedDate] = useState(new Date());

  /* Privacy Logic Removed */
  const handleViewChange = (viewId) => {
    setCurrentView(viewId);
    setIsMenuOpen(false);
  };

  // 1. Scroll to Top on View Change
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTo(0, 0);
  }, [currentView]);

  // 2. Auto-Refresh on Visibility Change (Data Freshness) - 15 mins timeout
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const lastSeen = localStorage.getItem('lastSeen');
        const now = Date.now();
        // If hidden for > 15 minutes (900,000 ms), force reload
        if (lastSeen && (now - Number(lastSeen) > 900000)) {
          window.location.reload();
        }
        localStorage.setItem('lastSeen', now);
      } else {
        localStorage.setItem('lastSeen', Date.now());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Data State
  const [transactions, setTransactions] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [partnerTransactions, setPartnerTransactions] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [mortgageExpenses, setMortgageExpenses] = useState([]);
  const [mortgageAnalysis, setMortgageAnalysis] = useState([]);
  const [mortgageFunding, setMortgageFunding] = useState([]);
  const [stockGoals, setStockGoals] = useState([]);
  const [usdExchanges, setUsdExchanges] = useState([]);

  // Recurring Manager State
  const [isRecurringManagerOpen, setIsRecurringManagerOpen] = useState(false);
  const [isRecurringConfirmOpen, setIsRecurringConfirmOpen] = useState(false);
  const [recurringConfirmItems, setRecurringConfirmItems] = useState([]);

  // Form States
  // Default amount 0 to prevent layout shift
  const [newTrans, setNewTrans] = useState({ amount: '0', type: 'monthly', group: '', category: '', note: '', date: getTodayString(), payer: 'myself' });
  const [newIncome, setNewIncome] = useState({ amount: '', category: '薪水', owner: 'myself', date: getTodayString(), note: '' });
  const [newSalaryRecord, setNewSalaryRecord] = useState({ amount: '', owner: 'myself', date: getTodayString(), note: '' });
  const [newPartnerTx, setNewPartnerTx] = useState({ amount: '', type: 'saving', date: getTodayString(), note: '' });

  const [newMortgageExp, setNewMortgageExp] = useState({ name: '', amount: '', date: getTodayString(), note: '', brand: '', type: 'down_payment' });
  const [newMortgageAnalysis, setNewMortgageAnalysis] = useState({ name: '', amount: '' });
  const [newMortgageFunding, setNewMortgageFunding] = useState({ source: '', amount: '', symbol: '', shares: '', rate: '', date: getTodayString(), note: '' }); // Added symbol
  const [newExchange, setNewExchange] = useState({ date: getTodayString(), usdAmount: '', rate: '', account: 'FT' });

  // --- Auth & Firestore ---
  // --- Auth & Firestore ---
  useEffect(() => {
    const initAuth = async () => {
      // Check if already signed in
      if (auth.currentUser) return;

      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          // If no custom token, check if we can restore session, otherwise anonymous
          /* parse checking session persistence is handled automatically by Firebase SDK */
          if (!auth.currentUser) {
            console.log("No user session, signing in anonymously");
            await signInAnonymously(auth);
          }
        }
      } catch (e) {
        console.warn("Auth check failed, falling back to anonymous:", e);
        if (!auth.currentUser) await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      // Only update user state if it actually changed to avoid re-renders
      if (u?.uid !== user?.uid) {
        setUser(u);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Data Listeners - Only depend on user, NOT selectedDate
    // This prevents listener recreation on month change which causes stale data issues
    const unsubs = [];
    const createSub = (col, setter, order = 'date', dir = 'desc') => {
      const q = query(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, col), orderBy(order, dir));
      unsubs.push(onSnapshot(q, (s) => {
        const rawData = s.docs.map(d => ({ id: d.id, ...d.data() }));
        // Robust Deduplication
        const seen = new Set();
        const uniqueData = [];
        rawData.forEach(item => {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            uniqueData.push(item);
          }
        });
        // Silent deduplication - log removed
        setter(uniqueData);
      }, (error) => console.error(`Error fetching ${col}:`, error)));
    };

    createSub('transactions', setTransactions);
    createSub('incomes', setIncomes);
    createSub('salary_history', setSalaryHistory);
    createSub('partner_savings', setPartnerTransactions);
    createSub('mortgage_expenses', setMortgageExpenses);
    createSub('mortgage_funding', setMortgageFunding);
    createSub('mortgage_analysis', setMortgageAnalysis, 'createdAt', 'asc');
    createSub('stock_goals', setStockGoals, 'year', 'desc');
    createSub('usd_exchanges', setUsdExchanges);

    return () => unsubs.forEach(u => u());
  }, [user]); // Only user dependency - data listeners are stable

  // Settings listener - depends on year, separate from data listeners
  useEffect(() => {
    if (!user) return;

    const viewYear = selectedDate.getFullYear();
    const settingsRef = doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', `config_${viewYear}`);

    const unsubSettings = onSnapshot(settingsRef, async (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        // Migration: If config for this year doesn't exist, try to copy from config_v2 (legacy global)
        // or just use defaults.
        try {
          const globalRef = doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'config_v2');
          const globalSnap = await getDoc(globalRef);
          const initialData = globalSnap.exists() ? globalSnap.data() : DEFAULT_SETTINGS;

          // Initialise the new year's config
          await setDoc(settingsRef, initialData);
        } catch (e) {
          console.error("Migration failed:", e);
          setSettings(DEFAULT_SETTINGS);
        }
      }
    });

    return () => unsubSettings();
  }, [user, selectedDate]);

  // Recurring Check
  useEffect(() => {
    if (!settings.monthlyGroups) return;
    const currentMonth = getTodayString().substring(0, 7);
    if (settings.lastRecurringCheck !== currentMonth && settings.recurringItems && settings.recurringItems.length > 0) {
      const activeItems = settings.recurringItems.filter(i => i.active);
      if (activeItems.length > 0) {
        setRecurringConfirmItems(activeItems);
        setIsRecurringConfirmOpen(true);
      }
    }
  }, [settings.lastRecurringCheck, settings.recurringItems]);

  const handleSaveRecurring = async (items) => {
    const year = selectedDate.getFullYear();
    const updates = { recurringItems: items };
    await setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', `config_${year}`), updates, { merge: true });
    await setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'config_v2'), updates, { merge: true });
  };

  const handleBatchAddRecurring = async () => {
    const currentMonth = getTodayString().substring(0, 7);
    withSubmission(async () => {
      const batch = [];
      for (const item of recurringConfirmItems) {
        const { id, active, ...txData } = item;
        batch.push(addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'transactions'), {
          amount: Number(txData.amount),
          type: 'monthly',
          group: txData.group,
          category: txData.category,
          note: txData.name,
          date: getTodayString(),
          payer: txData.payer || 'myself',
          createdAt: serverTimestamp()
        }));
      }
      await Promise.all(batch);
      const year = selectedDate.getFullYear();
      const updates = { lastRecurringCheck: currentMonth };
      await setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', `config_${year}`), updates, { merge: true });
      await setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'config_v2'), updates, { merge: true });

      setIsRecurringConfirmOpen(false);
      alert('已完成批量入帳');
    });
  };

  const handleSkipRecurring = async () => {
    const currentMonth = getTodayString().substring(0, 7);
    const year = selectedDate.getFullYear();
    const updates = { lastRecurringCheck: currentMonth };
    await setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', `config_${year}`), updates, { merge: true });
    await setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'config_v2'), updates, { merge: true });
    setIsRecurringConfirmOpen(false);
  };

  // Form Defaults Logic
  useEffect(() => {
    const groups = newTrans.type === 'monthly' ? settings.monthlyGroups : settings.annualGroups;
    if (groups && groups.length > 0) {
      const currentGroupValid = groups.find(g => g.name === newTrans.group);
      if (!newTrans.group || !currentGroupValid) {
        const firstGroup = groups[0];
        setNewTrans(prev => ({
          ...prev,
          group: firstGroup.name,
          category: firstGroup.items.length > 0 ? firstGroup.items[0].name : ''
        }));
      } else {
        const currentCategoryValid = currentGroupValid.items.find(i => i.name === newTrans.category);
        if (!newTrans.category || !currentCategoryValid) {
          setNewTrans(prev => ({
            ...prev,
            category: currentGroupValid.items.length > 0 ? currentGroupValid.items[0].name : ''
          }));
        }
      }
    }
  }, [settings, newTrans.type, newTrans.group]);


  // --- Stats Calculations ---
  const calculateStats = (type) => {
    const groupsConfig = type === 'monthly' ? settings.monthlyGroups : settings.annualGroups;
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const relevantTrans = transactions.filter(t => {
      const tDate = new Date(t.date);
      return t.type === type && tDate.getFullYear() === year && (type === 'monthly' ? tDate.getMonth() === month : true);
    });
    let grandTotalBudget = 0, grandTotalUsed = 0;
    const groupsData = groupsConfig.map(group => {
      let groupBudget = 0, groupUsed = 0;
      const itemsData = group.items.map(item => {
        const itemBudget = Number(item.budget);
        const itemUsed = relevantTrans.filter(t => t.category === item.name && (!t.group || t.group === group.name)).reduce((sum, t) => sum + Number(t.amount), 0);
        groupBudget += itemBudget; groupUsed += itemUsed;
        return { name: item.name, budget: itemBudget, used: itemUsed };
      });
      return { name: group.name, budget: groupBudget, used: groupUsed, items: itemsData };
    });

    // Calculate totals strictly from the processed groups to ensure consistency
    grandTotalBudget = groupsData.reduce((sum, g) => sum + g.budget, 0);
    grandTotalUsed = groupsData.reduce((sum, g) => sum + g.used, 0);

    return { totalBudget: grandTotalBudget, totalUsed: grandTotalUsed, groups: groupsData };
  };
  const monthlyStats = calculateStats('monthly');
  const annualStats = calculateStats('annual');

  // Calculate annual total used including ALL monthly spending for the year + Annual spending
  const yearlyTotalStats = useMemo(() => {
    const year = selectedDate.getFullYear();
    // Filter all transactions for current year, regardless of type, but exclude salary/partner checks if any
    const yearlyTrans = transactions.filter(t => new Date(t.date).getFullYear() === year);

    // Sum all spending
    const totalUsed = yearlyTrans.reduce((sum, t) => sum + Number(t.amount), 0);

    // Calculate total budget = (Sum of all monthly group budgets * 12) + Sum of all annual group budgets
    const monthlyTotalBudget = settings.monthlyGroups.reduce((acc, g) => acc + g.items.reduce((s, i) => s + Number(i.budget), 0), 0);
    const annualTotalBudget = settings.annualGroups.reduce((acc, g) => acc + g.items.reduce((s, i) => s + Number(i.budget), 0), 0);
    const totalBudget = (monthlyTotalBudget * 12) + annualTotalBudget;

    return { totalBudget, totalUsed };
  }, [transactions, settings, selectedDate]);

  // --- Action Wrapper ---
  const withSubmission = async (action) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try { await action(); } catch (e) { console.error(e); alert('發生錯誤: ' + e.message); } finally { setIsSubmitting(false); }
  };

  const requestConfirmation = ({ message, title = '確認', confirmText = '確定', confirmColor = 'bg-slate-800', onConfirm }) => {
    setConfirmModal({ isOpen: true, message, title, confirmText, confirmColor, onConfirm });
  };
  const requestDelete = (message, action) => requestConfirmation({ message, title: '確認刪除', confirmText: '刪除', confirmColor: 'bg-rose-500', onConfirm: action });

  // --- Handlers ---
  const handleAddTransaction = (e) => {
    e.preventDefault();
    console.log('[DEBUG] handleAddTransaction - editingId:', editingId, 'newTrans:', newTrans);
    withSubmission(async () => {
      if (editingId) {
        console.log('[DEBUG] Updating existing transaction:', editingId);
        // Clean data: remove ID from body and ensure numeric amount
        const { id, ...updateData } = newTrans;
        await setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'transactions', editingId), { ...updateData, amount: Number(newTrans.amount) }, { merge: true });
      } else {
        console.log('[DEBUG] Creating new transaction');
        const { id, ...createData } = newTrans;
        await addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'transactions'), { ...createData, amount: Number(newTrans.amount), createdAt: serverTimestamp() });
      }
      setNewTrans(prev => ({ ...prev, amount: '0', note: '' }));
      setIsAddTxModalOpen(false);
      setEditingId(null);
    });
  };
  const deleteTransaction = (id) => requestDelete("確定刪除此筆支出紀錄？", async () => deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'transactions', id)));

  const handleAddIncome = (e) => {
    e.preventDefault();
    withSubmission(async () => {
      if (editingId) {
        await setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'incomes', editingId), { ...newIncome, amount: Number(newIncome.amount) }, { merge: true });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'incomes'), { ...newIncome, amount: Number(newIncome.amount), createdAt: serverTimestamp() });
      }
      setNewIncome(prev => ({ ...prev, amount: '', note: '' }));
      setIsAddIncomeModalOpen(false);
      setEditingId(null);
    });
  };
  const handleDeleteIncome = (id) => requestDelete("確定刪除此筆收入紀錄？", async () => deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'incomes', id)));

  const handleAddSalaryRecord = (e) => {
    e.preventDefault();
    withSubmission(async () => {
      if (editingId) {
        await setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'salary_history', editingId), { ...newSalaryRecord, amount: Number(newSalaryRecord.amount) }, { merge: true });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'salary_history'), { ...newSalaryRecord, amount: Number(newSalaryRecord.amount), createdAt: serverTimestamp() });
      }
      setNewSalaryRecord(prev => ({ ...prev, amount: '', note: '' }));
      setIsAddSalaryModalOpen(false);
      setEditingId(null);
    });
  };
  const handleDeleteSalaryRecord = (id) => requestDelete("確定刪除此調薪紀錄？", async () => deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'salary_history', id)));

  const handleAddPartnerTx = (e) => {
    e.preventDefault();
    withSubmission(async () => {
      if (editingId) {
        await setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'partner_savings', editingId), { ...newPartnerTx, amount: Number(newPartnerTx.amount) }, { merge: true });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'partner_savings'), { ...newPartnerTx, amount: Number(newPartnerTx.amount), createdAt: serverTimestamp() });
      }
      setNewPartnerTx(prev => ({ ...prev, amount: '', note: '' }));
      setIsAddPartnerTxModalOpen(false);
      setEditingId(null);
    });
  };
  const deletePartnerTx = (id) => requestDelete("確定刪除此筆儲蓄/支出紀錄？", async () => deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'partner_savings', id)));

  const handleAddMortgageExp = (e) => {
    e.preventDefault();
    withSubmission(async () => {
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_expenses', editingId), { ...newMortgageExp, amount: Number(newMortgageExp.amount), type: mortgageExpType });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_expenses'), { ...newMortgageExp, amount: Number(newMortgageExp.amount), type: mortgageExpType, createdAt: serverTimestamp() });
      }
      setNewMortgageExp({ name: '', amount: '', date: getTodayString(), note: '', brand: '', type: mortgageExpType });
      setIsAddMortgageExpModalOpen(false);
      setEditingId(null);
    });
  };
  const deleteMortgageExp = (id) => requestDelete('刪除此項目？', () => deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_expenses', id)));

  const handleAddMortgageAnalysis = (e) => {
    e.preventDefault();
    withSubmission(async () => {
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_analysis', editingId), { ...newMortgageAnalysis, amount: Number(newMortgageAnalysis.amount) });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_analysis'), { ...newMortgageAnalysis, amount: Number(newMortgageAnalysis.amount), createdAt: serverTimestamp() });
      }
      setNewMortgageAnalysis({ name: '', amount: '' });
      setIsAddMortgageAnalysisModalOpen(false);
      setEditingId(null);
    });
  };
  const deleteMortgageAnalysis = (id) => requestDelete('刪除此項目？', () => deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_analysis', id)));

  const handleAddMortgageFunding = (e) => {
    e.preventDefault();
    withSubmission(async () => {
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_funding', editingId), { ...newMortgageFunding, amount: Number(newMortgageFunding.amount) });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_funding'), { ...newMortgageFunding, amount: Number(newMortgageFunding.amount), createdAt: serverTimestamp() });
      }
      setNewMortgageFunding({ source: '', amount: '', shares: '', rate: '', date: getTodayString(), note: '' });
      setIsAddMortgageFundingModalOpen(false);
      setEditingId(null);
    });
  };
  const deleteMortgageFunding = (id) => requestDelete('刪除此項目？', () => deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_funding', id)));

  const handleAddStockGoalYear = async () => {
    // Since sorted descending (newest first), max year is the first item's year
    const maxYear = stockGoals.length > 0 ? stockGoals[0].year : 2021;
    const nextYear = maxYear + 1;
    await addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'stock_goals'), { year: nextYear, roi: 0, firstrade: 0, ib: 0, withdrawal: 0, createdAt: serverTimestamp() });
  };
  const handleUpdateStockGoal = async (id, field, value) => { await setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'stock_goals', id), { [field]: Number(value) }, { merge: true }); };

  const handleAddExchange = (e) => { e.preventDefault(); withSubmission(async () => { await addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'usd_exchanges'), { ...newExchange, createdAt: serverTimestamp() }); setNewExchange({ date: getTodayString(), usdAmount: '', rate: '', account: 'FT' }); setIsAddExchangeModalOpen(false); }); };
  const handleDeleteExchange = (id) => requestDelete('刪除此換匯紀錄？', () => deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'usd_exchanges', id)));

  const updateSettings = async (newGroups, type) => {
    const newSettings = { ...settings };
    if (type === 'monthly') newSettings.monthlyGroups = newGroups;
    else newSettings.annualGroups = newGroups;

    // Write to the currently selected year's config
    const viewYear = selectedDate.getFullYear();
    await setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', `config_${viewYear}`), newSettings);
  };

  const handleDateNavigate = (direction) => { const newDate = new Date(selectedDate); if (currentView === 'income') newDate.setFullYear(selectedDate.getFullYear() + direction); else newDate.setMonth(selectedDate.getMonth() + direction); setSelectedDate(newDate); };

  // --- Main Render ---
  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden max-w-md mx-auto relative shadow-2xl">
      {/* Background Blobs for Glassmorphism */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-blue-200/40 rounded-full blur-[80px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-rose-200/40 rounded-full blur-[80px] pointer-events-none z-0"></div>
      <div className="absolute top-[40%] left-[20%] w-[60%] h-[30%] bg-indigo-200/30 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <ConfirmationModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmModal.onConfirm} message={confirmModal.message} title={confirmModal.title} confirmText={confirmModal.confirmText} confirmColor={confirmModal.confirmColor} />



      {/* Sidebar Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex animate-in slide-in-from-left duration-300">
          <div className="w-64 bg-white/90 backdrop-blur-xl h-full shadow-2xl p-6 relative">
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200"><X className="w-4 h-4" /></button>
            <div className="mb-8 mt-2 px-2"><h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><img src={icon} className="w-8 h-8 rounded-lg shadow-md" alt="Logo" /> 記帳助手</h1><p className="text-xs text-slate-400 mt-1 pl-1">v1.0.0(Mick)</p></div>
            <div className="space-y-6">
              {MENU_SECTIONS.map(section => (
                <div key={section.title}>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">{section.title}</h3>
                  <div className="space-y-1">
                    {section.items.map(item => (
                      <button key={item.id} onClick={() => handleViewChange(item.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${currentView === item.id ? 'bg-slate-800 text-white shadow-lg shadow-slate-300/50' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <item.icon className={`w-4 h-4 ${currentView === item.id ? 'text-indigo-300' : ''}`} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
        </div>
      )}

      <header className="bg-white/60 backdrop-blur-md px-4 py-4 flex items-center justify-between sticky top-0 z-20 border-b border-white/20">
        <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-white/50 text-slate-600 transition-colors"><Menu className="w-6 h-6" /></button>
        <div className="flex-1 flex justify-center">
          {(currentView === 'home' || currentView === 'income') ? (
            <div className="flex items-center gap-3 bg-white/50 rounded-full px-1 py-1 border border-white/40 shadow-sm backdrop-blur-sm">
              <button onClick={() => handleDateNavigate(-1)} className="p-1.5 rounded-full hover:bg-white hover:shadow-sm text-slate-400 hover:text-slate-600 transition-all"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-bold text-slate-700 min-w-[5rem] text-center select-none">{currentView === 'home' ? selectedDate.toLocaleString('zh-TW', { year: 'numeric', month: 'long' }) : `${selectedDate.getFullYear()}年`}</span>
              <button onClick={() => handleDateNavigate(1)} className="p-1.5 rounded-full hover:bg-white hover:shadow-sm text-slate-400 hover:text-slate-600 transition-all"><ChevronRight className="w-4 h-4" /></button>
            </div>
          ) : (
            <span className="text-sm font-bold text-slate-700 tracking-wide">{MENU_ITEMS_FLAT.find(i => i.id === currentView)?.label}</span>
          )}
        </div>
        <div className="w-8"></div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto p-5 scrollbar-hide relative z-10">
        {currentView === 'home' && <HomeView monthlyStats={monthlyStats} annualStats={annualStats} yearlyTotalStats={yearlyTotalStats} />}
        {/* 新增: Investment Watchlist */}
        {currentView === 'watchlist' && <WatchlistView user={user} db={db} appId={appId} requestConfirmation={requestConfirmation} />}
        {currentView === 'stock_goals' && <StockGoalView goals={stockGoals} exchanges={usdExchanges} onUpdate={handleUpdateStockGoal} onAddYear={handleAddStockGoalYear} onDeleteExchange={handleDeleteExchange} onAddExchangeClick={() => setIsAddExchangeModalOpen(true)} />}
        {currentView === 'mortgage' && (
          <MortgageView
            mortgageExpenses={mortgageExpenses}
            mortgageAnalysis={mortgageAnalysis}
            mortgageFunding={mortgageFunding}
            deleteMortgageExp={deleteMortgageExp}
            deleteMortgageAnalysis={deleteMortgageAnalysis}
            deleteMortgageFunding={deleteMortgageFunding}
            setMortgageExpType={setMortgageExpType}
            setIsAddMortgageExpModalOpen={setIsAddMortgageExpModalOpen}
            setIsAddMortgageAnalysisModalOpen={setIsAddMortgageAnalysisModalOpen}
            setIsAddMortgageFundingModalOpen={setIsAddMortgageFundingModalOpen}
            onEditExp={(item) => {
              setNewMortgageExp({ ...item, amount: item.amount });
              setMortgageExpType(item.type);
              setEditingId(item.id);
              setIsAddMortgageExpModalOpen(true);
            }}
            onEditAnalysis={(item) => {
              setNewMortgageAnalysis({ ...item, amount: item.amount });
              setEditingId(item.id);
              setIsAddMortgageAnalysisModalOpen(true);
            }}
            onEditFunding={(item) => {
              setNewMortgageFunding({ ...item, amount: item.amount });
              setEditingId(item.id);
              setIsAddMortgageFundingModalOpen(true);
            }}
          />
        )}
        {currentView === 'principal' && (
          <PrincipalView user={user} db={db} appId={appId} requestDelete={requestDelete} requestConfirmation={requestConfirmation} />
        )}
        {currentView === 'visualization' && <VisualizationView transactions={transactions} />}
        {currentView === 'income' && (
          <IncomeView
            incomes={incomes}
            salaryHistory={salaryHistory}
            onAddSalary={(own) => { setNewSalaryRecord(prev => ({ ...prev, owner: own })); setIsAddSalaryModalOpen(true); }}
            onDeleteSalary={handleDeleteSalaryRecord}
            onDeleteIncome={handleDeleteIncome}
            onAddIncome={(own, item = null) => {
              if (item) {
                setNewIncome({ ...item, amount: item.amount });
                setEditingId(item.id);
              } else {
                setNewIncome(prev => ({ ...prev, owner: own, amount: '', category: '薪水', note: '', date: selectedDate ? toLocalISOString(selectedDate) : getTodayString() }));
              }
              setIsAddIncomeModalOpen(true);
            }}
            onEditSalary={(item) => {
              setNewSalaryRecord({ ...item, amount: item.amount });
              setEditingId(item.id);
              setIsAddSalaryModalOpen(true);
            }}
            selectedDate={selectedDate}
          />
        )}
        {currentView === 'partner' && (
          <PartnerView
            partnerTransactions={partnerTransactions}
            onDelete={deletePartnerTx}
            onAdd={(item = null) => {
              if (item && item.id) {
                setNewPartnerTx({ ...item, amount: item.amount });
                setEditingId(item.id);
              } else {
                setNewPartnerTx({ amount: '', type: 'saving', date: getTodayString(), note: '' });
              }
              setIsAddPartnerTxModalOpen(true);
            }}
            onEdit={(item) => {
              setNewPartnerTx({ ...item, amount: item.amount });
              setEditingId(item.id);
              setIsAddPartnerTxModalOpen(true);
            }}
          />
        )}
        {currentView === 'calendar' && (
          <CalendarView
            transactions={transactions}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            deleteTransaction={deleteTransaction}
            onEdit={(item) => {
              console.log('[DEBUG] CalendarView onEdit triggered - item:', item);
              if (!item.id) {
                alert('錯誤：此交易沒有有效ID，無法編輯。請重新整理頁面後再試。');
                return;
              }
              setNewTrans({ ...item, amount: item.amount });
              setEditingId(item.id);
              console.log('[DEBUG] Set editingId to:', item.id);
              setIsAddTxModalOpen(true);
            }}
            onAddExpense={() => setIsAddTxModalOpen(true)}
          />
        )}
        {currentView === 'settings' && (
          <div className="pb-24">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><SettingsIcon className="w-5 h-5" /></div>
              <div>
                <h3 className="font-bold text-amber-800 text-sm">正在編輯 {selectedDate.getFullYear()} 年度預算</h3>
                <p className="text-xs text-amber-600 mt-1">此處的變更僅會套用到 {selectedDate.getFullYear()} 年，不會影響其他年份的設定。</p>
              </div>
            </div>
            <GroupSettingsEditor title={`${selectedDate.getFullYear()}年月度預算配置`} groups={settings.monthlyGroups} onSave={(g) => updateSettings(g, 'monthly')} idPrefix="monthly" />
            <GroupSettingsEditor title={`${selectedDate.getFullYear()}年年度預算配置`} groups={settings.annualGroups} onSave={(g) => updateSettings(g, 'annual')} idPrefix="annual" />
          </div>
        )}
      </main>

      {currentView === 'home' && (<button onClick={() => setIsAddTxModalOpen(true)} className="absolute bottom-8 right-6 w-14 h-14 bg-slate-800 rounded-full shadow-2xl shadow-slate-400/50 flex items-center justify-center text-white hover:bg-slate-900 hover:scale-105 transition-all active:scale-95 z-30"><Plus className="w-6 h-6" /></button>)}



      {/* --- Modals --- */}
      {isAddTxModalOpen && (
        <ModalWrapper title={editingId ? "編輯支出" : "新增支出"} onClose={() => { setIsAddTxModalOpen(false); setEditingId(null); setNewTrans({ amount: '0', type: 'monthly', group: '', category: '', note: '', date: getTodayString(), payer: 'myself' }); }}>
          {/* 檢查是否有設定預算群組，若無則提示 */}
          {(settings.monthlyGroups.length === 0 && settings.annualGroups.length === 0) ? (
            <div className="text-center py-10">
              <p className="text-slate-500 mb-4">請先設定預算分類</p>
              <GlassButton onClick={() => { setIsAddTxModalOpen(false); setCurrentView('settings'); }}>前往設定</GlassButton>
            </div>
          ) : (
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="flex justify-end">
                <button type="button" onClick={() => setIsRecurringManagerOpen(true)} className="text-xs text-slate-500 underline flex items-center gap-1 hover:text-slate-800"><SettingsIcon className="w-3 h-3" />管理固定支出</button>
              </div>
              <CalculatorInput
                value={newTrans.amount}
                onChange={(val) => setNewTrans({ ...newTrans, amount: val })}
                label="金額"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-100/50 p-1 rounded-2xl flex">
                  <button type="button" onClick={() => setNewTrans({ ...newTrans, type: 'monthly', group: '' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${newTrans.type === 'monthly' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>月度</button>
                  <button type="button" onClick={() => setNewTrans({ ...newTrans, type: 'annual', group: '' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${newTrans.type === 'annual' ? 'bg-white shadow-sm text-stone-600' : 'text-slate-400'}`}>年度</button>
                </div>
                <div className="bg-slate-100/50 p-1 rounded-2xl flex">
                  <button type="button" onClick={() => setNewTrans({ ...newTrans, payer: 'myself' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${newTrans.payer === 'myself' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>士程</button>
                  <button type="button" onClick={() => setNewTrans({ ...newTrans, payer: 'partner' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${newTrans.payer === 'partner' ? 'bg-white shadow-sm text-rose-500' : 'text-slate-400'}`}>佳欣</button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <select value={newTrans.group} onChange={(e) => setNewTrans({ ...newTrans, group: e.target.value, category: '' })} className={`w-full p-4 pl-12 ${GLASS_INPUT} text-slate-700 font-medium appearance-none`}>
                    {(newTrans.type === 'monthly' ? settings.monthlyGroups : settings.annualGroups).map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                  </select>
                  <FolderOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none z-10" />
                </div>
                <div className="relative">
                  <select value={newTrans.category} onChange={(e) => setNewTrans({ ...newTrans, category: e.target.value })} className={`w-full p-4 pl-12 ${GLASS_INPUT} text-slate-700 font-medium appearance-none`}>
                    {(newTrans.type === 'monthly' ? settings.monthlyGroups : settings.annualGroups).find(g => g.name === newTrans.group)?.items.map(i => <option key={i.name} value={i.name}>{i.name}</option>)}
                  </select>
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none z-10" />
                </div>
              </div>

              <div className="flex flex-col gap-3 min-w-0">
                <div className="w-full">
                  <InputField type="date" value={newTrans.date} onChange={(e) => setNewTrans({ ...newTrans, date: e.target.value })} required />
                </div>
                <div className="w-full relative">
                  <InputField value={newTrans.note} onChange={(e) => setNewTrans({ ...newTrans, note: e.target.value })} placeholder="備註..." />
                  <PenTool className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 pointer-events-none z-10" />
                </div>
              </div>

              <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4 shadow-xl shadow-slate-300/50">{isSubmitting ? '處理中...' : '確認儲存'}</GlassButton>
            </form>
          )}
        </ModalWrapper>
      )}

      {/* Other Modals... (Same structure) */}
      {isAddMortgageExpModalOpen && (
        <ModalWrapper title={mortgageExpType === 'down_payment' ? '新增頭期雜支' : '新增雜支紀錄'} onClose={() => setIsAddMortgageExpModalOpen(false)}>
          <form onSubmit={handleAddMortgageExp} className="space-y-4">
            <InputField label="項目名稱" value={newMortgageExp.name} onChange={e => setNewMortgageExp({ ...newMortgageExp, name: e.target.value })} autoFocus required />
            <InputField label="金額" type="number" value={newMortgageExp.amount} onChange={e => setNewMortgageExp({ ...newMortgageExp, amount: e.target.value })} required />
            <InputField label="日期" type="date" value={newMortgageExp.date} onChange={e => setNewMortgageExp({ ...newMortgageExp, date: e.target.value })} required />
            {mortgageExpType === 'misc_appliances' && (<InputField label="品牌" value={newMortgageExp.brand} onChange={e => setNewMortgageExp({ ...newMortgageExp, brand: e.target.value })} placeholder="品牌" />)}
            <InputField label="備註" value={newMortgageExp.note} onChange={e => setNewMortgageExp({ ...newMortgageExp, note: e.target.value })} />
            <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4">{isSubmitting ? '處理中...' : '儲存'}</GlassButton>
          </form>
        </ModalWrapper>
      )}

      {isAddMortgageFundingModalOpen && (
        <ModalWrapper title="新增頭期款來源" onClose={() => setIsAddMortgageFundingModalOpen(false)}>
          <form onSubmit={handleAddMortgageFunding} className="space-y-4">
            <InputField label="資金來源" value={newMortgageFunding.source} onChange={e => setNewMortgageFunding({ ...newMortgageFunding, source: e.target.value })} placeholder=" " autoFocus required />
            <InputField label="股票代碼 (選填)" value={newMortgageFunding.symbol} onChange={e => setNewMortgageFunding({ ...newMortgageFunding, symbol: e.target.value })} placeholder=" " />
            <div className="flex gap-2">
              <div className="flex-1"><InputField label="金額/單價" type="number" value={newMortgageFunding.amount} onChange={e => setNewMortgageFunding({ ...newMortgageFunding, amount: e.target.value })} required /></div>
              <div className="w-24"><InputField label="匯率" type="number" value={newMortgageFunding.rate} onChange={e => setNewMortgageFunding({ ...newMortgageFunding, rate: e.target.value })} placeholder="1.0" /></div>
            </div>
            <InputField label="股數 (選填)" type="number" value={newMortgageFunding.shares} onChange={e => setNewMortgageFunding({ ...newMortgageFunding, shares: e.target.value })} placeholder="0" />
            <InputField label="日期" type="date" value={newMortgageFunding.date} onChange={e => setNewMortgageFunding({ ...newMortgageFunding, date: e.target.value })} required />
            <InputField label="備註" value={newMortgageFunding.note} onChange={e => setNewMortgageFunding({ ...newMortgageFunding, note: e.target.value })} />
            <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4">{isSubmitting ? '處理中...' : '儲存'}</GlassButton>
          </form>
        </ModalWrapper>
      )}

      {isAddMortgageAnalysisModalOpen && (
        <ModalWrapper title="新增划算試算項目" onClose={() => setIsAddMortgageAnalysisModalOpen(false)}>
          <form onSubmit={handleAddMortgageAnalysis} className="space-y-4">
            <InputField label="項目名稱" value={newMortgageAnalysis.name} onChange={e => setNewMortgageAnalysis({ ...newMortgageAnalysis, name: e.target.value })} autoFocus required />
            <InputField label="金額" type="number" value={newMortgageAnalysis.amount} onChange={e => setNewMortgageAnalysis({ ...newMortgageAnalysis, amount: e.target.value })} required />
            <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4">{isSubmitting ? '處理中...' : '儲存'}</GlassButton>
          </form>
        </ModalWrapper>
      )}

      {isAddIncomeModalOpen && (
        <ModalWrapper title={editingId ? "編輯收入" : "新增收入"} onClose={() => { setIsAddIncomeModalOpen(false); setEditingId(null); setNewIncome({ amount: '', category: '薪水', owner: 'myself', date: getTodayString(), note: '' }); }}>
          <form onSubmit={handleAddIncome} className="space-y-6">
            <InputField label="金額" type="number" value={newIncome.amount} onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })} autoFocus required />
            <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">分類</label><div className="relative"><select value={newIncome.category} onChange={(e) => setNewIncome({ ...newIncome, category: e.target.value })} className={`w-full p-4 ${GLASS_INPUT} text-slate-800 font-medium outline-none appearance-none text-sm`}>{INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
            <InputField label="日期" type="date" value={newIncome.date} onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })} required />
            <InputField label="備註" value={newIncome.note} onChange={(e) => setNewIncome({ ...newIncome, note: e.target.value })} placeholder="備註..." />
            <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4">{isSubmitting ? '處理中...' : '確認入帳'}</GlassButton>
          </form>
        </ModalWrapper>
      )}

      {isAddPartnerTxModalOpen && (
        <ModalWrapper title={editingId ? "編輯資金紀錄" : "新增資金紀錄"} onClose={() => { setIsAddPartnerTxModalOpen(false); setEditingId(null); setNewPartnerTx({ amount: '', type: 'saving', date: getTodayString(), note: '' }); }}>
          <form onSubmit={handleAddPartnerTx} className="space-y-6">
            <div className="flex gap-2">
              <GlassButton onClick={() => setNewPartnerTx({ ...newPartnerTx, type: 'saving' })} variant={newPartnerTx.type === 'saving' ? 'success' : 'ghost'} className="flex-1">存入資金</GlassButton>
              <GlassButton onClick={() => setNewPartnerTx({ ...newPartnerTx, type: 'expense' })} variant={newPartnerTx.type === 'expense' ? 'danger' : 'ghost'} className="flex-1">支出/提領</GlassButton>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1">金額</label>
              <div className="relative"><input type="number" value={newPartnerTx.amount} onChange={(e) => setNewPartnerTx({ ...newPartnerTx, amount: e.target.value })} className={`w-full p-4 ${GLASS_INPUT} text-slate-800 font-medium outline-none text-sm`} placeholder="0" autoFocus required /></div>
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">{[10000, 25000, 30000, 50000].map(amt => (<button key={amt} type="button" onClick={() => setNewPartnerTx({ ...newPartnerTx, amount: amt })} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 whitespace-nowrap transition-colors">${amt.toLocaleString()}</button>))}</div>
            </div>
            <InputField label="日期" type="date" value={newPartnerTx.date} onChange={(e) => setNewPartnerTx({ ...newPartnerTx, date: e.target.value })} required />
            <InputField label="備註" value={newPartnerTx.note} onChange={(e) => setNewPartnerTx({ ...newPartnerTx, note: e.target.value })} placeholder="資金用途..." />
            <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4">{isSubmitting ? '處理中...' : '確認儲存'}</GlassButton>
          </form>
        </ModalWrapper>
      )}

      {isAddSalaryModalOpen && (
        <ModalWrapper title="調薪紀錄" onClose={() => setIsAddSalaryModalOpen(false)}>
          <form onSubmit={handleAddSalaryRecord} className="space-y-6">
            <InputField label="新薪資金額" type="number" value={newSalaryRecord.amount} onChange={(e) => setNewSalaryRecord({ ...newSalaryRecord, amount: e.target.value })} autoFocus required />
            <InputField label="生效日期" type="date" value={newSalaryRecord.date} onChange={(e) => setNewSalaryRecord({ ...newSalaryRecord, date: e.target.value })} required />
            <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4">{isSubmitting ? '處理中...' : '儲存調薪'}</GlassButton>
          </form>
        </ModalWrapper>
      )}

      {isAddExchangeModalOpen && (
        <ModalWrapper title="新增換匯紀錄" onClose={() => setIsAddExchangeModalOpen(false)}>
          <form onSubmit={handleAddExchange} className="space-y-4">
            <div className="flex gap-2">
              <GlassButton onClick={() => setNewExchange({ ...newExchange, account: 'FT' })} variant={newExchange.account === 'FT' ? 'primary' : 'ghost'} className="flex-1">Firstrade</GlassButton>
              <GlassButton onClick={() => setNewExchange({ ...newExchange, account: 'IB' })} variant={newExchange.account === 'IB' ? 'primary' : 'ghost'} className="flex-1">IB</GlassButton>
            </div>
            <InputField label="換入美金 (USD)" type="number" value={newExchange.usdAmount} onChange={e => setNewExchange({ ...newExchange, usdAmount: e.target.value })} autoFocus required />
            <InputField label="匯率 (TWD/USD)" type="number" value={newExchange.rate} onChange={e => setNewExchange({ ...newExchange, rate: e.target.value })} required />
            <InputField label="日期" type="date" value={newExchange.date} onChange={e => setNewExchange({ ...newExchange, date: e.target.value })} required />
            <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4">{isSubmitting ? '處理中...' : '確認紀錄'}</GlassButton>
          </form>
        </ModalWrapper>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          try {
            await confirmModal.onConfirm();
          } catch (e) {
            console.error("Action Failed:", e);
            alert("操作失敗: " + e.message);
          } finally {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
        }}
        message={confirmModal.message}
        title={confirmModal.title}
        confirmText={confirmModal.confirmText}
        confirmColor={confirmModal.confirmColor}
      />

      <RecurringManagerModal
        isOpen={isRecurringManagerOpen}
        onClose={() => setIsRecurringManagerOpen(false)}
        items={settings.recurringItems}
        onSave={handleSaveRecurring}
      />
      <RecurringConfirmModal
        isOpen={isRecurringConfirmOpen}
        onClose={() => setIsRecurringConfirmOpen(false)}
        items={recurringConfirmItems}
        onConfirm={handleBatchAddRecurring}
        onSkip={handleSkipRecurring}
      />
    </div >
  );
}