import { useTheme } from "../contexts/ThemeContext";

interface ThemeClasses {
  // Backgrounds
  bg: {
    primary: string;
    secondary: string;
    card: string;
    input: string;
    code: string;
  };
  // Text colors
  text: {
    primary: string;
    secondary: string;
    muted: string;
    accent: string;
    placeholder: string;
  };
  // Borders
  border: {
    primary: string;
    secondary: string;
    accent: string;
  };
  // Buttons
  button: {
    primary: string;
    secondary: string;
    danger: string;
    keywordActive: string;
    keywordInactive: string;
    vaultAction: string;
    historyAction: string;
  };
  // Status colors
  status: {
    success: string;
    error: string;
    warning: string;
    info: string;
  };
}

export const useThemeClasses = (): ThemeClasses => {
  const { isDark } = useTheme();

  if (isDark) {
    return {
      bg: {
        primary: "bg-slate-900",
        secondary: "bg-slate-800",
        card: "bg-slate-800/90",
        input: "bg-slate-700/50",
        code: "bg-slate-800/80",
      },
      text: {
        primary: "text-slate-100",
        secondary: "text-slate-300",
        muted: "text-slate-400",
        accent: "text-emerald-400",
        placeholder: "placeholder-slate-400",
      },
      border: {
        primary: "border-slate-700",
        secondary: "border-slate-600",
        accent: "border-emerald-500/50",
      },
      button: {
        primary: "bg-emerald-600 hover:bg-emerald-700 text-white",
        secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200",
        danger: "bg-amber-600 hover:bg-amber-700 text-white",
        keywordActive:
          "bg-emerald-700/30 text-emerald-300 border-emerald-700 shadow-lg",
        keywordInactive:
          "bg-slate-700/30 text-slate-400 border-slate-600 hover:bg-slate-600/30 hover:text-slate-100",
        vaultAction: "text-emerald-400 hover:text-white hover:bg-emerald-700/30",
        historyAction: "text-emerald-400 hover:text-white hover:bg-emerald-700/30",
      },
      status: {
        success: "text-emerald-400 bg-emerald-900/20 border-emerald-500/30",
        error: "text-amber-400 bg-amber-900/20 border-amber-500/30",
        warning: "text-yellow-400 bg-yellow-900/20 border-yellow-500/30",
        info: "text-emerald-400 bg-emerald-900/20 border-emerald-500/30",
      },
    };
  }

  // Light theme
  return {
    bg: {
      primary: "bg-slate-50",
      secondary: "bg-white",
      card: "bg-white/90",
      input: "bg-slate-50/80",
      code: "bg-slate-100/80",
    },
    text: {
      primary: "text-slate-800",
      secondary: "text-slate-600",
      muted: "text-slate-500",
      accent: "text-emerald-600",
      placeholder: "placeholder-slate-500",
    },
    border: {
      primary: "border-slate-200",
      secondary: "border-slate-300",
      accent: "border-emerald-400/60",
    },
    button: {
      primary: "bg-emerald-600 hover:bg-emerald-700 text-white",
      secondary: "bg-slate-200 hover:bg-slate-300 text-slate-700",
      danger: "bg-amber-500 hover:bg-amber-600 text-white",
      keywordActive:
        "bg-emerald-100 text-emerald-800 border-emerald-300 shadow-lg",
      keywordInactive:
        "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 hover:text-slate-800",
      vaultAction: "text-emerald-600 hover:text-white hover:bg-emerald-600",
      historyAction: "text-emerald-600 hover:text-white hover:bg-emerald-600",
    },
    status: {
      success: "text-emerald-700 bg-emerald-50 border-emerald-200",
      error: "text-amber-700 bg-amber-50 border-amber-200",
      warning: "text-yellow-700 bg-yellow-50 border-yellow-200",
      info: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
  };
};
