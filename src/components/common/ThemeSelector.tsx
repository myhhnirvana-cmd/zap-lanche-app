import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, Theme } from '../../contexts/ThemeContext';

export const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();
  const options: { id: Theme; label: string; icon: any }[] = [
    { id: 'light', label: 'Claro', icon: Sun },
    { id: 'dark', label: 'Escuro', icon: Moon },
    { id: 'system', label: 'Automático', icon: Monitor },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
         Aparência do aplicativo
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setTheme(opt.id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
              theme === opt.id
                ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                : 'bg-bg-surface border-border-muted text-text-secondary hover:border-text-secondary'
            }`}
          >
            <opt.icon className="w-5 h-5" />
            <span className="text-[10px] font-semibold">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
