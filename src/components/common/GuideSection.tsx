import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface GuideSectionProps {
  title: string;
  steps: string[];
  icon?: React.ReactNode;
}

export const GuideSection: React.FC<GuideSectionProps> = ({
  title,
  steps,
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-border-muted bg-bg-surface px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <span className="shrink-0">{icon}</span>}
          <h3 className="truncate text-sm font-bold text-text-primary font-display">{title}</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-label={isOpen ? `Ocultar explicação: ${title}` : `Ver explicação: ${title}`}
          title="Como funciona?"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-500/30 text-orange-400 transition-colors hover:bg-orange-500/10 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
      {isOpen && (
        <ul className="mt-3 space-y-2.5 border-t border-border-muted pt-3">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-2.5 text-xs leading-relaxed text-text-secondary">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-[10px] font-bold text-orange-400">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
