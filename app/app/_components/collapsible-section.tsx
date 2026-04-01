'use client';

import { useState } from 'react';

type CollapsibleSectionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false 
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-2xl 
          bg-gradient-to-r from-[#faf5f0] to-[#f5f1e8] px-3 py-3 
          transition hover:from-[#f5f0eb] hover:to-[#f0e8e0]
          text-stone-700 font-medium text-sm touch-manipulation"
        aria-expanded={isOpen}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
          {title}
        </span>
        <span className={`text-base transition transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="space-y-3 border-l-2 border-amber-200/50 pl-3.5 pt-0.5 animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </section>
  );
}

