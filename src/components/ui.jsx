import { useState, useEffect, useRef } from 'react';
import { Wallet, RefreshCw } from 'lucide-react';
import { GLASS_CARD } from '../lib/constants';


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
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl glass-card-fx bg-white border flex items-center justify-center mb-8 animate-pulse">
          <Wallet className="w-10 h-10 text-slate-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-6 tracking-wide">記帳助手</h1>
        <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-500 ease-out"
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

export { ConfirmationModal, LoadingScreen, ViewLoader };
