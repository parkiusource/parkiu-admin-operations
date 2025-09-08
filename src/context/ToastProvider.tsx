import React, { useCallback, useMemo, useState } from 'react';
import { ToastContext, type Toast } from './toastContext';
import type { ToastType } from '@/types/toast';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'success', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Use requestIdleCallback for better performance, fallback to setTimeout
    if ('requestIdleCallback' in window) {
      const timeoutId = window.setTimeout(() => {
        window.requestIdleCallback(() => {
          removeToast(id);
        });
      }, duration);
      return () => window.clearTimeout(timeoutId);
    } else {
      const timeoutId = window.setTimeout(() => {
        removeToast(id);
      }, duration);
      return () => window.clearTimeout(timeoutId);
    }
  }, [removeToast]);

  const value = useMemo(() => ({ toasts, addToast, removeToast }), [toasts, addToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}
