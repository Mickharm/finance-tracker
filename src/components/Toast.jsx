/* eslint-disable react-refresh/only-export-components -- context/hook/provider 同檔是刻意設計 */
import * as React from 'react';
const { useState, useCallback } = React;


const ToastContext = React.createContext({ showToast: () => {} });
const useToast = () => React.useContext(ToastContext);

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
  }, []);
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[70] flex flex-col-reverse gap-2 pointer-events-none w-[90%] max-w-xs"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}
      >
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-lg backdrop-blur-xl text-sm font-bold animate-in slide-in-from-bottom-4 fade-in duration-300 ${t.type === 'error' ? 'bg-rose-500/90 text-white' : t.type === 'warning' ? 'bg-amber-500/90 text-white' : 'bg-slate-800/90 text-white'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export { useToast, ToastProvider };
