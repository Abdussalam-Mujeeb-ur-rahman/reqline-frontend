import { useState, useEffect } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  duration?: number;
}

const Toast = ({ message, type, onClose, duration = 3000 }: ToastProps) => {
  const { isDark } = useTheme();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed top-4 sm:top-6 right-4 sm:right-6 z-50 transition-all duration-500 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div
        className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl border max-w-xs sm:max-w-sm transition-colors duration-300 ${
          isDark ? "bg-slate-800/90" : "bg-slate-50/90"
        } ${
          type === "success"
            ? isDark
              ? "border-emerald-500/30"
              : "border-emerald-200"
            : isDark
            ? "border-amber-500/30"
            : "border-amber-200"
        }`}
      >
        {type === "success" ? (
          <CheckCircle
            size={20}
            className={`flex-shrink-0 sm:w-6 sm:h-6 ${
              isDark ? "text-emerald-400" : "text-emerald-600"
            }`}
          />
        ) : (
          <XCircle
            size={20}
            className={`flex-shrink-0 sm:w-6 sm:h-6 ${
              isDark ? "text-amber-400" : "text-amber-600"
            }`}
          />
        )}
        <span
          className={`font-medium text-sm sm:text-base flex-1 min-w-0 ${
            isDark ? "text-slate-100" : "text-slate-800"
          }`}
        >
          {message}
        </span>
        <button
          onClick={handleClose}
          className={`ml-2 p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-300 flex-shrink-0 ${
            isDark ? "hover:bg-slate-700/50" : "hover:bg-slate-200"
          }`}
        >
          <X
            size={16}
            className={`sm:w-4 sm:h-4 ${
              isDark ? "text-slate-200" : "text-slate-600"
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default Toast;
