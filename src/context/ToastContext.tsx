import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts: ConfirmOptions =
        typeof options === 'string'
          ? { message: options, isDestructive: true }
          : options;

      setConfirmState({
        isOpen: true,
        options: opts,
        resolve,
      });
    });
  }, []);

  const handleConfirmChoice = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Floating Toasts Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
              toast.type === 'success'
                ? 'bg-[#F0FDF4]/95 border-[#BBF7D0] text-[#166534]'
                : toast.type === 'error'
                ? 'bg-[#FDF2F4]/95 border-[#F0C9CD] text-[#A63A50]'
                : 'bg-[#FFFDF9]/95 border-[#D4AF37]/50 text-[#5C4E4B]'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-[#A63A50] shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-[#B38F4D] shrink-0 mt-0.5" />}

            <div className="flex-1 text-xs font-medium leading-relaxed">{toast.message}</div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#8C7E7A] hover:text-[#2D2422] p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Custom Confirmation Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-2xl p-6 my-auto flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmState.options.isDestructive
                    ? 'bg-[#FDF2F4] text-[#A63A50] border border-[#F0C9CD]'
                    : 'bg-[#FAF5EB] text-[#8C6D34] border border-[#E8DEC8]'
                }`}
              >
                {confirmState.options.isDestructive ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>
              <h3 className="font-serif font-bold text-base md:text-lg text-[#2D2422]">
                {confirmState.options.title || 'Confirm Action'}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-[#5C4E4B] leading-relaxed">
              {confirmState.options.message}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#F5EFE6]">
              <button
                type="button"
                onClick={() => handleConfirmChoice(false)}
                className="py-2 px-4 rounded-xl border border-[#E5DFD7] text-xs font-semibold text-[#7A6B68] hover:bg-[#FAF8F5] transition cursor-pointer"
              >
                {confirmState.options.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmChoice(true)}
                className={`py-2 px-4 rounded-xl text-xs font-semibold text-white shadow-xs transition cursor-pointer ${
                  confirmState.options.isDestructive
                    ? 'bg-[#A63A50] hover:bg-[#8B2E42]'
                    : 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-105'
                }`}
              >
                {confirmState.options.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
