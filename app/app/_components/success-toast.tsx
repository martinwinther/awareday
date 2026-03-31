'use client';

import { useEffect, useState } from 'react';

type SuccessToastProps = {
  show: boolean;
  message: string;
  duration?: number;
};

export function SuccessToast({ show, message, duration = 1500 }: SuccessToastProps) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (!show) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    const timer = setTimeout(() => setIsVisible(false), duration);
    return () => clearTimeout(timer);
  }, [show, duration]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed top-6 left-4 right-4 max-w-sm mx-auto z-50 
        rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 
        shadow-lg animate-in fade-in slide-in-from-top-2 duration-300"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span className="text-emerald-600 font-bold text-lg">✓</span>
        <p className="text-sm font-medium text-emerald-900">{message}</p>
      </div>
    </div>
  );
}

