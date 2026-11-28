import { useState, useEffect, useRef } from 'react';
import { Wallet } from 'lucide-react';
import { Aurora, modalExit, useGhostExit } from './glass';

// 確認對話框：玻璃卡從中間彈出來
const ConfirmCard = ({ onClose, onConfirm, message, title, confirmText, danger }) => {
  const rootRef = useRef(null);
  useGhostExit(rootRef, modalExit);
  return (
    <div ref={rootRef} className="fixed inset-0 z-[65] flex items-center justify-center p-7">
      <div data-scrim className="sheet-scrim" onClick={onClose} />
      <div data-panel className="modal-card" role="alertdialog" aria-modal="true">
        <h3 className="text-[19px] font-bold tracking-tight text-slate-900 mb-1.5">{title}</h3>
        <p className="text-slate-600 text-[15px] mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-2.5">
          <button onClick={onClose} className="btn btn-glass flex-1 h-12 text-[15px]">取消</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`btn flex-1 h-12 text-[15px] ${danger ? 'btn-red' : 'btn-ink'}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, message, title = "確認", confirmText = "確定", confirmColor = "bg-slate-800" }) => {
  if (!isOpen) return null;
  return <ConfirmCard onClose={onClose} onConfirm={onConfirm} message={message} title={title} confirmText={confirmText} danger={/rose|red/.test(confirmColor)} />;
};

// 開啟畫面：極光背景上一顆玻璃圖示，下面一條液體進度
const LoadingScreen = ({ progress, isComplete, onDone }) => {
  // 進度只會往前：目標比目前顯示的大才更新（在 render 中推導，不用 effect）
  const [displayProgress, setDisplayProgress] = useState(15);
  const target = isComplete ? 100 : progress;
  if (target > displayProgress) setDisplayProgress(target);
  const doneCalledRef = useRef(false);

  useEffect(() => {
    if (isComplete && !doneCalledRef.current) {
      doneCalledRef.current = true;
      const timer = setTimeout(() => { onDone(); }, 380);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onDone]);

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden">
      <Aurora />
      <div className="relative z-10 flex flex-col items-center">
        <div className="glass-card !rounded-[30px] w-24 h-24 flex items-center justify-center mb-7 pop">
          <Wallet className="w-11 h-11 text-slate-800" strokeWidth={1.7} />
        </div>
        <h1 className="text-[22px] font-extrabold text-slate-900 mb-6 tracking-tight">記帳助手</h1>
        <div className="tube w-44" style={{ height: 8 }}>
          <span className="tube-fill tone-ink" style={{ width: `${Math.min(displayProgress, 100)}%`, transitionDuration: '0.5s' }} />
        </div>
      </div>
    </div>
  );
};

// 子分頁資料還在載入時顯示（區分「載入中」與「沒有資料」）
const ViewLoader = ({ label = '載入中...' }) => (
  <div className="flex flex-col items-center justify-center py-24 text-slate-400">
    <span className="w-9 h-9 rounded-full mb-3" style={{ background: 'conic-gradient(from 0deg, rgba(92,154,251,0) 0%, #5C9AFB 100%)', WebkitMask: 'radial-gradient(farthest-side, transparent 62%, #000 64%)', mask: 'radial-gradient(farthest-side, transparent 62%, #000 64%)', animation: 'spin-slow 0.9s linear infinite' }} />
    <span className="text-[13px] font-semibold">{label}</span>
  </div>
);

export { ConfirmationModal, LoadingScreen, ViewLoader };
