import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

const ThemeToggle: React.FC = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
        ${
          isDark
            ? "bg-slate-700 hover:bg-slate-600"
            : "bg-slate-300 hover:bg-slate-400"
        }
      `}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {/* Toggle Circle */}
      <div
        className={`
            absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ease-in-out
            flex items-center justify-center
            ${
              isDark ? "bg-slate-900 translate-x-6" : "bg-slate-50 translate-x-0.5"
            }
          `}
      >
        {isDark ? (
          <Moon className="w-3 h-3 text-slate-300" />
        ) : (
          <Sun className="w-3 h-3 text-amber-500" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
