import { useState, useEffect } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  duration?: number;
}

const Toast = ({ message, type, onClose, duration = 3000 }: ToastProps) => {
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
        className={`glass flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl border max-w-xs sm:max-w-sm ${
          type === "success" ? "border-green-500/30" : "border-red-500/30"
        }`}
      >
        {type === "success" ? (
          <CheckCircle
            size={20}
            className="text-green-400 flex-shrink-0 sm:w-6 sm:h-6"
          />
        ) : (
          <XCircle
            size={20}
            className="text-red-400 flex-shrink-0 sm:w-6 sm:h-6"
          />
        )}
        <span className="text-white font-medium text-sm sm:text-base flex-1 min-w-0">
          {message}
        </span>
        <button
          onClick={handleClose}
          className="ml-2 p-1.5 sm:p-2 hover:bg-white/10 rounded-lg sm:rounded-xl transition-all duration-300 flex-shrink-0"
        >
          <X size={16} className="text-white sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
