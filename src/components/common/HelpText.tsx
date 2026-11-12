import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTextProps {
  children: React.ReactNode;
  className?: string;
}

export const HelpText: React.FC<HelpTextProps> = ({ children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Ocultar explicação' : 'Ver explicação'}
        title="Como funciona?"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-orange-500/10 hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {isOpen && (
        <div className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
          {children}
        </div>
      )}
    </div>
  );
};
