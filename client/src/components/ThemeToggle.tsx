import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = false, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl border transition-all duration-300 cursor-pointer shadow-2xs ${
        isDark
          ? 'border-emerald-800/60 bg-[#162721] text-amber-300 hover:border-amber-400/40 hover:bg-[#1a3029]'
          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-slate-50'
      } ${showLabel ? 'px-3 py-2 text-xs font-semibold' : 'h-9 w-9'} ${className}`}
      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      title={isDark ? 'Passer au mode clair' : 'Passer au mode sombre'}
    >
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <Sun size={17} className="text-amber-300 transition-transform duration-300 rotate-0 hover:rotate-45" />
        ) : (
          <Moon size={17} className="text-slate-600 transition-transform duration-300 rotate-0 hover:-rotate-12" />
        )}
      </div>

      {showLabel && (
        <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>
          {isDark ? 'Mode clair' : 'Mode sombre'}
        </span>
      )}
    </button>
  );
}
