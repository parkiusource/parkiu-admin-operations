import { useToast } from '../hooks/useToast';
import { useEffect, useState } from 'react';

const ToastItem = ({ id, type, message, onRemove }: {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onRemove: (id: string) => void;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  }[type];

  return (
    <div
      className={`${bgColor} text-white px-4 py-2 rounded-lg shadow-lg transform transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <p>{message}</p>
        <button
          onClick={() => onRemove(id)}
          className="ml-4 text-white hover:text-gray-200 focus:outline-none"
          aria-label="Cerrar notificación"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
};
