import { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg: string, dur?: number) => showToast(msg, 'success', dur), [showToast]);
  const error = useCallback((msg: string, dur?: number) => showToast(msg, 'error', dur), [showToast]);
  const warning = useCallback((msg: string, dur?: number) => showToast(msg, 'warning', dur), [showToast]);
  const info = useCallback((msg: string, dur?: number) => showToast(msg, 'info', dur), [showToast]);

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40',
          border: 'border-emerald-500/30 dark:border-emerald-500/20',
          text: 'text-emerald-800 dark:text-emerald-300',
          icon: 'check_circle',
          iconColor: 'text-emerald-500'
        };
      case 'error':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40',
          border: 'border-rose-500/30 dark:border-rose-500/20',
          text: 'text-rose-800 dark:text-rose-300',
          icon: 'cancel',
          iconColor: 'text-rose-500'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40',
          border: 'border-amber-500/30 dark:border-amber-500/20',
          text: 'text-amber-800 dark:text-amber-300',
          icon: 'warning',
          iconColor: 'text-amber-500'
        };
      case 'info':
      default:
        return {
          bg: 'bg-sky-50 dark:bg-sky-950/40',
          border: 'border-sky-500/30 dark:border-sky-500/20',
          text: 'text-sky-800 dark:text-sky-300',
          icon: 'info',
          iconColor: 'text-sky-500'
        };
    }
  };

  const contextValue = useMemo(() => ({
    showToast,
    success,
    error,
    warning,
    info
  }), [showToast, success, error, warning, info]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Portal/Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type);
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 transform translate-y-0 opacity-100 ${styles.bg} ${styles.border} ${styles.text}`}
              role="alert"
              style={{
                animation: 'toast-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            >
              <span className={`material-symbols-outlined mt-0.5 shrink-0 ${styles.iconColor}`}>
                {styles.icon}
              </span>
              <div className="flex-grow font-body-sm text-sm break-words pr-2">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container/50 rounded-full p-0.5 shrink-0 transition-all"
              >
                <span className="material-symbols-outlined text-sm font-semibold block">close</span>
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toast-slide-in {
          from {
            transform: translateX(100%) translateY(0);
            opacity: 0;
          }
          to {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
