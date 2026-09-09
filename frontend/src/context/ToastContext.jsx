import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'info') => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const iconFor = (type) => {
    if (type === 'success') return <CheckCircle size={18} color="#02C39A" />;
    if (type === 'error') return <AlertCircle size={18} color="#E8734A" />;
    return <Info size={18} color="#028090" />;
  };

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-fade-rise flex items-center gap-2 rounded-xl border border-[#E4EEEC] bg-white px-4 py-3 shadow-lg min-w-[240px] max-w-sm"
          >
            {iconFor(t.type)}
            <span className="text-sm text-[#1B2A2E] flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-[#5C6B6E] hover:text-[#1B2A2E]">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
