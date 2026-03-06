import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

/**
 * ThemeToggle — Sun/Moon icon button to toggle dark/light mode.
 * Accessible with aria-label. Smooth icon swap animation.
 */
export default function ThemeToggle({ className }) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}
            className={cn(
                // Base
                "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                // Light mode style
                "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800",
                // Dark mode style
                "dark:bg-slate-700 dark:text-yellow-300 dark:hover:bg-slate-600 dark:hover:text-yellow-200",
                className
            )}
        >
            {/* Sun icon — visible in dark mode */}
            <Sun
                size={18}
                className={cn(
                    "absolute transition-all duration-300",
                    isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75"
                )}
                aria-hidden="true"
            />
            {/* Moon icon — visible in light mode */}
            <Moon
                size={18}
                className={cn(
                    "absolute transition-all duration-300",
                    isDark ? "opacity-0 -rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
                )}
                aria-hidden="true"
            />
        </button>
    );
}
