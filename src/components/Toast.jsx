/* eslint-disable react-refresh/only-export-components -- context/hook/provider 同檔是刻意設計 */
import * as React from 'react';
import { Check, TriangleAlert, CircleAlert } from 'lucide-react';
const { useState, useCallback } = React;

const ToastContext = React.createContext({ showToast: () => {} });
const useToast = () => React.useContext(ToastContext);

const LOOK = {
  success: { icon: Check, dot: 'bg-emerald-400 text-emerald-950' },
  warning: { icon: TriangleAlert, dot: 'bg-amber-400 text-amber-950' },
  error: { icon: CircleAlert, dot: 'bg-red-400 text-white' },
};

// 墨色玻璃膠囊：從底部導覽上方彈出來
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2600);
  }, []);
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[70] flex flex-col-reverse items-center gap-2 pointer-events-none w-[92%] max-w-sm"
        style={{ bottom: 'calc(max(12px, env(safe-area-inset-bottom, 0px) - 10px) + 78px)' }}
        aria-live="polite"
      >
        {toasts.map(t => {
          const look = LOOK[t.type] || LOOK.success;
          return (
            <div key={t.id} className="toast max-w-full">
              <span className={`toast-dot ${look.dot}`}>{React.createElement(look.icon, { className: 'w-3.5 h-3.5', strokeWidth: 3 })}</span>
              <span className="min-w-0">{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export { useToast, ToastProvider };
