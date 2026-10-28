import React from 'react';
import { Info } from 'lucide-react';

interface GuideSectionProps {
  title: string;
  steps: string[];
  icon?: React.ReactNode;
}

export const GuideSection: React.FC<GuideSectionProps> = ({ title, steps, icon = <Info className="w-5 h-5 text-orange-400" /> }) => {
  return (
    <div className="rounded-3xl bg-bg-surface border border-border-muted p-6 shadow-xl space-y-4">
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="text-sm font-bold text-text-primary font-display">{title}</h3>
      </div>
      <ul className="space-y-3">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-3 text-xs text-text-secondary leading-relaxed">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold shrink-0 text-[10px]">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
