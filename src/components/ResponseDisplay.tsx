import React from "react";
import { Copy, CheckCircle, Clock, Globe, Download } from "lucide-react";
import { useThemeClasses } from "../hooks/useThemeClasses";
import { ApiResponse } from "../types";

interface ResponseDisplayProps {
  result: ApiResponse | null;
  error: string | null;
  isLoading: boolean;
  onCopyResponse: () => void;
  onCopyJson: () => void;
  onDownloadResponse: () => void;
  showProxyInfo?: boolean;
}

const ResponseDisplay: React.FC<ResponseDisplayProps> = ({
  result,
  error,
  isLoading,
  onCopyResponse,
  onCopyJson,
  onDownloadResponse,
  showProxyInfo = false,
}) => {
  const theme = useThemeClasses();

  if (isLoading) {
    return (
      <div
        className={`${theme.bg.card} rounded-3xl p-6 sm:p-8 ${theme.border.primary} shadow-lg`}
      >
        <h2
          className={`text-xl sm:text-2xl font-bold ${theme.text.primary} mb-6 flex items-center gap-3`}
        >
          <div
            className={`w-8 h-8 ${theme.bg.secondary} rounded-lg flex items-center justify-center`}
          >
            <Clock className="w-4 h-4 text-white" />
          </div>
          Response Details
        </h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`${theme.bg.card} rounded-3xl p-6 sm:p-8 ${theme.border.primary} shadow-lg`}
      >
        <h2
          className={`text-xl sm:text-2xl font-bold ${theme.text.primary} mb-6 flex items-center gap-3`}
        >
          <div
            className={`w-8 h-8 ${theme.bg.secondary} rounded-lg flex items-center justify-center`}
          >
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
          Response Details
        </h2>
        <div className={`${theme.status.error} rounded-xl p-4`}>
          <p className={`${theme.text.primary} font-medium`}>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (duration: number) => {
    if (duration < 1000) {
      return `${duration}ms`;
    }
    return `${(duration / 1000).toFixed(2)}s`;
  };

  return (
    <div
      className={`${theme.bg.card} rounded-3xl p-6 sm:p-8 ${theme.border.primary} shadow-lg`}
    >
      <h2
        className={`text-xl sm:text-2xl font-bold ${theme.text.primary} mb-6 flex items-center gap-3`}
      >
        <div
          className={`w-8 h-8 ${theme.bg.secondary} rounded-lg flex items-center justify-center`}
        >
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
        Response Details
      </h2>

      {/* Response Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div
          className={`${theme.status.success} rounded-xl p-3 sm:p-4 text-center`}
        >
          <div
            className={`${theme.text.accent} text-xs sm:text-sm font-medium mb-1`}
          >
            Status
          </div>
          <div className={`${theme.text.primary} text-lg sm:text-xl font-bold`}>
            {result.response.http_status}
          </div>
        </div>
        <div
          className={`${theme.status.info} rounded-xl p-3 sm:p-4 text-center`}
        >
          <div
            className={`${theme.text.accent} text-xs sm:text-sm font-medium mb-1`}
          >
            Duration
          </div>
          <div className={`${theme.text.primary} text-lg sm:text-xl font-bold`}>
            {formatDuration(result.response.duration)}
          </div>
        </div>
        <div
          className={`${theme.status.info} rounded-xl p-3 sm:p-4 text-center`}
        >
          <div
            className={`${theme.text.accent} text-xs sm:text-sm font-medium mb-1`}
          >
            Started
          </div>
          <div
            className={`${theme.text.primary} text-xs sm:text-sm font-medium`}
          >
            {formatTimestamp(result.response.request_start_timestamp)}
          </div>
        </div>
        <div
          className={`${theme.status.info} rounded-xl p-3 sm:p-4 text-center`}
        >
          <div
            className={`${theme.text.accent} text-xs sm:text-sm font-medium mb-1`}
          >
            Completed
          </div>
          <div
            className={`${theme.text.primary} text-xs sm:text-sm font-medium`}
          >
            {formatTimestamp(result.response.request_stop_timestamp)}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
        <button
          onClick={onCopyResponse}
          className={`${theme.text.accent} hover:text-white hover:${theme.bg.secondary} px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 text-xs sm:text-sm`}
        >
          <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
          Copy Response
        </button>
        <button
          onClick={onCopyJson}
          className={`${theme.text.accent} hover:text-white hover:${theme.bg.secondary} px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 text-xs sm:text-sm`}
        >
          <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
          Copy JSON
        </button>
        <button
          onClick={onDownloadResponse}
          className={`${theme.text.accent} hover:text-white hover:${theme.bg.secondary} px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 text-xs sm:text-sm`}
        >
          <Download className="w-3 h-3 sm:w-4 sm:h-4" />
          Download
        </button>
      </div>

      {/* Request Details */}
      <div className="space-y-4">
        <div>
          <h3
            className={`${theme.text.accent} font-semibold mb-2 text-sm sm:text-base`}
          >
            URL
          </h3>
          <div className={`${theme.bg.code} rounded-xl p-3 sm:p-4`}>
            <code
              className={`${theme.text.primary} text-xs sm:text-sm break-all`}
            >
              {result.request.full_url}
            </code>
          </div>
        </div>

        {Object.keys(result.request.headers).length > 0 && (
          <div>
            <h3
              className={`${theme.text.accent} font-semibold mb-2 text-sm sm:text-base`}
            >
              Headers
            </h3>
            <div className={`${theme.bg.code} rounded-xl p-3 sm:p-4`}>
              <pre
                className={`${theme.text.primary} text-xs sm:text-sm whitespace-pre-wrap`}
              >
                {JSON.stringify(result.request.headers, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {Object.keys(result.request.query).length > 0 && (
          <div>
            <h3
              className={`${theme.text.accent} font-semibold mb-2 text-sm sm:text-base`}
            >
              Query Parameters
            </h3>
            <div className={`${theme.bg.code} rounded-xl p-3 sm:p-4`}>
              <pre
                className={`${theme.text.primary} text-xs sm:text-sm whitespace-pre-wrap`}
              >
                {JSON.stringify(result.request.query, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {Object.keys(result.request.body).length > 0 && (
          <div>
            <h3
              className={`${theme.text.accent} font-semibold mb-2 text-sm sm:text-base`}
            >
              Request Body
            </h3>
            <div className={`${theme.bg.code} rounded-xl p-3 sm:p-4`}>
              <pre
                className={`${theme.text.primary} text-xs sm:text-sm whitespace-pre-wrap`}
              >
                {JSON.stringify(result.request.body, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Response Data */}
        <div>
          <h3
            className={`${theme.text.accent} font-semibold mb-2 text-sm sm:text-base`}
          >
            Response Data
          </h3>
          <div
            className={`${theme.bg.code} rounded-xl p-3 sm:p-4 max-h-96 overflow-y-auto`}
          >
            <pre
              className={`${theme.text.primary} text-xs sm:text-sm whitespace-pre-wrap`}
            >
              {JSON.stringify(result.response.response_data, null, 2)}
            </pre>
          </div>
        </div>

        {/* Proxy Information */}
        {showProxyInfo && result.request.full_url.includes("localhost") && (
          <div className={`${theme.status.info} rounded-xl p-3 sm:p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4" />
              <span
                className={`${theme.text.accent} font-medium text-sm sm:text-base`}
              >
                Proxy Information
              </span>
            </div>
            <p className={`${theme.text.primary} text-xs sm:text-sm`}>
              This request was proxied through the local development server.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponseDisplay;
