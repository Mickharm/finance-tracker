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
  getDoc,
  where
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
// 🎨 Nippon Colors Theme (日本の伝統色)
// Primary: 桜鼠 (Sakura-nezumi), 白藤 (Shiro-fuji)
// Accent: 若竹 (Wakatake), 薄紅 (Usu-kurenai), 藤色 (Fuji-iro)
// Base: 胡粉 (Gofun), 墨 (Sumi)
// 🎨 Refined Nippon Colors Theme (Cyber-Zen)
// 青竹 (Aotake): #00896C / #7EBEAB
// 灰櫻 (Haizakura): #E8D3D1 / #D05A6E
// 藤鼠 (Fujinezumi): #A5A5C7 / #6E6E91
// Cyber-Glass: Higher blur, lower opacity, soft glow
const GLASS_CARD = "bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-3xl relative overflow-hidden group";
const GLASS_INPUT = "w-full min-w-0 max-w-full box-border bg-white/40 backdrop-blur-md border border-white/60 focus:bg-white/70 focus:border-[#A5A5C7] transition-all duration-300 outline-none rounded-2xl text-base p-4 appearance-none shadow-inner shadow-stone-200/20";

const COLOR_VARIANTS = {
  // 墨 (Sumi) - Neutral
  slate: {
    bg: 'bg-[#EAEAEA]/60', border: 'border-[#D4D4D4]', text: 'text-[#4A4A4A]',
    iconBg: 'bg-[#F4F4F4]', iconText: 'text-[#6E6E6E]', bar: 'bg-[#4A4A4A]',
    glow: 'border-[#D4D4D4] shadow-sm'
  },
  // 銀鼠 (Ginnezumi) - Stone
  stone: {
    bg: 'bg-[#F2F0EB]/60', border: 'border-[#E0DCD6]', text: 'text-[#595450]',
    iconBg: 'bg-[#F2F0EB]', iconText: 'text-[#8C8680]', bar: 'bg-[#8C8680]',
    glow: 'border-[#E0DCD6] shadow-sm'
  },
  // 白藤 (Shirofuji) - Pale Lavender
  sky: {
    bg: 'bg-[#DBE1F1]/40', border: 'border-[#BDC8E6]', text: 'text-[#4B5E96]',
    iconBg: 'bg-[#DBE1F1]/60', iconText: 'text-[#6A7DAE]', bar: 'bg-[#6A7DAE]',
    glow: 'border-[#BDC8E6]/60 shadow-[0_0_20px_rgba(189,200,230,0.3)]'
  },
  // 藤紫 (Fujimurasaki) - Purple
  blue: {
    bg: 'bg-[#E0DAE8]/40', border: 'border-[#CBB9D8]', text: 'text-[#705885]',
    iconBg: 'bg-[#E0DAE8]/60', iconText: 'text-[#8A6FA3]', bar: 'bg-[#8A6FA3]',
    glow: 'border-[#CBB9D8]/60 shadow-[0_0_20px_rgba(203,185,216,0.3)]'
  },
  // 灰櫻 (Haizakura) - Muted Pink/Red
  rose: {
    bg: 'bg-[#E8D3D1]/40', border: 'border-[#D9B5B2]', text: 'text-[#A65E62]',
    iconBg: 'bg-[#E8D3D1]/60', iconText: 'text-[#C48286]', bar: 'bg-[#C48286]',
    glow: 'border-[#D9B5B2]/60 shadow-[0_0_20px_rgba(217,181,178,0.3)]'
  },
  // 青竹 (Aotake) - Muted Teal/Green (Replaces Emerald)
  emerald: {
    bg: 'bg-[#D1E6E1]/40', border: 'border-[#A3D1C8]', text: 'text-[#2F7567]',
    iconBg: 'bg-[#D1E6E1]/60', iconText: 'text-[#4DA391]', bar: 'bg-[#4DA391]',
    glow: 'border-[#A3D1C8]/60 shadow-[0_0_20px_rgba(163,209,200,0.3)]'
  },
  // 蒸栗 (Mushikuri) - Muted Yellow
  amber: {
    bg: 'bg-[#F0EAC2]/40', border: 'border-[#E0D695]', text: 'text-[#8F8335]',
    iconBg: 'bg-[#F0EAC2]/60', iconText: 'text-[#B8AA54]', bar: 'bg-[#B8AA54]',
    glow: 'border-[#E0D695]/60 shadow-[0_0_20px_rgba(224,214,149,0.3)]'
  },
  // 桔梗 (Kikyo) - Indigo
  indigo: {
    bg: 'bg-[#D6DEEB]/40', border: 'border-[#B4C4DE]', text: 'text-[#485A85]',
    iconBg: 'bg-[#D6DEEB]/60', iconText: 'text-[#6B80AD]', bar: 'bg-[#6B80AD]',
    glow: 'border-[#B4C4DE]/60 shadow-[0_0_20px_rgba(180,196,222,0.3)]'
  },
  // 淺蔥 (Asagi) - Cyan
  cyan: {
    bg: 'bg-[#CEE5E6]/40', border: 'border-[#A5D0D1]', text: 'text-[#3B7A7D]',
    iconBg: 'bg-[#CEE5E6]/60', iconText: 'text-[#5CA6A8]', bar: 'bg-[#5CA6A8]',
    glow: 'border-[#A5D0D1]/60 shadow-[0_0_20px_rgba(165,208,209,0.3)]'
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
const ConfirmationModal = ({ isOpen, onClose, onConfirm, message, title = "確認", confirmText = "確定", confirmColor = "bg-stone-800" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${GLASS_CARD} p-6 w-full max-w-xs animate-in zoom-in-95 duration-200`}>
        <h3 className="text-lg font-bold text-stone-800 mb-2">{title}</h3>
        <p className="text-stone-500 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold active:scale-95 transition-transform text-xs">取消</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform text-xs ${confirmColor}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const ModalWrapper = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
    <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-md transition-opacity" onClick={onClose} />
    <div className={`relative w-full rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-2xl shadow-2xl scroll-pb-40`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-stone-800 tracking-tight pl-2">{title}</h3>
        <button type="button" onClick={onClose} className="p-2 bg-stone-100/50 rounded-full text-stone-400 hover:bg-stone-200 hover:text-stone-600 transition-colors z-10 relative">
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const InputField = ({ label, type = "text", value, onChange, placeholder, required = false, autoFocus = false, children, className = "", ...props }) => (
  <div className={`space-y-1.5 w-full ${className}`}>
    {label && <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">{label}</label>}
    <div className="relative w-full min-w-0">
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} autoFocus={autoFocus} className={GLASS_INPUT} {...props} />
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
      {label && <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">{label}</label>}
      <div className="bg-stone-50/80 rounded-2xl p-4 border border-stone-100">
        <div className="text-right mb-4 overflow-x-auto scrollbar-hide">
          <div className="text-3xl font-bold text-stone-800 font-mono tracking-tight whitespace-nowrap">
            {formatDisplay(displayValue)}
          </div>
          {expression && <div className="text-xs text-stone-400 font-mono h-4 opacity-0">.</div>}
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
                    ['÷', '×', '-', '+', '='].includes(btn) ? 'bg-stone-200 text-stone-700' :
                      btn === '0' ? 'col-span-2 bg-white text-stone-800 border border-stone-200' :
                        'bg-white text-stone-800 border border-stone-200'
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
  // Nippon Colors: 藤鼠 (Fuji-nezumi) - sophisticated grayish purple-brown
  const variants = {
    primary: "bg-stone-700 text-white shadow-lg shadow-stone-400/30 hover:bg-stone-800",
    danger: "bg-rose-50 text-rose-600 border border-rose-200/80 hover:bg-rose-100",
    success: "bg-emerald-50 text-emerald-600 border border-emerald-200/80 hover:bg-emerald-100",
    ghost: "bg-white/60 text-stone-600 hover:bg-white/90 border border-stone-200/60"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`relative overflow-hidden px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm ${variants[variant]} ${className}`}>{children}</button>
  );
};

const BudgetProgressBar = ({ current, total, label, variant = 'main', colorTheme = 'slate', showDetails = true, showOverBudgetLabel = true }) => {
  const remaining = total - current;
  const isOverBudget = remaining < 0;
  // Progress: Show % remaining. If over budget (remaining < 0), show 0% (empty bar).
  const remainingPercentage = total > 0 ? (Math.max(0, remaining) / total) * 100 : 0;

  const theme = COLOR_VARIANTS[colorTheme] || COLOR_VARIANTS.slate;

  // Color logic: Dynamic warning
  // > 50%: Theme/Safe
  // 20% - 50%: Amber (Warning)
  // < 20%: Rose (Danger)
  let statusColor = theme.bar;
  if (!isOverBudget && total > 0) {
    if (remainingPercentage < 20) statusColor = 'bg-[#C48286]'; // 灰櫻 Haizakura (Rose)
    else if (remainingPercentage < 50) statusColor = 'bg-[#B8AA54]'; // 蒸栗 Mushikuri (Amber)
    else statusColor = theme.bar; // Theme Color (Aotake / Indigo)
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${theme.text} opacity-80 flex items-center gap-2`}>
          {label}
          {isOverBudget && showOverBudgetLabel && <span className="bg-rose-50 text-rose-600 text-[10px] px-1.5 py-0.5 rounded-md shadow-sm">已超支</span>}
        </span>
        {showDetails && (
          <div className="flex items-baseline gap-1 text-right">
            <span className={`text-[10px] font-medium whitespace-nowrap ${isOverBudget ? 'text-rose-400' : 'text-stone-400'}`}>{isOverBudget ? '已超支' : '剩餘'}</span>
            <span className={`font-mono font-bold ${isOverBudget ? 'text-rose-500' : 'text-stone-700'} ${Math.abs(remaining) > 1000000 ? 'text-sm' : ''}`}>{isOverBudget ? '-' : ''}${Math.abs(remaining).toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className={`w-full bg-stone-100/50 rounded-full h-1.5 overflow-hidden`}>
        <div className={`h-full transition-all duration-1000 ease-out ${statusColor}`} style={{ width: `${remainingPercentage}%` }} />
      </div>
      {showDetails && variant === 'main' && (
        <div className="flex justify-between mt-1.5 text-[10px] text-stone-400 font-medium">
          <span className={isOverBudget ? 'text-rose-400' : ''}>{Math.round(remainingPercentage)}% 剩餘</span>
          <span>總額: ${total.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

const Card = ({ children, className = "", variant = 'slate' }) => { return (<div className={`${GLASS_CARD} p-5 ${className}`}>{children}</div>); };

const PrincipalTrendChart = ({ history }) => {
  const data = useMemo(() => [...history].reverse().slice(-12), [history]);
  if (!data || data.length < 2) { return (<div className={`${GLASS_CARD} p-6 mb-6 flex flex-col items-center justify-center h-48`}><PieChart className="w-8 h-8 text-stone-300 mb-2" /><span className="text-xs text-stone-400 font-medium">累積更多紀錄後顯示趨勢圖</span></div>); }
  const width = 100; const height = 50; const padding = 5;
  const values = data.map(d => d.netPrincipal);
  const minVal = Math.min(...values); const maxVal = Math.max(...values); const range = maxVal - minVal || 1;
  const points = data.map((d, i) => { const x = padding + (i / (data.length - 1)) * (width - 2 * padding); const y = height - padding - ((d.netPrincipal - minVal) / range) * (height - 2 * padding); return `${x},${y}`; }).join(' ');
  const currentNet = values[values.length - 1]; const prevNet = values.length > 1 ? values[values.length - 2] : currentNet; const growth = currentNet - prevNet;
  return (
    <div className={`${GLASS_CARD} p-6 mb-6 relative overflow-hidden`}><div className="relative z-10 mb-4"><h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">歷史資產淨值趨勢</h2><div className="flex items-baseline gap-2"><div className="text-3xl font-bold text-stone-800 font-mono tracking-tight">${currentNet.toLocaleString()}</div>{growth !== 0 && (<span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${growth > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{growth > 0 ? '+' : ''}{growth.toLocaleString()}</span>)}</div></div><div className="w-full h-32 relative"><svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none"><line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeWidth="0.5" strokeDasharray="2" /><line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f1f5f9" strokeWidth="0.5" strokeDasharray="2" /><polyline points={points} fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />{data.map((d, i) => { const x = padding + (i / (data.length - 1)) * (width - 2 * padding); const y = height - padding - ((d.netPrincipal - minVal) / range) * (height - 2 * padding); return (<circle key={i} cx={x} cy={y} r={i === data.length - 1 ? 2 : 1} className={i === data.length - 1 ? "fill-stone-800" : "fill-white stroke-stone-400 stroke-[0.5]"} />); })}</svg></div><div className="flex justify-between text-[10px] text-stone-400 font-mono mt-1 px-1"><span>{new Date(data[0].date).toLocaleDateString()}</span><span>{new Date(data[data.length - 1].date).toLocaleDateString()}</span></div></div>
  );
};

const CleanSummaryCard = ({ title, value, subValue, icon: Icon, trend, variant = 'slate' }) => {
  const theme = COLOR_VARIANTS[variant] || COLOR_VARIANTS.slate;
  return (<div className={`${GLASS_CARD} p-6 mb-6 ${theme.glow}`}><div className="flex justify-between items-start mb-2"><div className={`p-2 rounded-xl ${theme.iconBg} ${theme.iconText}`}>{Icon ? <Icon className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}</div>{trend && <span className={`bg-stone-50/50 text-stone-500 text-[10px] px-2 py-1 rounded-full font-bold`}>{trend}</span>}</div><div><h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">{title}</h2><div className="text-3xl font-bold text-stone-800 font-mono tracking-tight">${value}</div>{subValue && <div className="text-xs text-stone-400 mt-1">{subValue}</div>}</div></div>);
};

const GroupCard = ({ group, colorTheme = 'slate' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = COLOR_VARIANTS[colorTheme] || COLOR_VARIANTS.slate;
  const isOverBudget = group.used > group.budget;
  const remaining = group.budget - group.used;
  const remainingPercentage = group.budget > 0 ? (Math.max(0, remaining) / group.budget) * 100 : 0;

  let statusBarColor = theme.bar;
  if (!isOverBudget && group.budget > 0) {
    if (remainingPercentage < 20) statusBarColor = 'bg-[#C48286]'; // Haizakura
    else if (remainingPercentage < 50) statusBarColor = 'bg-[#B8AA54]'; // Mushikuri
    else statusBarColor = theme.bar; // Theme Color
  }

  return (
    <div className={`${GLASS_CARD} p-5 hover:border-stone-300 transition-all duration-300`}>
      <div className="flex flex-col cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${theme.iconBg} ${theme.iconText}`}>{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
            <h3 className="text-sm font-bold text-stone-700 tracking-tight">{group.name}</h3>
            {isOverBudget && <span className="bg-rose-100 text-rose-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">已超支</span>}
          </div>
          <div className="text-right flex items-baseline gap-1">
            <span className="text-[10px] text-stone-400">剩餘</span>
            <span className={`text-sm font-mono font-bold ${isOverBudget ? 'text-rose-500' : 'text-stone-800'}`}>{isOverBudget ? '-' : ''}${Math.abs(remaining).toLocaleString()}</span>
          </div>
        </div>
        <div className={`w-full bg-stone-100/50 rounded-full h-1.5 overflow-hidden`}>
          <div className={`h-full transition-all duration-500 ${statusBarColor}`} style={{ width: `${remainingPercentage}%` }} />
        </div>
      </div>
      {isExpanded && (<div className="mt-5 pl-2 space-y-3 animate-in slide-in-from-top-1 duration-200 border-t border-stone-100/50 pt-3">{group.items.map((item, idx) => {
        const itemRemaining = item.budget - item.used;
        const itemIsOver = itemRemaining < 0;
        const itemPercent = item.budget > 0 ? (Math.max(0, itemRemaining) / item.budget) * 100 : 0;
        return (
          <div key={idx}>
            <div className="flex justify-between text-xs mb-1.5 font-medium text-stone-500">
              <span>{item.name}</span>
              <span className={`font-mono ${itemIsOver ? 'text-rose-500' : 'text-stone-400'}`}>{itemIsOver ? '-' : ''}${Math.abs(itemRemaining).toLocaleString()}</span>
            </div>
            <div className={`w-full bg-stone-100/50 rounded-full h-1 overflow-hidden`}>
              <div className={`h-full transition-all duration-500 ${!itemIsOver && item.budget > 0
                ? (itemPercent < 20 ? 'bg-[#C48286]' : itemPercent < 50 ? 'bg-[#B8AA54]' : theme.bar)
                : theme.bar
                }`} style={{ width: `${itemPercent}%` }} />
            </div>
          </div>
        );
      })}</div>)}
    </div>
  );
};

// --- Watchlist Feature (Fixing Fetch Logic) ---
const WatchlistGroup = ({ group, onUpdateStock, onDeleteStock, onDeleteGroup, onAddStock, totalSystemBudget, prices }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newSymbol, setNewSymbol] = useState('');
  const handleAdd = () => { if (newSymbol) { onAddStock(group.id, newSymbol.toUpperCase()); setNewSymbol(''); } };

  const groupTotalBudget = useMemo(() => group.items.reduce((sum, item) => sum + (Number(item.budget) || 0), 0), [group.items]);
  const groupPercentage = totalSystemBudget > 0 ? (groupTotalBudget / totalSystemBudget) * 100 : 0;
  const theme = COLOR_VARIANTS.indigo;
  return (
    <div className={`${GLASS_CARD} p-5 hover:border-indigo-300 transition-all duration-300 mb-4 ${theme.glow}`}>
      <div className="flex justify-between items-center mb-4"><div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}><div className={`p-1.5 rounded-lg ${theme.iconBg} ${theme.iconText}`}>{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div><div><h3 className="text-sm font-bold text-stone-700 tracking-tight">{group.name}</h3><span className="text-[10px] text-stone-400 font-medium">佔總預算 {groupPercentage.toFixed(1)}%</span></div></div><div className="flex items-center gap-2"><button onClick={(e) => { e.stopPropagation(); onDeleteGroup(); }} className="p-1.5 rounded-lg bg-stone-100 text-stone-400 hover:bg-rose-50 hover:text-rose-500 transition-all"><X className="w-3.5 h-3.5" /></button></div></div>
      {isExpanded && (<div className="space-y-4 animate-in slide-in-from-top-1 duration-200 border-t border-stone-100/50 pt-3">{group.items.map((stock, idx) => { const priceData = prices[stock.symbol]; const budget = Number(stock.budget) || 0; const price = priceData ? priceData.price : 0; const shares = price > 0 ? Math.floor(budget / price) : 0; const isUp = priceData?.change >= 0; const stockPercentage = groupTotalBudget > 0 ? (budget / groupTotalBudget) * 100 : 0; return (<div key={idx} className="flex flex-col gap-2 border-b border-stone-100/50 last:border-0 pb-3 last:pb-0"><div className="flex justify-between items-center"><div><div className="flex items-center gap-2"><span className="font-bold text-stone-800 text-base">{stock.symbol}</span><span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 rounded">佔比 {stockPercentage.toFixed(1)}%</span>{priceData && (<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${isUp ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{priceData.change.toFixed(2)}%</span>)}</div><div className="text-xs text-stone-400 font-mono mt-0.5">現價: ${price > 0 ? price.toFixed(2) : '---'}</div></div><button onClick={() => onDeleteStock(group.id, idx)} className="text-stone-300 hover:text-rose-400 p-1"><X className="w-4 h-4" /></button></div><div className="bg-stone-50/50 rounded-xl p-3 flex items-center gap-3"><div className="flex-1"><label className="text-[10px] text-stone-400 font-bold uppercase block mb-1">定投預算 (USD)</label><input type="number" value={stock.budget} onChange={(e) => onUpdateStock(group.id, idx, 'budget', e.target.value)} className="w-full bg-white/50 border border-stone-200 rounded-lg px-2 py-1 text-sm font-bold text-stone-700 outline-none focus:border-indigo-300" placeholder="500" /></div><div className="text-right"><div className="text-[10px] text-stone-400 font-bold uppercase mb-1">可購股數</div><div className="text-xl font-bold text-indigo-600 font-mono">{shares} <span className="text-xs text-stone-400 font-sans">股</span></div></div></div></div>); })}<div className="mt-2 pt-2 border-t border-stone-100/50"><div className="flex gap-2"><input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="輸入代碼" className={`${GLASS_INPUT} py-2 px-3 text-xs uppercase`} /><button onClick={handleAdd} className="bg-stone-800 text-white px-4 rounded-xl hover:bg-stone-700 font-bold text-xs shadow-lg"><Plus className="w-4 h-4" /></button></div></div></div>)}
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
        <div><h2 className="text-xl font-bold text-stone-800">投資名單</h2><p className="text-xs text-stone-400 font-mono mt-1">{lastUpdated ? `最後更新: ${lastUpdated.toLocaleTimeString()}` : '更新中...'}</p></div>
        <button onClick={() => fetchAllPrices(groups)} className={`p-2 rounded-xl bg-white shadow-sm border border-stone-100 text-indigo-600`}><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>
      <div className="mb-4">
        {!isAddGroupOpen ? (
          <button onClick={() => setIsAddGroupOpen(true)} className="w-full py-3 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 font-bold text-sm hover:border-indigo-300 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> 新增追蹤清單</button>
        ) : (
          <div className={`${GLASS_CARD} p-3 flex gap-2 animate-in slide-in-from-top-2 duration-200`}><input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGroup()} placeholder="輸入群組名稱" className={`${GLASS_INPUT} py-2 px-3 text-xs uppercase`} autoFocus /><button onClick={addGroup} disabled={isSubmitting} className="bg-indigo-600 text-white px-4 rounded-xl font-bold shadow-md hover:bg-indigo-700"><Check className="w-4 h-4" /></button><button onClick={() => setIsAddGroupOpen(false)} className="bg-stone-100 text-stone-500 px-3 rounded-xl hover:bg-stone-200"><X className="w-4 h-4" /></button></div>
        )}
      </div>
      <div>{groups.map(g => (<WatchlistGroup key={g.id} group={g} totalSystemBudget={totalSystemBudget} prices={prices} onAddStock={addStock} onUpdateStock={updateStock} onDeleteStock={deleteStock} onDeleteGroup={() => deleteGroup(g.id)} />))}</div>
    </div>
  );
};

const SalaryHistoryCard = ({ history, owner, onAdd, onDelete, onEdit, embedded = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerClass = embedded ? "bg-stone-50/50 rounded-xl p-3 border border-stone-100" : `${GLASS_CARD} p-5`;

  return (
    <div className={containerClass}>
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${embedded ? 'bg-white shadow-sm' : 'bg-stone-100'} text-stone-500`}>
            <Briefcase className="w-4 h-4" />
          </div>
          <span className="font-bold text-stone-700 text-sm">薪資成長紀錄</span>
        </div>
        <GlassButton onClick={(e) => { e.stopPropagation(); onAdd(owner); }} variant="ghost" className="px-2 py-1 text-xs">+ 調薪</GlassButton>
      </div>
      {isExpanded && (
        <div className="mt-4 space-y-3 pt-3 border-t border-stone-200/50">
          {history.length === 0 ? (
            <p className="text-xs text-stone-300 text-center py-2">尚無調薪紀錄</p>
          ) : (
            history.map((rec, idx) => {
              const prevRec = history[idx + 1];
              let percentChange = null;
              if (prevRec && prevRec.amount > 0) percentChange = ((rec.amount - prevRec.amount) / prevRec.amount) * 100;
              return (
                <div key={rec.id} onClick={() => onEdit && onEdit(rec)} className="flex justify-between items-center text-sm border-b border-stone-100 last:border-0 pb-2 last:pb-0 cursor-pointer hover:bg-stone-100/50 px-1 rounded transition-colors">
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-stone-700">${Number(rec.amount).toLocaleString()}</span>
                    <span className="text-[10px] text-stone-400">{rec.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {percentChange !== null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${percentChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                        {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%
                      </span>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onDelete(rec.id); }} className="text-stone-300 hover:text-rose-400 p-1">
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
        <div className="mt-2 text-xs text-stone-400 pl-11 flex justify-between items-center">
          <span>目前: <span className="font-mono text-stone-600 font-bold">${Number(history[0].amount).toLocaleString()}</span></span>
          {history.length > 1 && (() => {
            const grow = ((history[0].amount - history[history.length - 1].amount) / history[history.length - 1].amount) * 100;
            return <span className={`text-[10px] ${grow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>總成長 {grow.toFixed(0)}%</span>
          })()}
        </div>
      )}
    </div>
  );
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
      <div onClick={() => setIsExpanded(!isExpanded)} className="bg-stone-50/50 p-4 flex justify-between items-center cursor-pointer transition-colors hover:bg-stone-50/80">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${isExpanded ? 'bg-white shadow-sm text-stone-600' : 'text-stone-400'}`}>{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
          <span className="font-bold text-stone-700 text-sm">{year}年度</span>
        </div>
        <div className="flex items-center gap-3"><span className={`font-mono font-bold text-sm ${yearStats.net >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{yearStats.net > 0 ? '+' : ''}${yearStats.net.toLocaleString()}</span></div>
      </div>
      {isExpanded && (<div className="p-2 space-y-2">{transactions.map(tx => (
        <div key={tx.id} onClick={() => onEdit(tx)} className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-stone-100 hover:border-stone-200 transition-all group cursor-pointer">
          <div className="flex gap-3 items-center">
            <div className={`p-2 rounded-xl ${tx.type === 'saving' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{tx.type === 'saving' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}</div>
            <div className="flex flex-col"><span className="font-bold text-stone-700 text-xs">{tx.type === 'saving' ? '存入' : '支出'}</span><span className="text-[10px] text-stone-400 flex items-center gap-1">{tx.date} {tx.note && `• ${tx.note}`}</span></div>
          </div>
          <div className="flex items-center gap-3"><span className={`font-mono font-bold text-sm ${tx.type === 'saving' ? 'text-emerald-600' : 'text-rose-500'}`}>{tx.type === 'saving' ? '+' : '-'}${Number(tx.amount).toLocaleString()}</span><button onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }} className="text-stone-300 hover:text-rose-400 p-1"><X className="w-4 h-4" /></button></div>
        </div>
      ))}</div>)}
    </div>
  );
};

const AssetGroup = ({ title, items, section, groupKey, onUpdate, onAdd, onDelete }) => (
  <div className={`${GLASS_CARD} p-4 mb-4`}>
    <div className="flex justify-between items-center mb-3">
      <h4 className={`font-bold text-stone-700 flex items-center gap-2`}>
        {section === 'assets' ? <Landmark className="w-4 h-4 text-stone-400" /> : <Building2 className="w-4 h-4 text-stone-400" />}
        {title}
      </h4>
      <button onClick={() => onAdd(section, groupKey)} className="p-1.5 bg-stone-100 rounded-lg text-stone-500 hover:bg-stone-200"><Plus className="w-4 h-4" /></button>
    </div>
    <div className="space-y-3">
      {(items || []).map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200 min-w-0">
          <input value={item.name} onChange={(e) => onUpdate(section, groupKey, idx, 'name', e.target.value)} placeholder="項目名稱" className={`${GLASS_INPUT} flex-1 text-base py-2 px-3`} />
          <div className="relative w-28 min-w-0">
            <span className="absolute left-2 top-1/2 -transtone-y-1/2 text-stone-400 text-xs">$</span>
            <input type="text" inputMode="numeric" value={Number(item.amount).toLocaleString()} onChange={(e) => { const v = e.target.value.replace(/,/g, ''); if (!isNaN(v)) onUpdate(section, groupKey, idx, 'amount', v); }} className={`${GLASS_INPUT} w-full text-base py-2 pl-5 pr-2 font-mono text-right text-stone-700 font-bold`} />
          </div>
          <button onClick={() => onDelete(section, groupKey, idx)} className="text-stone-300 hover:text-rose-400"><X className="w-3 h-3" /></button>
        </div>
      ))}
    </div>
    <div className="mt-3 pt-2 border-t border-stone-100/50 flex justify-between text-xs font-bold text-stone-600">
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
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isAchieved ? 'bg-emerald-400' : (yearData.year < new Date().getFullYear() ? 'bg-rose-500' : 'bg-stone-300')}`}></div>
      <div className="flex justify-between items-start mb-4 pl-3">
        <div>
          <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            {yearData.year}年
            {isAchieved ? (
              <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">達成</span>
            ) : (yearData.year < new Date().getFullYear()) ? (
              <span className="text-xs bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full font-bold">未達成</span>
            ) : (
              <span className="text-xs bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full font-bold">進行中</span>
            )}
            {currentWithdrawal > 0 && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">含提領</span>}
          </h3>
          <div className="text-xs text-stone-400 mt-1">固定存入: <span className="font-bold text-stone-600">${fixedDeposit.toLocaleString()}</span> (美金)</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-stone-400">年化目標</div>
          <div className="flex items-center justify-end gap-1">
            <input type="number" value={yearData.roi} onChange={(e) => onUpdate(yearData.id, 'roi', e.target.value)} className="w-12 text-right font-bold text-stone-800 border-b border-stone-200 focus:border-stone-500 outline-none bg-transparent" />
            <span className="text-sm font-bold text-stone-600">%</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4 pl-3">
        <div><label className="text-[10px] text-stone-400 uppercase font-bold">Firstrade (美金)</label><input type="number" value={yearData.firstrade} onChange={(e) => onUpdate(yearData.id, 'firstrade', e.target.value)} className="w-full font-mono font-bold text-stone-700 border-b border-stone-100 focus:border-emerald-500 outline-none py-1 bg-transparent" placeholder="0" /></div>
        <div><label className="text-[10px] text-stone-400 uppercase font-bold">IB (美金)</label><input type="number" value={yearData.ib} onChange={(e) => onUpdate(yearData.id, 'ib', e.target.value)} className="w-full font-mono font-bold text-stone-700 border-b border-stone-100 focus:border-emerald-500 outline-none py-1 bg-transparent" placeholder="0" /></div>
        <div className="col-span-2 relative"><label className="text-[10px] text-amber-400 uppercase font-bold">提領/調節 (美金)</label><input type="number" value={yearData.withdrawal} onChange={(e) => onUpdate(yearData.id, 'withdrawal', e.target.value)} className="w-full font-mono font-bold text-stone-700 border-b border-amber-100 focus:border-amber-400 outline-none py-1 bg-transparent" placeholder="0" /></div>
      </div>
      <div className="bg-stone-50/50 rounded-xl p-3 pl-4 flex justify-between items-center">
        <div><div className="text-[10px] text-stone-400 mb-0.5 font-bold uppercase">目標金額</div><div className="font-bold text-stone-500 text-sm font-mono">${Math.round(targetAmount).toLocaleString()}</div></div>
        <div className="text-right"><div className="text-[10px] text-stone-400 mb-0.5 font-bold uppercase">實際總資產</div><div className={`font-bold text-lg font-mono ${isAchieved ? 'text-emerald-600' : 'text-stone-700'}`}>${Math.round(currentTotal).toLocaleString()}</div><div className={`text-[10px] font-medium ${isAchieved ? 'text-emerald-500' : 'text-stone-400'}`}>誤差: {diff > 0 ? '+' : ''}{Math.round(diff).toLocaleString()} ({errorPercent.toFixed(2)}%)</div></div>
      </div>
    </div >
  );
};

const ExchangeItem = ({ item, onDelete, onEdit }) => {
  const isSell = item.type === 'sell';
  const isFT = item.account === 'FT';
  const twdAmount = Math.round(Number(item.usdAmount) * Number(item.rate));
  const accountTheme = isFT
    ? { bg: 'bg-[#D6DEEB]/60', text: 'text-[#485A85]', border: 'border-[#B4C4DE]' }  // 桔梗 (Indigo)
    : { bg: 'bg-[#F0EAC2]/60', text: 'text-[#8F8335]', border: 'border-[#E0D695]' }; // 蒸栗 (Amber)

  return (
    <div onClick={() => onEdit && onEdit(item)} className={`${GLASS_CARD} p-4 group border-l-4 ${isSell ? 'border-[#C48286]' : 'border-[#4DA391]'} ${onEdit ? 'cursor-pointer hover:bg-white/60' : ''} transition-all`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded-lg font-bold text-xs ${accountTheme.bg} ${accountTheme.text} border ${accountTheme.border}`}>{isFT ? 'Firstrade' : 'IB'}</div>
          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${isSell ? 'bg-[#E8D3D1]/60 text-[#A65E62]' : 'bg-[#D1E6E1]/60 text-[#2F7567]'}`}>{isSell ? '賣出' : '買入'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-stone-800 font-mono">${Number(item.usdAmount).toLocaleString()} USD</span>
          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="text-stone-300 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100 p-1"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-stone-400">{formatDetailedDate(item.date)} @ 匯率 {Number(item.rate).toFixed(2)}</span>
        <span className={`font-mono font-bold ${isSell ? 'text-[#A65E62]' : 'text-[#2F7567]'}`}>{isSell ? '+' : '-'}NT$ {twdAmount.toLocaleString()}</span>
      </div>
    </div>
  );
};

// 統一的列表元件
const StandardList = ({ title, items, onDelete, onAdd, onEdit, icon: Icon, type, totalLabel, totalValue, itemRenderer, variant = 'slate', isCollapsible = false, defaultExpanded = true }) => {
  const theme = COLOR_VARIANTS[variant] || COLOR_VARIANTS.slate;
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`${GLASS_CARD} overflow-hidden p-0 mb-6 ${theme.glow}`}>
      <div
        className={`p-5 flex justify-between items-center ${isCollapsible ? 'cursor-pointer hover:bg-white/30 transition-colors' : ''} ${!isExpanded ? 'border-b-0' : ''}`}
        onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${theme.iconBg} ${theme.iconText}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-stone-700">{title}</h3>
            {!isExpanded && totalLabel && (
              <div className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                <span>{totalLabel}: </span>
                <span className="font-mono font-bold text-stone-600">${totalValue.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(!isCollapsible || isExpanded) && <GlassButton onClick={(e) => { e.stopPropagation(); onAdd(type); }} className="text-xs px-2 py-1"><Plus className="w-3 h-3" /> 新增</GlassButton>}
          {isCollapsible && (isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />)}
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 pt-5 animate-in slide-in-from-top-2 duration-200 border-t border-white/10">
          <div className="space-y-3">
            {items.length === 0 ? <p className="text-center text-xs text-stone-300 py-4">無紀錄</p> : items.map((item) => (
              <div key={item.id} onClick={() => onEdit && onEdit(item)} className={`border-b border-white/20 last:border-0 pb-3 last:pb-0 group relative pr-8 ${onEdit ? 'cursor-pointer hover:bg-white/30 rounded-lg p-2 transition-colors' : ''}`}>
                {itemRenderer(item)}
                <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="absolute top-1/2 -translate-y-1/2 right-2 z-10 p-1.5 rounded-lg text-stone-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {totalLabel && (
            <div className="mt-4 pt-3 border-t border-white/20 flex justify-between items-center">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">{totalLabel}</span>
              <span className="text-xl font-bold text-stone-800 font-mono">${totalValue.toLocaleString()}</span>
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
        <h3 className="font-bold text-stone-700 flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-100 text-cyan-600">
            <Clock className="w-4 h-4" />
          </div>
          房貸還款計劃 (40年)
        </h3>
        {expandedYear ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
      </div>

      {expandedYear && (
        <div className="grid grid-cols-2 gap-3 mb-4 animate-in slide-in-from-top-2 duration-200">
          <div className="bg-stone-50/80 p-3 rounded-xl border border-stone-100">
            <div className="text-xs text-stone-400 mb-1">下期 ({currentStatus?.id}期)</div>
            <div className="text-lg font-bold text-stone-800 font-mono">${currentStatus?.amount.toLocaleString()}</div>
            <div className="text-[10px] text-stone-400">利率 {currentStatus?.rate}%</div>
          </div>
          <div className="bg-stone-50/80 p-3 rounded-xl border border-stone-100">
            <div className="text-xs text-stone-400 mb-1">累計已還款</div>
            <div className="text-lg font-bold text-stone-800 font-mono">${schedule.filter(r => r.isPaid).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      {!expandedYear && (
        <div className="flex justify-between items-center px-2 pb-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-stone-400 uppercase font-bold">下期金額</span>
            <span className="font-mono font-bold text-stone-600 text-sm">${currentStatus?.amount.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-stone-400 uppercase font-bold">累計已還</span>
            <span className="font-mono font-bold text-stone-600 text-sm">${schedule.filter(r => r.isPaid).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      {expandedYear && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-hide animate-in slide-in-from-top-4 duration-300">
          {Object.entries(yearlyGroups).map(([year, rows]) => (
            <div key={year} className="border border-stone-100 rounded-xl overflow-hidden">
              <div onClick={(e) => { e.stopPropagation(); setExpandedYear(Number(year) === expandedYear ? 'overview' : Number(year)); }} className="bg-white/80 p-3 flex justify-between items-center text-xs font-bold text-stone-600 cursor-pointer hover:bg-stone-50">
                <span>{year}年度 ({rows.length}期)</span>
                {Number(year) === expandedYear ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>
              {Number(year) === expandedYear && (
                <div className="bg-white/50 backdrop-blur-sm">
                  <div className="grid grid-cols-5 text-[10px] text-stone-400 px-3 py-2 border-b border-stone-100 bg-stone-50/50">
                    <span>狀態</span><span>日期</span><span className="text-center">期數</span><span className="text-right">金額</span><span className="text-right">利率</span>
                  </div>
                  {rows.map(row => (
                    <div key={row.id} className={`grid grid-cols-5 text-xs px-3 py-2 border-b border-stone-100 last:border-0 items-center ${row.isPaid ? 'bg-emerald-50/30' : 'hover:bg-stone-50/30'}`}>
                      <span>{row.isPaid ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <span className="w-3 h-3 rounded-full border border-stone-200 block"></span>}</span>
                      <span className={`font-mono ${row.isPaid ? 'text-emerald-700 font-bold' : 'text-stone-500'}`}>{row.date.getMonth() + 1}月</span>
                      <span className="text-center text-stone-400">#{row.id}</span>
                      <span className="text-right font-bold font-mono ${row.isPaid ? 'text-emerald-700' : 'text-stone-700'}">${row.amount.toLocaleString()}</span>
                      <span className="text-right text-stone-400">{row.rate}%</span>
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
    <div className="bg-white/40 p-3 rounded-xl border border-white/40 mb-4">
      <h5 className="text-xs font-bold text-stone-500 mb-2">月度收入趨勢</h5>
      <div className="h-16 flex items-end gap-1">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
            <div className={`w-full min-w-[4px] rounded-t-sm transition-all duration-500 ${v > 0 ? theme.bg : 'bg-stone-100/50'}`} style={{ height: `${(v / max) * 100}%`, opacity: v > 0 ? 0.8 : 1 }}></div>
            {v > 0 && <div className="absolute bottom-full mb-1 text-[8px] font-bold text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-white/90 px-1 rounded shadow-sm">${(v / 1000).toFixed(0)}k</div>}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-stone-300 font-mono px-0.5">
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
              <h3 className="font-bold text-stone-700 text-lg">{name}</h3>
              <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">年度累計收入</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-stone-800 tracking-tight font-mono">${total.toLocaleString()}</div>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-300 ml-auto mt-1" /> : <ChevronDown className="w-4 h-4 text-stone-300 ml-auto mt-1" />}
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
              <h4 className="text-xs font-bold text-stone-500 uppercase flex items-center gap-2">
                <Coins className="w-3 h-3" /> 收入明細
              </h4>
              <GlassButton onClick={() => onAddIncome(owner)} className="px-2 py-1 text-xs" variant="ghost"><Plus className="w-3 h-3" /> 新增</GlassButton>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
              {incomes.map(inc => (
                <div key={inc.id} onClick={() => onAddIncome(owner, inc)} className="group relative flex justify-between items-center p-2.5 rounded-xl border border-stone-100 bg-white/40 hover:bg-white/70 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-1 h-8 rounded-full ${theme.bg} opacity-60`}></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-stone-700">{inc.category}</span>
                      <span className="text-[10px] text-stone-400 flex items-center gap-1">
                        {inc.date}
                        {inc.note && <span className="text-stone-500 max-w-[100px] truncate">• {inc.note}</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono font-bold ${theme.text}`}>+${Number(inc.amount).toLocaleString()}</span>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteIncome(inc.id); }} className="text-stone-300 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {incomes.length === 0 && <div className="text-center text-xs text-stone-300 py-4 flex flex-col items-center gap-2">尚無紀錄</div>}
            </div>
          </div>
        </div>
      )}
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
            <PieChart className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest">年度總預算</h2>
            <div className="text-xl sm:text-2xl font-bold text-stone-800 font-mono break-all line-clamp-1">${totalAnnualBudget.toLocaleString()}</div>
          </div>
        </div>
        <div className="flex flex-row gap-4 w-full">
          <div className="bg-stone-50/50 rounded-xl p-3 flex-1 overflow-hidden">
            <div className="text-[10px] text-stone-400 font-bold uppercase mb-1">已花費</div>
            <div className="text-base sm:text-lg font-bold text-stone-700 font-mono truncate">${totalAnnualUsed.toLocaleString()}</div>
          </div>
          <div className={`rounded-xl p-3 flex-1 overflow-hidden ${isOverBudget ? 'bg-rose-50/50' : 'bg-emerald-50/50'}`}>
            <div className={`text-[10px] font-bold uppercase mb-1 ${isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>{isOverBudget ? '超支' : '剩餘'}</div>
            <div className={`text-base sm:text-lg font-bold font-mono truncate ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>{isOverBudget ? '-' : ''}${Math.abs(totalRemaining).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><Calendar className="w-4 h-4" /></div>
          <div><h2 className="text-lg font-bold text-stone-800 leading-tight">月度預算</h2><p className="text-xs text-stone-400 font-bold tracking-wide uppercase">經常性支出</p></div>
        </div>
        <div className={`${GLASS_CARD} p-5 mb-4 relative overflow-hidden border-l-4 border-emerald-400`}>
          <BudgetProgressBar current={monthlyStats.totalUsed} total={monthlyStats.totalBudget} label="本月總剩餘" colorTheme="emerald" />
        </div>
        <div className="space-y-3">{monthlyStats.groups.map(g => (<GroupCard key={g.name} group={g} colorTheme="emerald" />))}</div>
      </section>
      <section>
        <div className="flex items-center gap-2 mb-4 px-1 mt-10">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><Target className="w-4 h-4" /></div>
          <div><h2 className="text-lg font-bold text-stone-800 leading-tight">年度預算</h2><p className="text-xs text-stone-400 font-bold tracking-wide uppercase">年度支出</p></div>
        </div>

        {/* Annual Summary - Same design as monthly */}
        <div className={`${GLASS_CARD} p-5 mb-4 relative overflow-hidden border-l-4 border-indigo-400`}>
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
        icon={Building2}
        totalLabel="總計"
        totalValue={totalDownPaymentExp}
        variant="amber"
        isCollapsible={true}
        defaultExpanded={false}
        itemRenderer={(item) => (
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-stone-700 text-sm block">{item.name}</span>
              <span className="text-[10px] text-stone-400">{formatDetailedDate(item.date)}</span>
              {item.note && <span className="text-xs text-stone-500 block mt-1">{item.note}</span>}
              {item.brand && <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded mt-1 inline-block">{item.brand}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-stone-700">${Number(item.amount).toLocaleString()}</span>
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
            <span className="text-sm text-stone-600 font-medium">{item.name}</span>
            <span className="font-mono font-bold text-stone-800">${Number(item.amount).toLocaleString()}</span>
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
                <span className="font-bold text-stone-700 text-sm">
                  {item.source || '資金來源'}
                  {item.symbol && <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-600 px-1 rounded">{item.symbol}</span>}
                </span>
                <span className="font-mono font-bold text-emerald-600">${itemTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-400">
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
              <span className="font-bold text-stone-700 text-sm block">{item.name}</span>
              <span className="text-[10px] text-stone-400">{formatDetailedDate(item.date)} {item.brand && `• ${item.brand}`}</span>
              {item.note && <span className="text-xs text-stone-500 block mt-1">{item.note}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-stone-700">${Number(item.amount).toLocaleString()}</span>
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
  for (let i = 0; i < startDay; i++) calendarCells.push(<div key={`pad-${i}`} className="h-24 bg-stone-50/20"></div>);
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const dateStr = toLocalISOString(currentDate);
    const dayTrans = transactions.filter(t => t.date === dateStr);
    const dayTotal = dayTrans.reduce((sum, t) => sum + Number(t.amount), 0);
    const isSelected = selectedDay === day;
    const isToday = getTodayString() === dateStr;
    calendarCells.push(
      <div key={day} onClick={() => setSelectedDay(day)} className={`h-24 border-t border-r border-stone-100/50 p-1 flex flex-col justify-between transition-colors cursor-pointer relative ${isSelected ? 'bg-stone-50/50 shadow-inner' : 'bg-white/30'} ${day % 7 === 0 ? 'border-r-0' : ''}`}>
        <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-stone-800 text-white' : 'text-stone-400'}`}>{day}</span>
        {dayTotal > 0 && (<div className="mb-1 flex flex-col items-end px-1 w-full"><span className="text-[10px] text-stone-400 font-medium">總計</span><span className={`text-[10px] font-bold truncate w-full text-right ${dayTrans.some(t => t.type === 'annual') ? 'text-amber-600' : 'text-stone-600'}`}>${dayTotal.toLocaleString()}</span></div>)}
        {isSelected && <div className="absolute inset-1 border-2 border-stone-400/50 rounded-lg pointer-events-none"></div>}
      </div>
    );
  }
  const selectedDateStr = selectedDay ? toLocalISOString(new Date(viewDate.getFullYear(), viewDate.getMonth(), selectedDay)) : null;
  const selectedTrans = selectedDateStr ? transactions.filter(t => t.date === selectedDateStr) : [];
  return (
    <div className="pb-24 animate-in fade-in duration-300 relative">
      <div className="flex justify-between items-center mb-4 px-2"><h2 className="text-xl font-bold text-stone-800">{viewDate.toLocaleString('zh-TW', { month: 'long', year: 'numeric' })}</h2><div className="flex gap-2"><button onClick={() => handleMonthChange(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-stone-100 text-stone-600"><ChevronLeft className="w-5 h-5" /></button><button onClick={() => handleMonthChange(1)} className="p-2 bg-white rounded-xl shadow-sm border border-stone-100 text-stone-600"><ChevronRight className="w-5 h-5" /></button></div></div>
      <div className={`${GLASS_CARD} p-0 border border-stone-100`}>
        <div className="grid grid-cols-7 bg-stone-50/50 border-b border-stone-100 rounded-t-3xl overflow-hidden">{['日', '一', '二', '三', '四', '五', '六'].map(d => (<div key={d} className="py-2 text-center text-xs font-bold text-stone-400 uppercase tracking-wider">{d}</div>))}</div>
        <div className="grid grid-cols-7 rounded-b-3xl overflow-hidden">{calendarCells}</div>
      </div>
      {/* Redesigned Daily Detail Panel */}
      {selectedDay && (
        <div className="mt-4 animate-in fade-in duration-200">
          <div className={`${GLASS_CARD} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-sm">
                  {selectedDay}
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-700">{selectedTrans.length} 筆消費</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-mono text-stone-800">${selectedTrans.reduce((s, t) => s + Number(t.amount), 0).toLocaleString()}</div>
              </div>
            </div>
            {selectedTrans.length === 0 ? (
              <div className="text-center py-6 text-stone-400 text-sm">當日無消費紀錄</div>
            ) : (
              <div className="space-y-2">
                {selectedTrans.map(t => (
                  <div
                    key={t.id}
                    onClick={() => onEdit && onEdit(t)}
                    className="flex items-center justify-between p-2 bg-stone-50/50 rounded-xl hover:bg-stone-100/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${t.type === 'annual' ? 'bg-amber-400' : 'bg-stone-400'}`}></span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 align-baseline">
                            <span className="text-sm font-bold text-stone-700 leading-tight">{t.note || t.category}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${t.payer === 'partner' ? 'bg-rose-100 text-rose-500' : 'bg-stone-100 text-stone-500'}`}>
                              {t.payer === 'partner' ? '佳欣' : '士程'}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-stone-400 mt-0.5">{t.group} / {t.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-mono font-medium text-stone-600">-${Number(t.amount).toLocaleString()}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTransaction(t.id); }}
                        className="p-1 text-stone-300 hover:text-rose-500 transition-colors"
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
      {onAddExpense && <button onClick={onAddExpense} className="fixed bottom-6 right-6 w-14 h-14 bg-stone-800 rounded-full shadow-2xl shadow-stone-400/50 flex items-center justify-center text-white hover:bg-stone-900 hover:scale-105 transition-all active:scale-95 z-50"><Plus className="w-6 h-6" /></button>}
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
        <PersonCard name="士程" owner="myself" incomes={myselfIncomes} total={myselfTotal} history={myselfHistory} icon={User} onAddSalary={onAddSalary} onDeleteSalary={onDeleteSalary} onDeleteIncome={onDeleteIncome} onAddIncome={onAddIncome} onEditSalary={onEditSalary} variant="blue" />
        <PersonCard name="佳欣" owner="partner" incomes={partnerIncomes} total={partnerTotal} history={partnerHistory} icon={Heart} onAddSalary={onAddSalary} onDeleteSalary={onDeleteSalary} onDeleteIncome={onDeleteIncome} onAddIncome={onAddIncome} onEditSalary={onEditSalary} variant="rose" />
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
        <div onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="flex justify-between items-center px-1 cursor-pointer select-none hover:bg-stone-50/50 p-2 rounded-xl transition-colors">
          <h3 className="font-bold text-stone-700 flex items-center gap-2"><Wallet className="w-4 h-4" /> 資金變動紀錄 {isHistoryOpen ? <ChevronUp className="w-3 h-3 text-stone-400" /> : <ChevronDown className="w-3 h-3 text-stone-400" />}</h3>
          <GlassButton onClick={(e) => { e.stopPropagation(); onAdd({}); }}><Plus className="w-3 h-3" /> 新增紀錄</GlassButton>
        </div>
        {isHistoryOpen && (partnerTransactions.length === 0 ? (<div className={`${GLASS_CARD} flex flex-col items-center justify-center h-48 text-stone-300 border-dashed`}><PiggyBank className="w-12 h-12 mb-2 opacity-20" /><p className="text-sm">尚無儲蓄紀錄</p></div>) : (groupedTransactions.map(([year, txs]) => (<PartnerYearGroup key={year} year={year} transactions={txs} onDelete={onDelete} onEdit={onEdit} />))))}
      </div>
    </div>
  );
};

const VisualizationView = ({ transactions, settings, onRequestHistory }) => {
  const [baseYear, setBaseYear] = useState(new Date().getFullYear());
  const [compareYear, setCompareYear] = useState(new Date().getFullYear() - 1);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null); // Drill-down state: month

  const [selectedFilter, setSelectedFilter] = useState(null); // { type: 'group'|'category', value: string }
  const [sortMode, setSortMode] = useState('amount'); // 'amount' | 'budget'
  const [expandedGroups, setExpandedGroups] = useState({}); // { groupName: boolean }

  useEffect(() => {
    // Dynamic History Loading: Ensure data for selected years is loaded
    if (onRequestHistory) {
      onRequestHistory(baseYear);
      onRequestHistory(compareYear);
    }
  }, [onRequestHistory, baseYear, compareYear]);

  const generateYearOptions = () => { const currentY = new Date().getFullYear(); const startY = 2020; const years = []; for (let y = currentY + 1; y >= startY; y--) { years.push(y); } return years; };
  const availableYears = useMemo(() => generateYearOptions(), []);

  const getMonthlyData = (year) => { const months = Array(12).fill(0); transactions.forEach(t => { const d = new Date(t.date); if (d.getFullYear() === year) { months[d.getMonth()] += Number(t.amount); } }); return months; };
  const baseData = useMemo(() => getMonthlyData(baseYear), [transactions, baseYear]);
  const compareData = useMemo(() => getMonthlyData(compareYear), [transactions, compareYear]);
  const maxVal = Math.max(...baseData, ...compareData, 1);

  // Filter breakdown data based on selected month or full year
  const breakdownData = useMemo(() => {
    if (isCompareMode) return [];

    const isBudgetSort = sortMode === 'budget';
    const stats = {};
    let total = 0;

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (d.getFullYear() === baseYear) {
        if (selectedMonth !== null && d.getMonth() !== selectedMonth) return; // Filter by month if selected

        const amount = Number(t.amount);
        total += amount;

        if (isBudgetSort) {
          // Hierarchical: Group -> Category
          const groupKey = t.group || '其他';
          if (!stats[groupKey]) stats[groupKey] = { value: 0, items: {} };
          stats[groupKey].value += amount;
          stats[groupKey].items[t.category] = (stats[groupKey].items[t.category] || 0) + amount;
        } else {
          // Flat: Category
          stats[t.category] = (stats[t.category] || 0) + amount;
        }
      }
    });

    if (!isBudgetSort) {
      // Flat Amount Sort
      return Object.entries(stats)
        .map(([name, value]) => ({ name, value, percent: total > 0 ? (value / total) * 100 : 0 }))
        .sort((a, b) => b.value - a.value);
    } else {
      // Budget Sort: Hierarchical
      // Order: Monthly Groups -> Annual Groups -> Others
      const monthlyOrder = (settings?.monthlyGroups || []).map(g => g.name);
      const annualOrder = (settings?.annualGroups || []).map(g => g.name);
      const fullOrder = [...monthlyOrder, ...annualOrder];

      // Build Item Order Map (Category -> Index inside Group)
      const itemOrderMap = {};
      [...(settings?.monthlyGroups || []), ...(settings?.annualGroups || [])].forEach(g => {
        g.items.forEach((item, idx) => { itemOrderMap[item.name] = idx; });
      });

      return Object.entries(stats).map(([gName, data]) => ({
        name: gName,
        value: data.value,
        percent: total > 0 ? (data.value / total) * 100 : 0,
        items: Object.entries(data.items).map(([cName, val]) => ({
          name: cName,
          value: val,
          percent: data.value > 0 ? (val / data.value) * 100 : 0
        })).sort((a, b) => {
          // Sort Items by Budget Order
          const idxA = itemOrderMap[a.name];
          const idxB = itemOrderMap[b.name];
          if (idxA === undefined && idxB === undefined) return b.value - a.value;
          if (idxA === undefined) return 1;
          if (idxB === undefined) return -1;
          return idxA - idxB;
        })
      })).sort((a, b) => {
        // Sort Groups
        let idxA = fullOrder.indexOf(a.name);
        let idxB = fullOrder.indexOf(b.name);
        if (idxA === -1 && idxB === -1) return b.value - a.value;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }
  }, [transactions, baseYear, isCompareMode, selectedMonth, sortMode, settings]);

  const monthlyDiffs = useMemo(() => { if (!isCompareMode) return []; return baseData.map((val, idx) => ({ month: idx + 1, base: val, compare: compareData[idx], diff: val - compareData[idx] })); }, [baseData, compareData, isCompareMode]);

  // Get detailed transactions for selected month/category
  const detailedTransactions = useMemo(() => {
    if (selectedMonth === null && selectedFilter === null) return [];

    return transactions.filter(t => {
      const d = new Date(t.date);
      const matchYear = d.getFullYear() === baseYear;
      const matchMonth = selectedMonth !== null ? d.getMonth() === selectedMonth : true;

      let matchFilter = true;
      if (selectedFilter) {
        if (selectedFilter.type === 'group') matchFilter = (t.group || '其他') === selectedFilter.value;
        else if (selectedFilter.type === 'category') matchFilter = t.category === selectedFilter.value;
      }

      return matchYear && matchMonth && matchFilter;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, baseYear, selectedMonth, selectedFilter]);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-stone-800">{isCompareMode ? '年度支出比較' : '年度支出分析'}</h2>
          <div className="flex items-center gap-2">
            {!isCompareMode && (
              <button
                onClick={() => { setSortMode(prev => prev === 'amount' ? 'budget' : 'amount'); setSelectedFilter(null); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${sortMode === 'budget' ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
              >
                {sortMode === 'budget' ? '排序: 預算' : '排序: 金額'}
              </button>
            )}
            <button onClick={() => { setIsCompareMode(!isCompareMode); setSelectedMonth(null); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isCompareMode ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}>
              {isCompareMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />} 比較模式
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="text-[10px] text-stone-400 font-bold uppercase mb-1 block">{isCompareMode ? '主年份' : '選擇年份'}</label>
            <select value={baseYear} onChange={(e) => { setBaseYear(Number(e.target.value)); setSelectedMonth(null); setSelectedFilter(null); }} className={`w-full ${GLASS_INPUT} px-3 py-2 font-bold text-stone-700`}>{availableYears.map(y => (<option key={y} value={y}>{y}</option>))}</select>
          </div>
          {isCompareMode && (<div className="flex-1 animate-in slide-in-from-right-2 duration-200"><label className="text-[10px] text-stone-400 font-bold uppercase mb-1 block">對比年份</label><select value={compareYear} onChange={(e) => setCompareYear(Number(e.target.value))} className={`w-full ${GLASS_INPUT} px-3 py-2 font-bold text-stone-500`}>{availableYears.map(y => (<option key={y} value={y}>{y}</option>))}</select></div>)}
        </div>

        <div className="h-64 flex items-end justify-between gap-0.5 mt-4 relative overflow-x-auto">
          {/* Background Grid */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div className="border-t border-dashed border-stone-100 w-full h-px"></div>
            <div className="border-t border-dashed border-stone-100 w-full h-px"></div>
            <div className="border-t border-dashed border-stone-100 w-full h-px"></div>
            <div className="border-t border-stone-200 w-full h-px"></div>
          </div>

          {baseData.map((val, idx) => (
            <div
              key={idx}
              onClick={() => { if (!isCompareMode) { setSelectedMonth(selectedMonth === idx ? null : idx); setSelectedFilter(null); } }}
              className={`flex-1 flex flex-col justify-end items-center h-full z-10 group relative ${!isCompareMode ? 'cursor-pointer' : ''}`}
            >
              {/* Value Label moved above the bar */}
              <div className="mb-2 text-[10px] font-bold text-stone-500 transition-all group-hover:scale-110 group-hover:text-stone-800">
                {isCompareMode ? (monthlyDiffs[idx]?.diff !== 0 && (
                  <span className={`flex items-center gap-0.5 ${monthlyDiffs[idx]?.diff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {monthlyDiffs[idx]?.diff > 0 ? '+' : ''}{Math.round(monthlyDiffs[idx]?.diff / 1000)}k
                  </span>
                )) : (
                  <span>{val > 0 ? `${Math.round(val / 1000)}k` : ''}</span>
                )}
              </div>

              {/* Bar */}
              <div className="w-full max-w-[20px] bg-stone-100 rounded-t-lg relative overflow-visible transition-all duration-500" style={{ height: `${maxVal > 0 ? (Math.max(0, val) / maxVal) * 100 : 0}%` }}>
                <div className={`absolute inset-x-0 bottom-0 top-0 rounded-t-lg transition-all duration-300 ${!isCompareMode && selectedMonth === idx ? 'bg-stone-800 shadow-lg shadow-stone-300' : 'bg-stone-300 group-hover:bg-stone-400'}`}></div>
                {isCompareMode && (
                  <div className="absolute inset-x-0 bottom-0 bg-stone-800/20 rounded-t-lg border-t border-stone-500/30" style={{ height: `${maxVal > 0 ? (Math.max(0, compareData[idx]) / maxVal) * 100 : 0}%` }}></div>
                )}
              </div>

              {/* X Axis Label */}
              <div className={`mt-2 text-[9px] font-bold transition-colors whitespace-nowrap ${selectedMonth === idx ? 'text-stone-800 scale-110' : 'text-stone-400 group-hover:text-stone-600'}`}>{idx + 1}</div>
            </div>
          ))}
        </div>
      </Card>

      {isCompareMode ? (
        <Card>
          <h3 className="text-sm font-bold text-stone-700 mb-4">每月差異分析 ({baseYear} vs {compareYear})</h3>
          <div className="space-y-3">
            {monthlyDiffs.map((item) => (
              <div key={item.month} className="flex justify-between items-center text-sm border-b border-stone-50 last:border-0 pb-2 last:pb-0">
                <span className="text-stone-500 w-8">{item.month}月</span>
                <div className="flex-1 px-4 text-xs text-gray-400 text-center">${item.base.toLocaleString()} vs ${item.compare.toLocaleString()}</div>
                <span className={`font-mono font-bold ${item.diff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{item.diff > 0 ? '+' : ''}{item.diff.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-stone-500 text-xs flex items-center gap-2 mb-1">
                    <div className="p-1 bg-stone-100 rounded-lg"><PieChart className="w-3 h-3 text-stone-500" /></div>
                    {selectedMonth !== null ? `${baseYear}年 ${selectedMonth + 1}月` : `${baseYear} 年度`} 支出組成
                    {(selectedMonth !== null || selectedFilter !== null) && <button onClick={(e) => { e.stopPropagation(); setSelectedMonth(null); setSelectedFilter(null); }} className="text-[10px] bg-stone-100 px-2 py-0.5 rounded-full text-stone-500 hover:bg-stone-200 ml-2">重設篩選</button>}
                  </h3>
                  <div className="text-3xl font-bold text-stone-800 tracking-tight">
                    ${(selectedMonth !== null ? baseData[selectedMonth] : baseData.reduce((a, b) => a + b, 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {breakdownData.length > 0 ? (
                sortMode === 'amount' ? (
                  /* Flat Amount List */
                  breakdownData.map((item) => (
                    <div key={item.name} onClick={() => setSelectedFilter(selectedFilter?.value === item.name ? null : { type: 'category', value: item.name })} className={`cursor-pointer transition-all hover:bg-stone-50 p-2 rounded-xl border border-transparent ${selectedFilter?.value === item.name ? 'bg-stone-50 border-stone-200' : ''}`}>
                      <div className="flex justify-between items-end mb-1 text-sm">
                        <span className="text-stone-600 font-medium">{item.name}</span>
                        <span className="font-bold text-stone-800">${item.value.toLocaleString()} <span className="text-xs text-stone-400 font-normal">({item.percent.toFixed(1)}%)</span></span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-stone-700 rounded-full transition-all duration-500" style={{ width: `${item.percent}%` }}></div>
                      </div>
                    </div>
                  ))
                ) : (
                  /* Budget Sort: Collapsible Groups */
                  breakdownData.map((group) => (
                    <div key={group.name} className={`rounded-xl border transition-all overflow-hidden ${selectedFilter?.value === group.name ? 'border-indigo-200 bg-indigo-50/30' : 'border-stone-100 bg-white'}`}>
                      <div
                        onClick={() => {
                          // Toggle Expand
                          setExpandedGroups(prev => ({ ...prev, [group.name]: !prev[group.name] }));
                          // Also select for analysis
                          setSelectedFilter({ type: 'group', value: group.name });
                        }}
                        className="p-3 cursor-pointer flex justify-between items-center hover:bg-stone-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex justify-between items-end mb-1 text-sm">
                            <span className="font-bold text-stone-700 flex items-center gap-2">
                              {group.name}
                              {expandedGroups[group.name] ? <ChevronUp className="w-3 h-3 text-stone-400" /> : <ChevronDown className="w-3 h-3 text-stone-400" />}
                            </span>
                            <span className="font-bold text-stone-800">${group.value.toLocaleString()} <span className="text-xs text-stone-400 font-normal">({group.percent.toFixed(1)}%)</span></span>
                          </div>
                          <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-stone-600 rounded-full transition-all duration-500" style={{ width: `${group.percent}%` }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Items */}
                      {expandedGroups[group.name] && (
                        <div className="bg-stone-50/50 p-2 space-y-1 border-t border-stone-100 animate-in slide-in-from-top-1">
                          {group.items.map(item => (
                            <div
                              key={item.name}
                              onClick={(e) => { e.stopPropagation(); setSelectedFilter({ type: 'category', value: item.name }); }}
                              className={`flex justify-between items-center text-xs p-2 rounded-lg cursor-pointer hover:bg-white transition-colors ${selectedFilter?.value === item.name ? 'bg-white shadow-sm ring-1 ring-indigo-100' : ''}`}
                            >
                              <span className="text-stone-600 font-medium">{item.name}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-stone-200 rounded-full h-1 overflow-hidden"><div className="h-full bg-stone-400 rounded-full" style={{ width: `${item.percent}%` }} /></div>
                                <span className="font-mono text-stone-600 w-12 text-right">${item.value.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )
              ) : (
                <div className="text-center text-stone-400 py-6 text-sm">該時段尚無支出資料</div>
              )}
            </div>
          </Card>

          {(selectedMonth !== null || selectedFilter !== null) && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-sm font-bold text-stone-500 mb-3 px-2">詳細明細 </h3>
              <div className="space-y-3">
                {detailedTransactions.map(t => (
                  <div key={t.id} onClick={() => { setNewTrans({ ...t, amount: t.amount }); setEditingId(t.id); setIsAddTxModalOpen(true); }} className={`${GLASS_CARD} p-4 flex justify-between items-center cursor-pointer hover:bg-white/60 transition-colors`}>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-stone-700">{t.category}</span>
                      <span className="text-xs text-stone-400">{formatDetailedDate(t.date)} {t.note && `• ${t.note}`}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-stone-800">${Number(t.amount).toLocaleString()}</span>
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

const PrincipalView = ({ user, db, appId, requestDelete, requestConfirmation }) => { const [config, setConfig] = useState(DEFAULT_PRINCIPAL_CONFIG); const [history, setHistory] = useState([]); const [loading, setLoading] = useState(true); const [snapshotDate, setSnapshotDate] = useState(getTodayString()); useEffect(() => { if (!user) return; const configRef = doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'principal_config'); onSnapshot(configRef, (s) => s.exists() ? setConfig(s.data()) : setDoc(configRef, DEFAULT_PRINCIPAL_CONFIG)); const historyRef = collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'principal_history'); const q = query(historyRef, orderBy('date', 'desc')); onSnapshot(q, (s) => { setHistory(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }); }, [user]); const updateItem = (section, group, idx, field, val) => { const newConfig = JSON.parse(JSON.stringify(config)); newConfig[section][group][idx][field] = field === 'amount' ? Number(val) : val; setConfig(newConfig); setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'principal_config'), newConfig); }; const addItem = (section, group) => { const newConfig = JSON.parse(JSON.stringify(config)); if (!newConfig[section][group]) newConfig[section][group] = []; newConfig[section][group].push({ name: '', amount: 0 }); setConfig(newConfig); setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'principal_config'), newConfig); }; const deleteItem = (section, group, idx) => { requestConfirmation({ message: '確定移除此項目？', onConfirm: () => { const newConfig = JSON.parse(JSON.stringify(config)); newConfig[section][group] = newConfig[section][group].filter((_, i) => i !== idx); setConfig(newConfig); setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'principal_config'), newConfig); } }); }; const handleAddSnapshot = () => { requestConfirmation({ message: `確定結算 ${snapshotDate} 的金額？`, title: '結算確認', onConfirm: async () => { const ta = (config.assets.bank || []).reduce((s, i) => s + Number(i.amount), 0) + (config.assets.invest || []).reduce((s, i) => s + Number(i.amount), 0); const tl = (config.liabilities.encumbrance || []).reduce((s, i) => s + Number(i.amount), 0); await addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'principal_history'), { date: new Date(snapshotDate).toISOString(), netPrincipal: ta - tl, details: config, createdAt: serverTimestamp() }); } }); }; const handleDeleteHistory = (id) => requestDelete('刪除此紀錄？', () => deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'principal_history', id))); return (<div className="pb-24 space-y-6 animate-in fade-in"><PrincipalTrendChart history={history} /><div className="flex flex-col gap-4"><div><h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 ml-1">存款組成 (Assets)</h3><AssetGroup title="銀行帳戶" items={config.assets.bank} section="assets" groupKey="bank" onUpdate={updateItem} onAdd={addItem} onDelete={deleteItem} /><AssetGroup title="投資項目" items={config.assets.invest} section="assets" groupKey="invest" onUpdate={updateItem} onAdd={addItem} onDelete={deleteItem} /></div><div><h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 ml-1">負債組成 (Liabilities)</h3><AssetGroup title="房價圈存" items={config.liabilities.encumbrance} section="liabilities" groupKey="encumbrance" onUpdate={updateItem} onAdd={addItem} onDelete={deleteItem} /></div></div><div className={`${GLASS_CARD} p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end`}><InputField label="結算日期" type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} className="w-full sm:flex-1" /><GlassButton onClick={handleAddSnapshot} className="w-full sm:flex-1 py-4 rounded-xl sm:h-[58px]"><Save className="w-5 h-5" /> 結算本期金額</GlassButton></div><div><h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2"><Clock className="w-3 h-3" /> 歷次結算紀錄</h3><div className="space-y-3">{history.map(rec => (<div key={rec.id} className="bg-white/60 p-4 rounded-xl border border-stone-100 flex justify-between items-center backdrop-blur-sm"><div><div className="font-bold text-stone-800">${rec.netPrincipal.toLocaleString()}</div><div className="text-[10px] text-stone-400">{new Date(rec.date).toLocaleDateString()}</div></div><button onClick={() => handleDeleteHistory(rec.id)}><X className="w-4 h-4 text-stone-300 hover:text-rose-400" /></button></div>))}</div></div></div>); };

const StockGoalView = ({ goals, exchanges, onUpdate, onAddYear, onDeleteExchange, onAddExchangeClick, onEditExchange }) => {
  const [activeTab, setActiveTab] = useState('goals');
  const sortedGoals = [...goals].sort((a, b) => b.year - a.year);
  const getEffectiveTotal = (g) => (Number(g?.firstrade) || 0) + (Number(g?.ib) || 0) + (Number(g?.withdrawal) || 0);
  const getActualTotal = (g) => (Number(g?.firstrade) || 0) + (Number(g?.ib) || 0);

  return (
    <div className="pb-24 animate-in fade-in">
      <div className="flex bg-stone-100 p-1 rounded-xl mb-6">
        <button onClick={() => setActiveTab('goals')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'goals' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'}`}>目標規劃</button>
        <button onClick={() => setActiveTab('exchange')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'exchange' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'}`}>換匯紀錄</button>
      </div>
      {activeTab === 'goals' ? (
        <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
          <div className="flex justify-end mb-2"><GlassButton onClick={onAddYear}><Plus className="w-3 h-3" /> 新增年份</GlassButton></div>
          {sortedGoals.length === 0 ? <div className="text-center text-stone-400 py-10">尚無資料 (從2022開始)</div> : sortedGoals.map((goal, index) => { const prevGoal = sortedGoals[index + 1]; const prevTotal = prevGoal ? getActualTotal(prevGoal) : 0; return <StockGoalCard key={goal.id} yearData={goal} prevYearTotal={prevTotal} onUpdate={onUpdate} />; })}
        </div>
      ) : (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
          {/* Enhanced Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`${GLASS_CARD} p-4 border-l-4 border-emerald-400`}>
              <div className="text-[10px] text-stone-400 uppercase font-bold mb-1">累計買入</div>
              <div className="text-lg font-bold text-emerald-600 font-mono">${(() => {
                const buyRecords = exchanges.filter(e => e.type !== 'sell');
                return buyRecords.reduce((sum, e) => sum + Number(e.usdAmount), 0).toLocaleString();
              })()} USD</div>
              <div className="text-[10px] text-stone-400 mt-1">
                平均買入匯率: {(() => {
                  const buyRecords = exchanges.filter(e => e.type !== 'sell');
                  const totalUSD = buyRecords.reduce((sum, e) => sum + Number(e.usdAmount), 0);
                  const totalTWD = buyRecords.reduce((sum, e) => sum + Number(e.usdAmount) * Number(e.rate), 0);
                  return totalUSD > 0 ? (totalTWD / totalUSD).toFixed(2) : '0';
                })()}
              </div>
            </div>
            <div className={`${GLASS_CARD} p-4 border-l-4 border-rose-400`}>
              <div className="text-[10px] text-stone-400 uppercase font-bold mb-1">累計賣出</div>
              <div className="text-lg font-bold text-rose-500 font-mono">${(() => {
                const sellRecords = exchanges.filter(e => e.type === 'sell');
                return sellRecords.reduce((sum, e) => sum + Number(e.usdAmount), 0).toLocaleString();
              })()} USD</div>
              <div className="text-[10px] text-stone-400 mt-1">
                平均賣出匯率: {(() => {
                  const sellRecords = exchanges.filter(e => e.type === 'sell');
                  const totalUSD = sellRecords.reduce((sum, e) => sum + Number(e.usdAmount), 0);
                  const totalTWD = sellRecords.reduce((sum, e) => sum + Number(e.usdAmount) * Number(e.rate), 0);
                  return totalUSD > 0 ? (totalTWD / totalUSD).toFixed(2) : '0';
                })()}
              </div>
            </div>
          </div>

          {/* Net Position Card */}
          <div className={`${GLASS_CARD} p-5 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200 rounded-full -mr-10 -mt-10 blur-xl opacity-40"></div>
            <div className="relative z-10">
              <div className="text-xs text-stone-400 uppercase font-bold mb-1">淨持有美金</div>
              <div className="text-2xl font-bold text-stone-800 font-mono">
                ${(() => {
                  const buyTotal = exchanges.filter(e => e.type !== 'sell').reduce((sum, e) => sum + Number(e.usdAmount), 0);
                  const sellTotal = exchanges.filter(e => e.type === 'sell').reduce((sum, e) => sum + Number(e.usdAmount), 0);
                  return (buyTotal - sellTotal).toLocaleString();
                })()} USD
              </div>
              {(() => {
                const buyRecords = exchanges.filter(e => e.type !== 'sell');
                const sellRecords = exchanges.filter(e => e.type === 'sell');
                const buyTWD = buyRecords.reduce((sum, e) => sum + Number(e.usdAmount) * Number(e.rate), 0);
                const sellTWD = sellRecords.reduce((sum, e) => sum + Number(e.usdAmount) * Number(e.rate), 0);
                const profit = sellTWD - (sellRecords.reduce((sum, e) => sum + Number(e.usdAmount), 0) * (buyRecords.length > 0 ? buyTWD / buyRecords.reduce((sum, e) => sum + Number(e.usdAmount), 0) : 0));
                if (sellRecords.length > 0) {
                  return (
                    <div className={`text-xs mt-2 font-bold ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      匯差損益: {profit >= 0 ? '+' : ''}${Math.round(profit).toLocaleString()} TWD
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          <div className="flex justify-between items-center px-1 mb-2">
            <h3 className="text-sm font-bold text-stone-500 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> 交易明細</h3>
            <GlassButton onClick={onAddExchangeClick}><Plus className="w-3 h-3" /> 新增換匯</GlassButton>
          </div>
          <div className="space-y-2">
            {exchanges.length === 0 ? <div className="text-center text-stone-400 py-10">尚無換匯紀錄</div> : exchanges.map(item => (<ExchangeItem key={item.id} item={item} onDelete={onDeleteExchange} onEdit={onEditExchange} />))}
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
      <div className="flex justify-between items-end mb-4 border-b border-stone-100 pb-2">
        <h3 className="text-lg font-bold text-stone-700">{title}</h3>
        <button onClick={handleSaveWrapper} className={`text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 font-bold ${isSaving ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-800 text-white hover:bg-stone-700'}`}>{isSaving ? <><Check className="w-3 h-3" /> 已儲存</> : '儲存變更'}</button>
      </div>
      <div className="space-y-4">
        {localGroups.map((group, gIdx) => (
          <div key={gIdx} className={`${GLASS_CARD} overflow-hidden p-0`}>
            <div className="bg-stone-50/50 p-4 flex justify-between items-center border-b border-stone-100">
              <span className="font-bold text-stone-600 text-sm flex items-center gap-2"><FolderOpen className="w-4 h-4 text-stone-400" /> {group.name}</span>
              <button onClick={() => deleteGroup(gIdx)} className="text-stone-300 hover:text-rose-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {group.items.map((item, iIdx) => (
                <div key={iIdx} onClick={() => handleEditItem(gIdx, iIdx)} className={`flex justify-between items-center text-sm border-b border-stone-50 last:border-0 pb-2 last:pb-0 cursor-pointer hover:bg-stone-50 p-2 rounded transition-colors ${editingSelection?.gIdx === gIdx && editingSelection?.iIdx === iIdx ? 'bg-blue-50 ring-1 ring-blue-100' : ''}`}>
                  <span className="text-stone-500 font-medium">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-stone-700 font-bold bg-stone-100 px-2 py-0.5 rounded-md">${Number(item.budget).toLocaleString()}</span>
                    <button onClick={(e) => { e.stopPropagation(); delItem(gIdx, iIdx); }} className="text-stone-200 hover:text-rose-400"><X className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 mt-3 pt-2">
                <input id={`${idPrefix}-n-${gIdx}`} placeholder="項目名稱" className={`${GLASS_INPUT} w-full text-xs py-2 px-3`} />
                <input id={`${idPrefix}-b-${gIdx}`} placeholder="$" type="number" className={`${GLASS_INPUT} w-20 text-xs py-2 px-3`} />
                <button onClick={() => handleItemSubmit(gIdx)} className={`text-white px-3 rounded-lg transition-colors ${editingSelection?.gIdx === gIdx ? 'bg-blue-600 hover:bg-blue-700' : 'bg-stone-800 hover:bg-stone-700'}`}>
                  {editingSelection?.gIdx === gIdx ? <RefreshCw className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="新增群組名稱..." className={`${GLASS_INPUT} flex-1 text-sm shadow-sm`} />
        <button onClick={addGroup} className="bg-white border border-stone-200 text-stone-600 px-5 rounded-xl shadow-sm hover:bg-stone-50 font-bold"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
};


// --- Recurring Expenses Manager ---
// --- Recurring Expenses Manager ---
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
          <span className="text-xs text-amber-700">可設定每月的入帳日 (1-31)。若當月無該日期 (如2月30日)，將自動紀錄於該月最後一天。</span>
        </div>

        {!isAdding && (
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {localItems.map(item => (
              <div key={item.id} onClick={() => handleEditClick(item)} className={`relative flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:border-indigo-300 transition-colors ${item.active ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-100 opacity-60'}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button onClick={(e) => { e.stopPropagation(); handleToggle(item.id); }} className={`p-1.5 rounded-full ${item.active ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-200 text-stone-400'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-700 truncate">{item.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${item.payer === 'partner' ? 'bg-rose-100 text-rose-500' : 'bg-stone-100 text-stone-500'}`}>{item.payer === 'partner' ? '佳欣' : '士程'}</span>
                    </div>
                    <span className="text-xs text-stone-400">每月 {item.day || 1} 日 • ${Number(item.amount).toLocaleString()} • {item.group}-{item.category}</span>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 text-stone-300 hover:text-rose-400"><X className="w-4 h-4" /></button>
              </div>
            ))}
            {localItems.length === 0 && <div className="text-center py-8 text-stone-400 text-sm">尚無設定項目</div>}
          </div>
        )}

        <div className="pt-4 border-t border-stone-100 space-y-3">
          {!isAdding ? (
            <button onClick={() => setIsAdding(true)} className="w-full py-3 bg-stone-50 text-stone-500 font-bold rounded-xl border border-stone-200 hover:bg-stone-100 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> 新增項目
            </button>
          ) : (
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 space-y-3 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-bold text-stone-400 uppercase">{editingId ? '編輯項目' : '新增項目'}</h4>
                <button onClick={handleCancelEdit} className="text-stone-400 hover:text-stone-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-6 gap-2">
                <input placeholder="名稱" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className={`${GLASS_INPUT} px-3 py-2 text-sm col-span-4`} />
                <div className="col-span-2 flex items-center bg-white/50 rounded-xl border border-stone-200 px-2 focus-within:ring-2 focus-within:ring-stone-400 focus-within:border-transparent transition-all">
                  <span className="text-xs text-stone-500 shrink-0 font-bold">每月</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newItem.day}
                    onChange={e => setNewItem({ ...newItem, day: e.target.value })}
                    className="w-full bg-transparent text-center font-bold text-stone-700 outline-none py-2 text-sm"
                    placeholder="1"
                  />
                  <span className="text-xs text-stone-500 shrink-0 font-bold">日</span>
                </div>
                <input type="number" placeholder="金額" value={newItem.amount} onChange={e => setNewItem({ ...newItem, amount: e.target.value })} className={`${GLASS_INPUT} px-3 py-2 text-sm col-span-6`} />

                <div className="relative col-span-3">
                  <select value={newItem.group} onChange={e => {
                    const g = (groups || []).find(grp => grp.name === e.target.value);
                    setNewItem({ ...newItem, group: e.target.value, category: g ? g.items[0]?.name : '' });
                  }} className={`${GLASS_INPUT} w-full px-3 py-2 text-sm appearance-none`}>
                    {(groups || []).map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -transtone-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
                </div>
                <div className="relative col-span-3">
                  <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className={`${GLASS_INPUT} w-full px-3 py-2 text-sm appearance-none`}>
                    {(groups || []).find(g => g.name === newItem.group)?.items.map(i => <option key={i.name} value={i.name}>{i.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -transtone-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
                </div>

                <div className="col-span-6 flex gap-2 pt-1">
                  <button onClick={() => setNewItem({ ...newItem, payer: 'myself' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${newItem.payer === 'myself' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-stone-200 text-stone-400'}`}>士程</button>
                  <button onClick={() => setNewItem({ ...newItem, payer: 'partner' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${newItem.payer === 'partner' ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-white border-stone-200 text-stone-400'}`}>佳欣</button>
                </div>

                <button onClick={handleSaveItem} disabled={!newItem.name || !newItem.amount} className="col-span-6 bg-stone-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-1 disabled:opacity-50 mt-2">
                  {editingId ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingId ? '確認修改' : '確認新增'}
                </button>
              </div>
            </div>
          )}
        </div>
        {!isAdding && <button onClick={handleSave} className="w-full bg-stone-800 text-white py-3 rounded-xl font-bold shadow-lg mt-4">儲存設定</button>}
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
          <div className="text-sm text-stone-500 mb-1">檢測到新的月份，是否加入以下固定支出？</div>
          <div className="text-2xl font-bold text-stone-800 font-mono">${total.toLocaleString()}</div>
        </div>
        <div className="space-y-2 bg-stone-50 p-3 rounded-xl max-h-[40vh] overflow-y-auto">
          {items.map(item => (
            <div key={item.id} className="flex justify-between items-center text-sm border-b border-stone-100 last:border-0 pb-2 last:pb-0">
              <span className="text-stone-600 font-medium">{item.name}</span>
              <span className="font-mono font-bold text-stone-700">${Number(item.amount).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 pt-2">
          <button onClick={onConfirm} className="w-full bg-stone-800 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> 確認入帳
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onClose} className="bg-white border border-stone-200 text-stone-600 py-3 rounded-xl font-bold">
              稍後提醒
            </button>
            <button onClick={onSkip} className="bg-stone-100 text-stone-500 py-3 rounded-xl font-bold text-xs">
              本月不入帳
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
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
  // Transaction Data Persistence Refs (Prevent white screen / load race conditions)
  const transactionSubsRef = useRef({});
  const transactionDataPartsRef = useRef({});
  const [extraYears, setExtraYears] = useState([]); // For Analysis View to request historical data


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

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', title: '確認', confirmText: '確定', confirmColor: 'bg-stone-800', onConfirm: () => { } });

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
  const [newExchange, setNewExchange] = useState({ date: getTodayString(), usdAmount: '', rate: '', account: 'FT', type: 'buy' });

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

  // 1. General Data Listeners (Run once per user)
  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    const createSub = (col, setter, order = 'date', dir = 'desc') => {
      const q = query(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, col), orderBy(order, dir));
      unsubs.push(onSnapshot(q, (s) => {
        const rawData = s.docs.map(d => ({ id: d.id, ...d.data() }));
        const seen = new Set();
        const uniqueData = [];
        rawData.forEach(item => {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            uniqueData.push(item);
          }
        });
        setter(uniqueData);
      }, (error) => console.error(`Error fetching ${col}:`, error)));
    };

    // createSub('transactions', setTransactions); // Managed separately
    createSub('incomes', setIncomes);
    createSub('salary_history', setSalaryHistory);
    createSub('partner_savings', setPartnerTransactions);
    createSub('mortgage_expenses', setMortgageExpenses);
    createSub('mortgage_funding', setMortgageFunding);
    createSub('mortgage_analysis', setMortgageAnalysis, 'createdAt', 'asc');
    createSub('stock_goals', setStockGoals, 'year', 'desc');
    createSub('usd_exchanges', setUsdExchanges);

    return () => {
      unsubs.forEach(u => u());
      // Cleanup transactions on user switch/unmount
      Object.values(transactionSubsRef.current).forEach(u => u());
      transactionSubsRef.current = {};
      transactionDataPartsRef.current = {};
    };
  }, [user]);

  // 2. Transaction Lazy Loader (Run on year change OR when extra years requested)
  useEffect(() => {
    if (!user) return;
    const year = selectedDate.getFullYear();
    const currentYear = new Date().getFullYear();
    // Ensure we load both selected year, current year, and any requested history
    const years = Array.from(new Set([year, currentYear, ...extraYears]));

    years.forEach(y => {
      if (transactionSubsRef.current[y]) return; // Skip if already subscribed

      const start = `${y}-01-01`;
      const end = `${y}-12-31`;
      const q = query(
        collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'transactions'),
        where('date', '>=', start),
        where('date', '<=', end)
      );

      transactionSubsRef.current[y] = onSnapshot(q, (snapshot) => {
        try {
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          if (transactionDataPartsRef.current) {
            transactionDataPartsRef.current[y] = docs;

            // Merge and Update State
            const allDocs = Object.values(transactionDataPartsRef.current).flat();
            // Defensive Sort: Handle potentially numeric, string, or Text dates
            allDocs.sort((a, b) => {
              const valA = a.date;
              const valB = b.date;
              const strA = (valA && typeof valA === 'object' && valA.toDate) ? valA.toDate().toISOString() : String(valA || '');
              const strB = (valB && typeof valB === 'object' && valB.toDate) ? valB.toDate().toISOString() : String(valB || '');
              return strB.localeCompare(strA);
            });
            setTransactions(allDocs);
          }
        } catch (err) {
          console.error("SafeSort Crash Prevented:", err);
        }
      });
    });
  }, [user, selectedDate.getFullYear(), extraYears]);

  const requestHistory = useCallback((year) => {
    setExtraYears(prev => {
      if (prev.includes(year)) return prev;
      return [...prev, year];
    });
  }, []);



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

        // Calculate dynamic date
        const day = parseInt(txData.day || 1);
        const [yearStr, monthStr] = currentMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const daysInMonth = new Date(year, month, 0).getDate();
        const validDay = Math.min(day, daysInMonth);
        const finalDate = `${currentMonth}-${validDay.toString().padStart(2, '0')}`;

        batch.push(addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'transactions'), {
          amount: Number(txData.amount),
          type: 'monthly',
          group: txData.group,
          category: txData.category,
          note: txData.name,
          date: finalDate,
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

  const requestConfirmation = ({ message, title = '確認', confirmText = '確定', confirmColor = 'bg-stone-800', onConfirm }) => {
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

  const handleAddExchange = (e) => {
    e.preventDefault(); withSubmission(async () => {
      if (editingId) {
        await setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'usd_exchanges', editingId), { ...newExchange, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'usd_exchanges'), { ...newExchange, createdAt: serverTimestamp() });
      }
      setNewExchange({ date: getTodayString(), usdAmount: '', rate: '', account: 'FT', type: 'buy' });
      setEditingId(null);
      setIsAddExchangeModalOpen(false);
    });
  };
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
    <div className="flex flex-col h-screen bg-[#F5F5F4] bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] text-stone-800 font-mono overflow-hidden max-w-md mx-auto relative shadow-2xl">
      {/* Background Blobs - Nippon Colors: 桜鼠 (Sakura-nezumi), 白藤 (Shiro-fuji), 若草 (Wakakusa) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-violet-200/30 rounded-full blur-[80px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-rose-200/25 rounded-full blur-[80px] pointer-events-none z-0"></div>
      <div className="absolute top-[40%] left-[20%] w-[60%] h-[30%] bg-emerald-100/20 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <ConfirmationModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmModal.onConfirm} message={confirmModal.message} title={confirmModal.title} confirmText={confirmModal.confirmText} confirmColor={confirmModal.confirmColor} />



      {/* Sidebar Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex animate-in slide-in-from-left duration-300">
          <div className="w-64 bg-white/95 backdrop-blur-xl h-full shadow-2xl p-6 relative border-r border-stone-100">
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-4 right-4 p-2 bg-stone-100 rounded-full text-stone-400 hover:bg-stone-200"><X className="w-4 h-4" /></button>
            <div className="mb-8 mt-2 px-2"><h1 className="text-xl font-bold text-stone-700 flex items-center gap-2"><img src={icon} className="w-8 h-8 rounded-lg shadow-md" alt="Logo" /> 記帳助手</h1><p className="text-xs text-stone-400 mt-1 pl-1">v1.0.0(Mick)</p></div>
            <div className="space-y-6">
              {MENU_SECTIONS.map(section => (
                <div key={section.title}>
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 px-2">{section.title}</h3>
                  <div className="space-y-1">
                    {section.items.map(item => (
                      <button key={item.id} onClick={() => handleViewChange(item.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${currentView === item.id ? 'bg-stone-800 text-white shadow-lg shadow-stone-300/50' : 'text-stone-500 hover:bg-stone-100'}`}>
                        <item.icon className={`w-4 h-4 ${currentView === item.id ? 'text-indigo-300' : ''}`} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-stone-900/20 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
        </div>
      )}

      <header className="bg-white/60 backdrop-blur-md px-4 py-4 flex items-center justify-between sticky top-0 z-20 border-b border-white/20">
        <div onClick={() => setIsMenuOpen(true)} className="p-2 glass-button rounded-xl cursor-pointer hover:bg-white/20 transition-all active:scale-95 z-20">
          <Menu className="w-5 h-5 text-stone-600" />
        </div>
        <div className="flex-1 flex justify-center z-10">
          <h1 className="text-base font-bold text-stone-700 tracking-wide flex items-center gap-2">
            {MENU_SECTIONS.flatMap(s => s.items).find(i => i.id === currentView)?.icon && React.createElement(MENU_SECTIONS.flatMap(s => s.items).find(i => i.id === currentView).icon, { className: "w-4 h-4 text-stone-500" })}
            {MENU_ITEMS_FLAT.find(i => i.id === currentView)?.label}
          </h1>
        </div>
        <div className="w-auto min-w-[36px] flex justify-end z-20">
          {(currentView === 'home' || currentView === 'income' || currentView === 'settings') ? (
            <div className="flex items-center bg-white/40 backdrop-blur-md rounded-full px-1 py-0.5 border border-white/20 shadow-sm">
              <button onClick={() => handleDateNavigate(-1)} className="p-1 hover:bg-white/50 rounded-full transition-colors"><ChevronLeft className="w-3 h-3 text-stone-600" /></button>
              <span className="text-xs font-bold text-stone-700 mx-1 font-mono whitespace-nowrap">{currentView === 'home' ? `${selectedDate.getMonth() + 1} 月` : `${selectedDate.getFullYear()} 年`}</span>
              {/* Note: Settings usually annual? If monthly, show month? Settings is 'Annual Configuration' mostly? Assumed Year. Home is Month? */}
              {/* Original logic: if income -> Year, else -> Month. Home shows Month. Settings should probably be Year? */}
              {/* But settings has config_2025. So Year makes sense. */}
              {/* Correct Logic: if (income OR settings) -> Year Navigator. if (home) -> Month Navigator. */}
              <button onClick={() => handleDateNavigate(1)} className="p-1 hover:bg-white/50 rounded-full transition-colors"><ChevronRight className="w-3 h-3 text-stone-600" /></button>
            </div>
          ) : null}
        </div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto p-5 scrollbar-hide relative z-10">
        {currentView === 'home' && <HomeView monthlyStats={monthlyStats} annualStats={annualStats} yearlyTotalStats={yearlyTotalStats} />}
        {/* 新增: Investment Watchlist */}
        {currentView === 'watchlist' && <WatchlistView user={user} db={db} appId={appId} requestConfirmation={requestConfirmation} />}
        {currentView === 'stock_goals' && <StockGoalView goals={stockGoals} exchanges={usdExchanges} onUpdate={handleUpdateStockGoal} onAddYear={handleAddStockGoalYear} onDeleteExchange={handleDeleteExchange} onAddExchangeClick={() => setIsAddExchangeModalOpen(true)} onEditExchange={(item) => { setNewExchange({ ...item }); setEditingId(item.id); setIsAddExchangeModalOpen(true); }} />}
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
        {currentView === 'visualization' && <VisualizationView transactions={transactions} settings={settings} onRequestHistory={requestHistory} />}
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

      {currentView === 'home' && (<button onClick={() => setIsAddTxModalOpen(true)} className="absolute bottom-8 right-6 w-14 h-14 bg-stone-800 rounded-full shadow-2xl shadow-stone-400/50 flex items-center justify-center text-white hover:bg-stone-900 hover:scale-105 transition-all active:scale-95 z-30"><Plus className="w-6 h-6" /></button>)}



      {/* --- Modals --- */}
      {isAddTxModalOpen && (
        <ModalWrapper title={editingId ? "編輯支出" : "新增支出"} onClose={() => { setIsAddTxModalOpen(false); setEditingId(null); setNewTrans({ amount: '0', type: 'monthly', group: '', category: '', note: '', date: getTodayString(), payer: 'myself' }); }}>
          {/* 檢查是否有設定預算群組，若無則提示 */}
          {(settings.monthlyGroups.length === 0 && settings.annualGroups.length === 0) ? (
            <div className="text-center py-10">
              <p className="text-stone-500 mb-4">請先設定預算分類</p>
              <GlassButton onClick={() => { setIsAddTxModalOpen(false); setCurrentView('settings'); }}>前往設定</GlassButton>
            </div>
          ) : (
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="flex justify-end">
                <button type="button" onClick={() => setIsRecurringManagerOpen(true)} className="text-xs text-stone-500 underline flex items-center gap-1 hover:text-stone-800"><SettingsIcon className="w-3 h-3" />管理固定支出</button>
              </div>
              <CalculatorInput
                value={newTrans.amount}
                onChange={(val) => setNewTrans({ ...newTrans, amount: val })}
                label="金額"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-stone-100/50 p-1 rounded-2xl flex">
                  <button type="button" onClick={() => setNewTrans({ ...newTrans, type: 'monthly', group: '' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${newTrans.type === 'monthly' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'}`}>月度</button>
                  <button type="button" onClick={() => setNewTrans({ ...newTrans, type: 'annual', group: '' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${newTrans.type === 'annual' ? 'bg-white shadow-sm text-stone-600' : 'text-stone-400'}`}>年度</button>
                </div>
                <div className="bg-stone-100/50 p-1 rounded-2xl flex">
                  <button type="button" onClick={() => setNewTrans({ ...newTrans, payer: 'myself' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${newTrans.payer === 'myself' ? 'bg-white shadow-sm text-blue-600' : 'text-stone-400'}`}>士程</button>
                  <button type="button" onClick={() => setNewTrans({ ...newTrans, payer: 'partner' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${newTrans.payer === 'partner' ? 'bg-white shadow-sm text-rose-500' : 'text-stone-400'}`}>佳欣</button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <select value={newTrans.group} onChange={(e) => setNewTrans({ ...newTrans, group: e.target.value, category: '' })} className={`w-full p-4 pl-12 ${GLASS_INPUT} text-stone-700 font-medium appearance-none`}>
                    {(newTrans.type === 'monthly' ? settings.monthlyGroups : settings.annualGroups).map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                  </select>
                  <FolderOpen className="absolute left-4 top-1/2 -transtone-y-1/2 w-4 h-4 text-stone-400 pointer-events-none z-10" />
                  <ChevronDown className="absolute right-4 top-1/2 -transtone-y-1/2 w-4 h-4 text-stone-300 pointer-events-none z-10" />
                </div>
                <div className="relative">
                  <select value={newTrans.category} onChange={(e) => setNewTrans({ ...newTrans, category: e.target.value })} className={`w-full p-4 pl-12 ${GLASS_INPUT} text-stone-700 font-medium appearance-none`}>
                    {(newTrans.type === 'monthly' ? settings.monthlyGroups : settings.annualGroups).find(g => g.name === newTrans.group)?.items.map(i => <option key={i.name} value={i.name}>{i.name}</option>)}
                  </select>
                  <Hash className="absolute left-4 top-1/2 -transtone-y-1/2 w-4 h-4 text-stone-400 pointer-events-none z-10" />
                  <ChevronDown className="absolute right-4 top-1/2 -transtone-y-1/2 w-4 h-4 text-stone-300 pointer-events-none z-10" />
                </div>
              </div>

              <div className="flex flex-col gap-3 min-w-0">
                <div className="w-full">
                  <InputField type="date" value={newTrans.date} onChange={(e) => setNewTrans({ ...newTrans, date: e.target.value })} required />
                </div>
                <div className="w-full relative">
                  <InputField value={newTrans.note} onChange={(e) => setNewTrans({ ...newTrans, note: e.target.value })} placeholder="備註..." />
                  <PenTool className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-300 pointer-events-none z-10" />
                </div>
              </div>

              <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4 shadow-xl shadow-stone-300/50">{isSubmitting ? '處理中...' : '確認儲存'}</GlassButton>
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
            <div className="space-y-1.5"><label className="block text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">分類</label><div className="relative"><select value={newIncome.category} onChange={(e) => setNewIncome({ ...newIncome, category: e.target.value })} className={`w-full p-4 ${GLASS_INPUT} text-stone-800 font-medium outline-none appearance-none text-sm`}>{INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
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
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider ml-1 mb-1">金額</label>
              <div className="relative"><input type="number" value={newPartnerTx.amount} onChange={(e) => setNewPartnerTx({ ...newPartnerTx, amount: e.target.value })} className={`w-full p-4 ${GLASS_INPUT} text-stone-800 font-medium outline-none text-sm`} placeholder="0" autoFocus required /></div>
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">{[10000, 25000, 30000, 50000].map(amt => (<button key={amt} type="button" onClick={() => setNewPartnerTx({ ...newPartnerTx, amount: amt })} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold text-stone-600 whitespace-nowrap transition-colors">${amt.toLocaleString()}</button>))}</div>
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
        <ModalWrapper title={editingId ? "編輯換匯紀錄" : "新增換匯紀錄"} onClose={() => { setIsAddExchangeModalOpen(false); setEditingId(null); setNewExchange({ date: getTodayString(), usdAmount: '', rate: '', account: 'FT', type: 'buy' }); }}>
          <form onSubmit={handleAddExchange} className="space-y-4">
            {/* Buy/Sell Toggle */}
            <div className="flex gap-2">
              <GlassButton type="button" onClick={() => setNewExchange({ ...newExchange, type: 'buy' })} variant={newExchange.type === 'buy' ? 'success' : 'ghost'} className="flex-1">買入美金</GlassButton>
              <GlassButton type="button" onClick={() => setNewExchange({ ...newExchange, type: 'sell' })} variant={newExchange.type === 'sell' ? 'danger' : 'ghost'} className="flex-1">賣出美金</GlassButton>
            </div>
            {/* Account Toggle */}
            <div className="flex gap-2">
              <GlassButton type="button" onClick={() => setNewExchange({ ...newExchange, account: 'FT' })} variant={newExchange.account === 'FT' ? 'primary' : 'ghost'} className="flex-1">Firstrade</GlassButton>
              <GlassButton type="button" onClick={() => setNewExchange({ ...newExchange, account: 'IB' })} variant={newExchange.account === 'IB' ? 'primary' : 'ghost'} className="flex-1">IB</GlassButton>
            </div>
            <InputField label={newExchange.type === 'sell' ? "賣出美金 (USD)" : "買入美金 (USD)"} type="number" value={newExchange.usdAmount} onChange={e => setNewExchange({ ...newExchange, usdAmount: e.target.value })} autoFocus required />
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
        groups={settings.monthlyGroups}
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