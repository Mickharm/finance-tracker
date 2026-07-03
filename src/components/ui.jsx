import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, X, PieChart, ChevronDown, ChevronUp, Wallet, Clock, RefreshCw } from 'lucide-react';
import { COLOR_VARIANTS, GLASS_CARD, GLASS_INPUT } from '../lib/constants';
import { evalArithmetic, formatThousands } from '../lib/utils';


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

const ModalWrapper = ({ title, onClose, children }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    // Single source of truth: scroll focused input into view inside modal
    // Delay ensures keyboard has finished animating before we reposition
    const handleFocusIn = (e) => {
      const el = e.target;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };
    modal.addEventListener('focusin', handleFocusIn);

    // Visual Viewport resize: push modal up so it sits above the software keyboard.
    // Only adjust marginBottom — do NOT touch maxHeight to avoid layout thrash / jitter.
    const vv = window.visualViewport;
    let rafId = null;
    const handleResize = () => {
      if (!vv) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!modal) return;
        const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
        modal.style.marginBottom = keyboardHeight > 50 ? `${keyboardHeight}px` : '';
      });
    };

    if (vv) vv.addEventListener('resize', handleResize);

    return () => {
      modal.removeEventListener('focusin', handleFocusIn);
      if (vv) vv.removeEventListener('resize', handleResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div
        ref={modalRef}
        className="relative w-full max-h-[85vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-10 animate-in slide-in-from-bottom duration-300 overflow-y-auto bg-white/90 backdrop-blur-2xl shadow-2xl"
        style={{ transition: 'margin-bottom 0.2s ease-out' }}
      >
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
};

const LoadingScreen = ({ progress, isComplete, onDone }) => {
  const [displayProgress, setDisplayProgress] = useState(15);
  const [statusText, setStatusText] = useState('載入資料中...');
  const doneCalledRef = useRef(false);

  useEffect(() => {
    setDisplayProgress(prev => Math.max(prev, isComplete ? 100 : progress));
  }, [progress, isComplete]);

  useEffect(() => {
    if (isComplete && !doneCalledRef.current) {
      doneCalledRef.current = true;
      setStatusText('完成');
      const timer = setTimeout(() => {
        onDone();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onDone]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center app-bg">
      <div className="bg-blob absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-[#CDEBFB]/45 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="bg-blob absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-[#D8E4FA]/40 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="bg-blob absolute top-[40%] left-[20%] w-[60%] h-[30%] bg-[#E4F5FB]/40 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-white/80 backdrop-blur-xl shadow-lg shadow-slate-200/50 flex items-center justify-center mb-8 animate-pulse">
          <Wallet className="w-10 h-10 text-slate-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-700 mb-6 tracking-tight">記帳助手</h1>
        <div className="w-48 h-1.5 bg-slate-200/60 rounded-full overflow-hidden backdrop-blur-sm">
          <div
            className="h-full bg-gradient-to-r from-slate-400 to-slate-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(displayProgress, 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-3 tabular-nums">{statusText}</p>
      </div>
    </div>
  );
};

// Shown while a secondary tab's data is still loading (distinguishes "loading" from "empty").
const ViewLoader = ({ label = '載入中...' }) => (
  <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-in fade-in duration-300">
    <RefreshCw className="w-6 h-6 animate-spin mb-3 text-slate-300" />
    <span className="text-sm font-bold">{label}</span>
  </div>
);

const InputField = ({ label, type = "text", value, onChange, placeholder, required = false, autoFocus = false, children, className = "", ...props }) => {
  // scrollIntoView is handled centrally by ModalWrapper's focusin listener.
  // Removed per-field handler to prevent double-fire jitter.
  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {label && <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>}
      <div className="relative w-full min-w-0">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          className={GLASS_INPUT}
          inputMode={type === 'number' ? 'decimal' : undefined}
          autoComplete={type === 'number' ? 'off' : undefined}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          {...props}
        />
        {children}
      </div>
    </div>
  );
};

// 常用備註快捷：統計歷史紀錄中最常出現的備註，一鍵帶入。
// （新增支出視窗另有含「分類連動」的進階版；其餘表單共用這個。）
const NoteQuickPicks = ({ records, onPick, label = '常用備註' }) => {
  const top = useMemo(() => {
    const stats = {};
    (records || []).forEach(r => {
      const n = (r.note || '').trim();
      if (!n) return;
      stats[n] = (stats[n] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
  }, [records]);

  if (top.length === 0) return null;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5 mb-2 ml-1">
        <Clock className="w-3 h-3 text-slate-300" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {top.map(note => (
          <button
            key={note}
            type="button"
            onClick={() => onPick(note)}
            className="flex-shrink-0 px-4 py-2 bg-white/50 hover:bg-white/80 text-slate-600 rounded-xl text-xs font-bold transition-all active:scale-95 border border-white/60 backdrop-blur-xl"
          >
            {note}
          </button>
        ))}
      </div>
    </div>
  );
};

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
      const result = Math.round(evalArithmetic(displayValue));
      newVal = result.toString();
      setExpression('');
      onChange(newVal);
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
      if (String(displayValue) === '0' && !expression && btn !== '.') {
        newVal = btn;
      } else {
        newVal = String(displayValue) + btn;
      }
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
        if (!isNaN(Number(part))) {
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
          <div className="text-3xl font-bold text-slate-800 tabular-nums tracking-tight whitespace-nowrap">
            {formatDisplay(displayValue)}
          </div>
          {expression && <div className="text-xs text-slate-400 tabular-nums h-4 opacity-0">.</div>}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {buttons.flat().map((btn, idx) => (
            <button
              key={`${btn}-${idx}`}
              type="button"
              onClick={() => handleButton(btn === '÷' ? '/' : btn === '×' ? '*' : btn)}
              className={`py-3.5 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-sm
                ${btn === 'AC' ? 'bg-[#FDECEA] text-[#C0392B]' :
                  btn === '⌫' ? 'bg-[#FEF9E7] text-[#9A7D0A]' :
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
    primary: "bg-slate-700 text-white shadow-lg shadow-slate-400/30 hover:bg-slate-800",
    danger: "bg-[#FDECEA] text-[#C0392B] border border-[#FADBD8] hover:bg-[#FADBD8]",
    success: "bg-[#F1FAEE] text-[#2D6A4F] border border-[#D8F3DC] hover:bg-[#D8F3DC]",
    ghost: "bg-white/60 text-slate-600 hover:bg-white/90 border border-slate-200/60"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`relative overflow-hidden px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm ${variants[variant]} ${className}`}>{children}</button>
  );
};

const BudgetProgressBar = ({ current, total, label, variant = 'main', colorTheme = 'slate', showDetails = true, showOverBudgetLabel = true }) => {
  const remaining = total - current;
  const isOverBudget = remaining < 0;
  const remainingPercentage = total > 0 ? (Math.max(0, remaining) / total) * 100 : 0;
  // 剩餘不到 10%（含超支）→ 進度條呼吸光警示
  const isCritical = total > 0 && remaining / total < 0.10;

  const theme = COLOR_VARIANTS[colorTheme] || COLOR_VARIANTS.slate;

  let statusColor = theme.bar;
  if (!isOverBudget && total > 0) {
    if (remainingPercentage < 20) statusColor = 'bg-[#E59A8E]';
    else if (remainingPercentage < 50) statusColor = 'bg-[#E8BE6E]';
    else statusColor = theme.bar;
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${theme.text} opacity-80 flex items-center gap-2`}>
          {label}
          {isOverBudget && showOverBudgetLabel && <span className="bg-[#FDECEA] text-[#C0392B] text-[10px] px-1.5 py-0.5 rounded-md shadow-sm">已超支</span>}
        </span>
        {showDetails && (
          <div className="flex items-baseline gap-1 text-right">
            <span className={`text-[10px] font-medium whitespace-nowrap ${isOverBudget ? 'text-[#E57373]' : 'text-slate-400'}`}>{isOverBudget ? '已超支' : '剩餘'}</span>
            <span className={`tabular-nums font-bold ${isOverBudget ? 'text-[#C0392B]' : 'text-slate-700'} ${Math.abs(remaining) > 1000000 ? 'text-sm' : ''}`}>{isOverBudget ? '-' : ''}${Math.abs(remaining).toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className={`w-full bg-slate-100/50 rounded-full h-1.5 overflow-hidden ${isCritical ? 'budget-alert-glow' : ''}`}>
        <div className={`h-full transition-all duration-1000 ease-out ${statusColor}`} style={{ width: `${remainingPercentage}%` }} />
      </div>
      {showDetails && variant === 'main' && (
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 font-medium">
          <span className={isOverBudget ? 'text-[#E57373]' : ''}>{Math.round(remainingPercentage)}% 剩餘</span>
          <span>總額: ${total.toLocaleString()}</span>
        </div>
      )}
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
  const pts = data.map((d, i) => ({ x: padding + (i / (data.length - 1)) * (width - 2 * padding), y: height - padding - ((d.netPrincipal - minVal) / range) * (height - 2 * padding) }));
  const lineStr = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaD = `M${pts[0].x},${height - padding} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},${height - padding} Z`;
  const currentNet = values[values.length - 1]; const prevNet = values.length > 1 ? values[values.length - 2] : currentNet; const growth = currentNet - prevNet;
  return (
    <div className={`${GLASS_CARD} p-6 mb-6 relative overflow-hidden`}><div className="relative z-10 mb-4"><h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">資產淨值趨勢</h2><div className="flex items-baseline gap-2"><div className="text-3xl font-bold text-slate-800 tabular-nums tracking-tight">${currentNet.toLocaleString()}</div>{growth !== 0 && (<span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${growth > 0 ? 'bg-[#F1FAEE] text-[#2D6A4F]' : 'bg-[#FDECEA] text-[#C0392B]'}`}>{growth > 0 ? '+' : ''}{growth.toLocaleString()}</span>)}</div></div><div className="w-full h-32 relative"><svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none"><defs><linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5A7099" stopOpacity="0.3" /><stop offset="100%" stopColor="#5A7099" stopOpacity="0" /></linearGradient></defs><line className="chart-grid" x1={padding} y1={padding} x2={width - padding} y2={padding} strokeWidth="0.5" strokeDasharray="2" /><line className="chart-grid" x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} strokeWidth="0.5" strokeDasharray="2" /><path d={areaD} fill="url(#netGrad)" /><polyline points={lineStr} fill="none" stroke="#5A7099" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />{pts.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 2 : 1} className={i === pts.length - 1 ? "fill-[#5A7099]" : "fill-white stroke-[#5A7099] stroke-[0.5]"} />))}</svg></div><div className="flex justify-between text-[10px] text-slate-400 tabular-nums mt-1 px-1"><span>{new Date(data[0].date).toLocaleDateString()}</span><span>{new Date(data[data.length - 1].date).toLocaleDateString()}</span></div></div>
  );
};

const CleanSummaryCard = ({ title, value, subValue, icon: Icon, trend, variant = 'slate' }) => {
  const theme = COLOR_VARIANTS[variant] || COLOR_VARIANTS.slate;
  return (<div className={`${GLASS_CARD} p-6 mb-6 ${theme.glow}`}><div className="flex justify-between items-start mb-2"><div className={`p-2 rounded-xl ${theme.iconBg} ${theme.iconText}`}>{Icon ? <Icon className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}</div>{trend && <span className={`bg-slate-50/50 text-slate-500 text-[10px] px-2 py-1 rounded-full font-bold`}>{trend}</span>}</div><div><h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</h2><div className="text-3xl font-bold text-slate-800 tabular-nums tracking-tight">${value}</div>{subValue && <div className="text-xs text-slate-400 mt-1">{subValue}</div>}</div></div>);
};

const GroupCard = ({ group, colorTheme = 'slate' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = COLOR_VARIANTS[colorTheme] || COLOR_VARIANTS.slate;
  const isOverBudget = group.used > group.budget;
  const remaining = group.budget - group.used;
  const remainingPercentage = group.budget > 0 ? (Math.max(0, remaining) / group.budget) * 100 : 0;
  const isCritical = group.budget > 0 && remaining / group.budget < 0.10;

  let statusBarColor = theme.bar;
  if (!isOverBudget && group.budget > 0) {
    if (remainingPercentage < 20) statusBarColor = 'bg-[#E59A8E]';
    else if (remainingPercentage < 50) statusBarColor = 'bg-[#E8BE6E]';
    else statusBarColor = theme.bar; // Theme Color
  }

  return (
    <div className={`${GLASS_CARD} p-5 hover:border-slate-300 transition-all duration-300`}>
      <div className="flex flex-col cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${theme.iconBg} ${theme.iconText}`}>{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
            <h3 className="text-sm font-bold text-slate-700 tracking-tight">{group.name}</h3>
            {isOverBudget && <span className="bg-[#FDECEA] text-[#C0392B] text-[10px] px-1.5 py-0.5 rounded-full font-bold">已超支</span>}
          </div>
          <div className="text-right flex items-baseline gap-1">
            <span className="text-[10px] text-slate-400">剩餘</span>
            <span className={`text-sm tabular-nums font-bold ${isOverBudget ? 'text-[#C0392B]' : 'text-slate-800'}`}>{isOverBudget ? '-' : ''}${Math.abs(remaining).toLocaleString()}</span>
          </div>
        </div>
        <div className={`w-full bg-slate-100/50 rounded-full h-1.5 overflow-hidden ${isCritical ? 'budget-alert-glow' : ''}`}>
          <div className={`h-full transition-all duration-500 ${statusBarColor}`} style={{ width: `${remainingPercentage}%` }} />
        </div>
      </div>
      {isExpanded && (<div className="mt-5 pl-2 space-y-3 animate-in slide-in-from-top-1 duration-200 border-t border-slate-100/50 pt-3">{group.items.map((item, idx) => {
        const itemRemaining = item.budget - item.used;
        const itemIsOver = itemRemaining < 0;
        const itemPercent = item.budget > 0 ? (Math.max(0, itemRemaining) / item.budget) * 100 : 0;
        return (
          <div key={idx}>
            <div className="flex justify-between text-xs mb-1.5 font-medium text-slate-500">
              <span>{item.name}</span>
              <span className={`tabular-nums ${itemIsOver ? 'text-[#C0392B]' : 'text-slate-400'}`}>{itemIsOver ? '-' : ''}${Math.abs(itemRemaining).toLocaleString()}</span>
            </div>
            <div className={`w-full bg-slate-100/50 rounded-full h-1 overflow-hidden ${item.budget > 0 && itemRemaining / item.budget < 0.10 ? 'budget-alert-glow' : ''}`}>
              <div className={`h-full transition-all duration-500 ${!itemIsOver && item.budget > 0
                ? (itemPercent < 20 ? 'bg-[#E59A8E]' : itemPercent < 50 ? 'bg-[#E8BE6E]' : theme.bar)
                : theme.bar
                }`} style={{ width: `${itemPercent}%` }} />
            </div>
          </div>
        );
      })}</div>)}
    </div>
  );
};
const AmountInput = ({ value, onCommit, className = '', placeholder = '0', autoFocus = false, commitOnChange = false }) => {
  const [text, setText] = useState(() => (value === '' || value === undefined || value === null) ? '' : formatThousands(String(value)));
  useEffect(() => {
    setText((value === '' || value === undefined || value === null) ? '' : formatThousands(String(value)));
  }, [value]);
  const handleChange = (e) => {
    let raw = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
    setText(formatThousands(raw));
    if (commitOnChange) onCommit(raw); // live commit for cheap (local) state, avoids blur race with buttons
  };
  return (
    <input
      type="text" inputMode="decimal" value={text} onChange={handleChange}
      onBlur={() => { if (!commitOnChange) onCommit(text.replace(/,/g, '')); }}
      onFocus={(e) => e.target.select()} autoFocus={autoFocus}
      className={className} placeholder={placeholder}
    />
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
            <h3 className="font-bold text-slate-700">{title}</h3>
            {!isExpanded && totalLabel && (
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{totalLabel}: </span>
                <span className="tabular-nums font-bold text-slate-600">${totalValue.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(!isCollapsible || isExpanded) && <GlassButton onClick={(e) => { e.stopPropagation(); onAdd(type); }} className="text-xs px-2 py-1"><Plus className="w-3 h-3" /> 新增</GlassButton>}
          {isCollapsible && (isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 pt-5 animate-in slide-in-from-top-2 duration-200 border-t border-white/10">
          <div className="space-y-3">
            {items.length === 0 ? <p className="text-center text-xs text-slate-300 py-4">無紀錄</p> : items.map((item) => (
              <div key={item.id} onClick={() => onEdit && onEdit(item)} className={`border-b border-white/20 last:border-0 pb-3 last:pb-0 group relative pr-8 ${onEdit ? 'cursor-pointer hover:bg-white/30 rounded-lg p-2 transition-colors' : ''}`}>
                {itemRenderer(item)}
                <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="absolute top-1/2 -translate-y-1/2 right-2 z-10 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {totalLabel && (
            <div className="mt-4 pt-3 border-t border-white/20 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{totalLabel}</span>
              <span className="text-xl font-bold text-slate-800 tabular-nums">${totalValue.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { ConfirmationModal, ModalWrapper, LoadingScreen, ViewLoader, InputField, NoteQuickPicks, CalculatorInput, GlassButton, BudgetProgressBar, Card, PrincipalTrendChart, CleanSummaryCard, GroupCard, AmountInput, StandardList };
