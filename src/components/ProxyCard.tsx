import React from "react";
import { Globe, Rocket, Lightbulb } from "lucide-react";
import { useThemeClasses } from "../hooks/useThemeClasses";

interface ProxyCardProps {
  proxyTarget: string;
  onDisable: () => void;
  onTargetChange: (target: string) => void;
  className?: string;
}

const ProxyCard: React.FC<ProxyCardProps> = ({
  proxyTarget,
  onDisable,
  onTargetChange,
  className = "",
}) => {
  const theme = useThemeClasses();

  return (
    <div
      className={`${theme.bg.card} ${theme.border.primary} p-4 rounded-lg border ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-blue-500" />
          <Rocket className="w-5 h-5 text-blue-500" />
          <h3 className={`${theme.text.primary} font-semibold text-lg`}>
            Proxy Active (Localhost Detected)
          </h3>
        </div>
        <button
          onClick={onDisable}
          className={`${theme.text.muted} hover:${theme.text.primary} transition-colors text-sm font-medium`}
        >
          Disable
        </button>
      </div>

      <div className="flex items-center space-x-2 mb-3">
        <input
          type="text"
          value={proxyTarget}
          onChange={(e) => onTargetChange(e.target.value)}
          className={`${theme.bg.input} flex-1 px-3 py-2 rounded-md border ${theme.border.primary} ${theme.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          placeholder="http://localhost:3000"
        />
        <button
          onClick={() => navigator.clipboard.writeText(proxyTarget)}
          className={`${theme.button.secondary} px-3 py-2 rounded-md flex items-center space-x-1`}
          title="Copy proxy target"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>

      <div className="flex items-start space-x-2">
        <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className={`${theme.text.muted} text-sm`}>
          Proxy allows testing localhost APIs from deployed app. Make sure your
          local server is running and CORS is configured to allow origin:{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">
            {window.location.origin}
          </code>
        </p>
      </div>
    </div>
  );
};

export default ProxyCard;
