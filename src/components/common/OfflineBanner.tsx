import React from 'react';
import { useStore } from '@/store/useStore';

export const OfflineBanner: React.FC = () => {
  const isOffline = useStore((s) => s.isOffline);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 bg-amber-100 border border-amber-300 text-amber-900 px-4 py-2 rounded shadow z-50 text-sm">
      Se necesita conexión a internet
    </div>
  );
};

export default OfflineBanner;
