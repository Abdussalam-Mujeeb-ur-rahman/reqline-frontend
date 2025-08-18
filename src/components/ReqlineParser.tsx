import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Copy,
  RotateCcw,
  Info,
  ArrowRight,
  CheckCircle,
  Clock,
  Globe,
  FileText,
  Settings,
  Zap,
  Code,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
  AlertTriangle,
  Package,
  Plus,
  Trash2,
  Save,
  Key,
  ArrowUp,
  Layers,
  BookOpen,
  History,
} from "lucide-react";
import axios from "axios";
import LoadingSpinner from "./LoadingSpinner";
import Toast from "./Toast";
import config from "../../config";
import {
  validateReqlineLength,
  sanitizeInput,
  sanitizeResponseData,
  createSafeErrorMessage,
  checkRateLimit,
  REQUEST_TIMEOUT,
} from "../utils/security";

interface RequestData {
  query: Record<string, unknown>;
  body: Record<string, unknown>;
  headers: Record<string, unknown>;
  full_url: string;
  cookies_sent?: string[];
}

interface ResponseData {
  http_status: number;
  duration: number;
  request_start_timestamp: number;
  request_stop_timestamp: number;
  response_data: unknown;
  cookies_received?: string[];
}

interface ApiResponse {
  request: RequestData;
  response: ResponseData;
}

interface VaultItem {
  id: string;
  name: string;
  value: string;
  createdAt: number;
  updatedAt: number;
}

interface RequestHistory {
  id: string;
  reqline: string;
  result: ApiResponse | null;
  error: string | null;
  timestamp: number;
}

const ReqlineParser = () => {
  const [reqline, setReqline] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "request" | "vault" | "examples" | "history"
  >("request");
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [requestHistory, setRequestHistory] = useState<RequestHistory[]>([]);
  const [newVaultItem, setNewVaultItem] = useState({
    name: "",
    value: "",
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const navigate = useNavigate();

  // Keywords for Reqline syntax with smart templates
  const keywords = [
    { text: "HTTP", template: "HTTP GET" },
    { text: "URL", template: "URL https://dummyjson.com/quotes/3" },
    { text: "HEADERS", template: 'HEADERS {"Authorization": "Bearer token"}' },
    { text: "BODY", template: "BODY {}" },
    { text: "QUERY", template: 'QUERY {"query1": 1920933}' },
  ];

  // Examples for the Examples tab
  const examples = [
    {
      name: "Simple GET Request",
      description: "Basic HTTP GET request to fetch data",
      reqline: "HTTP GET | URL https://dummyjson.com/quotes/3",
      color: "from-blue-500 to-blue-600",
      icon: <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
    },
    {
      name: "GET with Query Parameters",
      description: "Request with query parameters",
      reqline:
        'HTTP GET | URL https://dummyjson.com/quotes | QUERY {"refid": 1920933}',
      color: "from-green-500 to-green-600",
      icon: <Code className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
    },
    {
      name: "POST with JSON Body",
      description: "POST request with JSON payload",
      reqline:
        'HTTP POST | URL https://dummyjson.com/products/add | HEADERS {"Content-Type": "application/json"} | BODY {"title": "New Product", "price": 99.99}',
      color: "from-purple-500 to-purple-600",
      icon: <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
    },
    {
      name: "Authenticated Request",
      description: "Request with authorization header",
      reqline:
        'HTTP GET | URL https://api.example.com/user/profile | HEADERS {"Authorization": "Bearer your-token-here"}',
      color: "from-orange-500 to-orange-600",
      icon: <Key className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
    },
  ];

  // Check if a keyword is present in the current input
  const isKeywordPresent = (keyword: string): boolean => {
    return reqline.toUpperCase().includes(keyword.toUpperCase());
  };

  // Handle keyword click to insert template with smart delimiter logic
  const handleKeywordClick = (template: string) => {
    const currentValue = reqline;
    let insertText = template;

    // Smart delimiter logic
    if (currentValue.trim() !== "") {
      // If there's already content, add delimiter before the keyword
      insertText = " | " + template;
    }

    setReqline(currentValue + insertText);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    // Validate input length
    const validation = validateReqlineLength(value);
    if (!validation.isValid) {
      setToast({
        message: validation.error || "Input too long",
        type: "error",
      });
      return;
    }

    setReqline(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reqline.trim()) {
      setToast({ message: "Please enter reqline syntax", type: "error" });
      return;
    }

    // Check rate limiting
    const rateLimitCheck = checkRateLimit("default");
    if (!rateLimitCheck.allowed) {
      setError(
        `Too many requests. Please wait ${rateLimitCheck.retryAfter} seconds before trying again.`
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(
        `${config.apiUrl}/`,
        { reqline: reqline.trim() },
        {
          timeout: REQUEST_TIMEOUT,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Sanitize response data
      const sanitizedData = sanitizeResponseData(response.data);
      setResult(sanitizedData as ApiResponse);

      // Add to history
      const historyItem: RequestHistory = {
        id: Date.now().toString(),
        reqline: reqline.trim(),
        result: sanitizedData as ApiResponse,
        error: null,
        timestamp: Date.now(),
      };
      const updatedHistory = [historyItem, ...requestHistory.slice(0, 9)]; // Keep last 10
      setRequestHistory(updatedHistory);
      saveRequestHistoryToStorage(updatedHistory);

      // Auto-scroll to response details after successful response
      setTimeout(() => {
        const responseDetailsSection = document.getElementById(
          "response-details-section"
        );
        if (responseDetailsSection) {
          responseDetailsSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);
    } catch (err: unknown) {
      const safeErrorMessage = createSafeErrorMessage(err);
      setError(safeErrorMessage);

      // Add to history with error
      const historyItem: RequestHistory = {
        id: Date.now().toString(),
        reqline: reqline.trim(),
        result: null,
        error: safeErrorMessage,
        timestamp: Date.now(),
      };
      const updatedHistory = [historyItem, ...requestHistory.slice(0, 9)]; // Keep last 10
      setRequestHistory(updatedHistory);
      saveRequestHistoryToStorage(updatedHistory);

      // Log the full error for debugging (only in development)
      if (config.isDevelopment) {
        console.error("API Error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      const sanitizedText = sanitizeInput(text);
      await navigator.clipboard.writeText(sanitizedText);
      setToast({ message: "Copied to clipboard!", type: "success" });
    } catch {
      setToast({ message: "Failed to copy to clipboard", type: "error" });
    }
  };

  const copyResultAsJson = async () => {
    if (!result) return;

    try {
      const sanitizedResult = sanitizeResponseData(result);
      const jsonString = JSON.stringify(sanitizedResult, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setToast({ message: "Result copied as JSON!", type: "success" });
    } catch {
      setToast({ message: "Failed to copy result", type: "error" });
    }
  };

  const copyResponseData = async () => {
    if (!result) return;

    try {
      const sanitizedResponseData = sanitizeResponseData(
        result.response.response_data
      );
      const jsonString = JSON.stringify(sanitizedResponseData, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setToast({ message: "Response data copied!", type: "success" });
    } catch {
      setToast({ message: "Failed to copy response data", type: "error" });
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (duration: number) => {
    return `${duration}ms`;
  };

  const handleClear = useCallback(() => {
    setReqline("");
    setResult(null);
    setError(null);
    setToast(null);
  }, []);

  // Vault management functions
  const loadVaultFromStorage = (): VaultItem[] => {
    try {
      const stored = localStorage.getItem("reqline-vault");
      if (!stored) return [];

      const vaultItems: VaultItem[] = JSON.parse(stored);
      const now = Date.now();
      const expiryTime = 48 * 60 * 60 * 1000; // 48 hours

      // Filter out expired items
      const validItems = vaultItems.filter(
        (item) => now - item.createdAt <= expiryTime
      );

      // Update storage with only valid items
      if (validItems.length !== vaultItems.length) {
        localStorage.setItem("reqline-vault", JSON.stringify(validItems));
      }

      return validItems;
    } catch (error) {
      console.error("Error loading vault from storage:", error);
      return [];
    }
  };

  const saveVaultToStorage = (items: VaultItem[]): void => {
    try {
      localStorage.setItem("reqline-vault", JSON.stringify(items));
    } catch (error) {
      console.error("Error saving vault to storage:", error);
      setToast({ message: "Failed to save vault", type: "error" });
    }
  };

  const addVaultItem = () => {
    if (!newVaultItem.name.trim() || !newVaultItem.value.trim()) {
      setToast({ message: "Name and value are required", type: "error" });
      return;
    }

    const item: VaultItem = {
      id: Date.now().toString(),
      name: newVaultItem.name.trim(),
      value: newVaultItem.value.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedItems = [...vaultItems, item];
    setVaultItems(updatedItems);
    saveVaultToStorage(updatedItems);
    setNewVaultItem({
      name: "",
      value: "",
    });
    setToast({ message: "Item added to vault", type: "success" });
  };

  const removeVaultItem = (id: string) => {
    const updatedItems = vaultItems.filter((item) => item.id !== id);
    setVaultItems(updatedItems);
    saveVaultToStorage(updatedItems);
    setToast({ message: "Item removed from vault", type: "success" });
  };

  // Request history management functions
  const loadRequestHistoryFromStorage = (): RequestHistory[] => {
    try {
      const stored = localStorage.getItem("reqline-request-history");
      if (!stored) return [];

      const history: RequestHistory[] = JSON.parse(stored);
      const now = Date.now();
      const expiryTime = 48 * 60 * 60 * 1000; // 48 hours

      // Filter out expired items
      const validHistory = history.filter(
        (item) => now - item.timestamp <= expiryTime
      );

      // Update storage with only valid items
      if (validHistory.length !== history.length) {
        localStorage.setItem(
          "reqline-request-history",
          JSON.stringify(validHistory)
        );
      }

      return validHistory;
    } catch (error) {
      console.error("Error loading request history from storage:", error);
      return [];
    }
  };

  const saveRequestHistoryToStorage = (history: RequestHistory[]): void => {
    try {
      localStorage.setItem("reqline-request-history", JSON.stringify(history));
    } catch (error) {
      console.error("Error saving request history to storage:", error);
    }
  };

  const useVaultItem = (item: VaultItem) => {
    setReqline(item.value);
    setActiveTab("request"); // Switch to request tab
    setToast({ message: `Loaded: ${item.name}`, type: "success" });
  };

  const copyVaultItem = async (item: VaultItem) => {
    try {
      await navigator.clipboard.writeText(item.value);
      setToast({
        message: `${item.name} copied to clipboard`,
        type: "success",
      });
    } catch {
      setToast({ message: "Failed to copy to clipboard", type: "error" });
    }
  };

  const useHistoryItem = (item: RequestHistory) => {
    setReqline(item.reqline);
    setActiveTab("request"); // Switch to request tab
    setToast({ message: "Request loaded from history", type: "success" });
  };

  const removeHistoryItem = (id: string) => {
    const updatedHistory = requestHistory.filter((item) => item.id !== id);
    setRequestHistory(updatedHistory);
    saveRequestHistoryToStorage(updatedHistory);
    setToast({ message: "Item removed from history", type: "success" });
  };

  // Initialize vault and request history from localStorage
  useEffect(() => {
    const loadedVaultItems = loadVaultFromStorage();
    setVaultItems(loadedVaultItems);

    const loadedHistory = loadRequestHistoryFromStorage();
    setRequestHistory(loadedHistory);
  }, []);

  // Scroll to top functionality
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      setShowScrollToTop(scrollTop > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={config.toastDuration}
        />
      )}

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          <ArrowUp size={20} />
        </button>
      )}

      {/* Header */}
      <div className="glass-dark rounded-xl sm:rounded-2xl p-3 sm:p-6 lg:p-8 animate-fade-in-up border border-white/10">
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          {/* Top row: Back button, icon, title */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
                API Request Tester
              </h2>
              <p className="text-blue-200 text-xs sm:text-sm lg:text-base">
                Test individual API endpoints with Reqline syntax
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-white/10 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab("request")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300 border-b-2 flex-shrink-0 ${
                activeTab === "request"
                  ? "text-blue-300 border-blue-500 bg-blue-500/10"
                  : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              <Send size={16} />
              <span className="hidden sm:inline">Single Request</span>
              <span className="sm:hidden">Request</span>
            </button>
            <button
              onClick={() => setActiveTab("vault")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300 border-b-2 flex-shrink-0 ${
                activeTab === "vault"
                  ? "text-blue-300 border-blue-500 bg-blue-500/10"
                  : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              <Key size={16} />
              <span className="hidden sm:inline">Vault</span>
              <span className="sm:hidden">Vault</span>
            </button>
            <button
              onClick={() => setActiveTab("examples")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300 border-b-2 flex-shrink-0 ${
                activeTab === "examples"
                  ? "text-blue-300 border-blue-500 bg-blue-500/10"
                  : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              <Info size={16} />
              <span className="hidden sm:inline">Examples</span>
              <span className="sm:hidden">Examples</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300 border-b-2 flex-shrink-0 ${
                activeTab === "history"
                  ? "text-blue-300 border-blue-500 bg-blue-500/10"
                  : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              <History size={16} />
              <span className="hidden sm:inline">History</span>
              <span className="sm:hidden">History</span>
            </button>
          </div>

          {/* Action Buttons - Only show in Request tab */}
          {activeTab === "request" && (
            <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
              <button
                onClick={() => navigate("/multiple-endpoints")}
                className="btn-secondary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2"
                title="Test multiple endpoints"
                aria-label="Test multiple endpoints"
              >
                <Layers size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Multiple Endpoints</span>
                <span className="sm:hidden">Multiple</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Single Request Tab */}
          {activeTab === "request" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Request Form */}
              <div className="bg-black/30 rounded-xl p-3 sm:p-6 border border-white/10">
                <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Request Syntax
                </h4>
                <form
                  onSubmit={handleSubmit}
                  className="space-y-3 sm:space-y-4"
                >
                  {/* Keyword Suggestions */}
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {keywords.map((keyword, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleKeywordClick(keyword.template)}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-mono font-semibold transition-all duration-300 hover:scale-105 ${
                          isKeywordPresent(keyword.text)
                            ? "bg-green-500/20 text-green-300 border border-green-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                        }`}
                        title={`Insert ${keyword.template}`}
                        aria-label={`Insert ${keyword.template}`}
                      >
                        {keyword.text}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <textarea
                      value={reqline}
                      onChange={handleInputChange}
                      placeholder={
                        'HTTP GET | URL https://dummyjson.com/quotes/3 | QUERY {"refid": 1920933}'
                      }
                      className="w-full h-20 sm:h-24 lg:h-32 bg-black/40 border border-white/20 rounded-xl text-white placeholder-blue-300 resize-none text-xs sm:text-sm font-mono p-3 sm:p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      maxLength={10000}
                      aria-label="Reqline syntax input"
                    />
                    <div className="absolute top-2 sm:top-3 lg:top-4 right-2 sm:right-3 lg:right-4 text-blue-300 text-xs bg-black/60 px-2 py-1 rounded-full">
                      {reqline.length}/10000
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                    <button
                      type="submit"
                      disabled={isLoading || !reqline.trim()}
                      className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm flex-1 sm:flex-none"
                      aria-label="Execute request"
                    >
                      {isLoading ? (
                        <LoadingSpinner size={16} />
                      ) : (
                        <Send size={16} />
                      )}
                      {isLoading ? "Processing..." : "Execute Request"}
                    </button>

                    <button
                      type="button"
                      onClick={handleClear}
                      className="btn-secondary flex items-center justify-center gap-2 text-xs sm:text-sm"
                      aria-label="Clear all data"
                    >
                      <RotateCcw size={16} />
                      Clear
                    </button>
                  </div>
                </form>
              </div>

              {/* Results Section */}
              {(result || error) && (
                <div
                  id="response-details-section"
                  className="bg-black/30 rounded-xl p-3 sm:p-6 border border-white/10"
                >
                  <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                    {result ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    {result ? "Response Details" : "Error Details"}
                  </h4>

                  {result && (
                    <div className="space-y-4">
                      {/* Response Summary */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
                          <div className="text-xs text-green-300 mb-1">
                            Status
                          </div>
                          <div className="text-white font-semibold">
                            {result.response.http_status}
                          </div>
                        </div>
                        <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
                          <div className="text-xs text-blue-300 mb-1">
                            Duration
                          </div>
                          <div className="text-white font-semibold">
                            {formatDuration(result.response.duration)}
                          </div>
                        </div>
                        <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/30">
                          <div className="text-xs text-purple-300 mb-1">
                            Started
                          </div>
                          <div className="text-white font-semibold text-xs">
                            {formatTimestamp(
                              result.response.request_start_timestamp
                            )}
                          </div>
                        </div>
                        <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/30">
                          <div className="text-xs text-orange-300 mb-1">
                            Completed
                          </div>
                          <div className="text-white font-semibold text-xs">
                            {formatTimestamp(
                              result.response.request_stop_timestamp
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Request Details */}
                      <div className="bg-black/40 rounded-lg p-3 sm:p-4 border border-white/10">
                        <h5 className="text-white font-medium mb-2 flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Request Details
                        </h5>
                        <div className="space-y-2 text-xs sm:text-sm">
                          <div>
                            <span className="text-blue-300">URL:</span>{" "}
                            <span className="text-white font-mono">
                              {result.request.full_url}
                            </span>
                          </div>
                          {Object.keys(result.request.headers).length > 0 && (
                            <div>
                              <span className="text-blue-300">Headers:</span>{" "}
                              <span className="text-white font-mono">
                                {JSON.stringify(result.request.headers)}
                              </span>
                            </div>
                          )}
                          {Object.keys(result.request.query).length > 0 && (
                            <div>
                              <span className="text-blue-300">Query:</span>{" "}
                              <span className="text-white font-mono">
                                {JSON.stringify(result.request.query)}
                              </span>
                            </div>
                          )}
                          {Object.keys(result.request.body).length > 0 && (
                            <div>
                              <span className="text-blue-300">Body:</span>{" "}
                              <span className="text-white font-mono">
                                {JSON.stringify(result.request.body)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Response Data */}
                      <div className="bg-black/40 rounded-lg p-3 sm:p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-white font-medium flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Response Data
                          </h5>
                          <div className="flex gap-2">
                            <button
                              onClick={copyResponseData}
                              className="p-1 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded transition-all duration-300"
                              title="Copy response data"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              onClick={copyResultAsJson}
                              className="p-1 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded transition-all duration-300"
                              title="Copy full result"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="code-block text-xs sm:text-sm max-h-64 overflow-y-auto">
                          {JSON.stringify(
                            result.response.response_data,
                            null,
                            2
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-500/10 rounded-lg p-3 sm:p-4 border border-red-500/30">
                      <h5 className="text-red-300 font-medium mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Error Details
                      </h5>
                      <div className="code-block text-xs sm:text-sm text-red-200">
                        {error}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Vault Tab */}
          {activeTab === "vault" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Add New Vault Item */}
              <div className="bg-black/30 rounded-xl p-3 sm:p-6 border border-white/10">
                <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add New Vault Item
                </h4>
                <div className="space-y-3 sm:space-y-4">
                  <input
                    type="text"
                    placeholder="Name (e.g., User Login Request)"
                    value={newVaultItem.name}
                    onChange={(e) =>
                      setNewVaultItem((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="bg-black/40 border border-white/20 rounded-lg text-white placeholder-blue-300 text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  />
                  <textarea
                    placeholder="Reqline Syntax"
                    value={newVaultItem.value}
                    onChange={(e) =>
                      setNewVaultItem((prev) => ({
                        ...prev,
                        value: e.target.value,
                      }))
                    }
                    className="bg-black/40 border border-white/20 rounded-lg text-white placeholder-blue-300 text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-20 font-mono w-full"
                  />

                  <button
                    onClick={addVaultItem}
                    className="btn-primary flex items-center gap-2 text-xs sm:text-sm px-4 py-2"
                  >
                    <Save size={16} />
                    Add to Vault
                  </button>
                </div>
              </div>

              {/* Vault Items */}
              <div className="bg-black/30 rounded-xl p-3 sm:p-6 border border-white/10">
                <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Saved Vault Items
                </h4>
                {vaultItems.length === 0 ? (
                  <div className="text-center py-8 text-blue-200 text-sm">
                    <Key className="w-12 h-12 mx-auto mb-4 text-blue-300" />
                    <p>No vault items saved yet. Add your first item above.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vaultItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-black/40 rounded-lg p-3 border border-white/10 hover:bg-black/60 transition-all duration-300"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-white text-sm mb-1 truncate">
                              {item.name}
                            </h5>

                            <div className="code-block text-xs max-h-16 overflow-y-auto break-words font-mono">
                              {item.value}
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0 justify-center sm:justify-end">
                            <button
                              onClick={() => useVaultItem(item)}
                              className="p-2 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg transition-all duration-300"
                              title="Use this item"
                            >
                              <Send size={16} />
                            </button>
                            <button
                              onClick={() => copyVaultItem(item)}
                              className="p-2 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg transition-all duration-300"
                              title="Copy to clipboard"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              onClick={() => removeVaultItem(item.id)}
                              className="p-2 text-red-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-all duration-300"
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Examples Tab */}
          {activeTab === "examples" && (
            <div className="bg-black/30 rounded-xl p-3 sm:p-6 border border-white/10">
              <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Example Requests
              </h4>
              <p className="text-blue-200 text-sm mb-4">
                Common use cases and syntax examples. Click any example to load
                it into the request form.
              </p>
              <div className="grid gap-3 sm:gap-4">
                {examples.map((example, index) => (
                  <div
                    key={index}
                    className="bg-black/40 rounded-xl p-3 sm:p-4 border border-white/10 hover:bg-black/60 transition-all duration-300 group cursor-pointer"
                    onClick={() => {
                      setReqline(example.reqline);
                      setActiveTab("request");
                      setToast({
                        message: `Loaded: ${example.name}`,
                        type: "success",
                      });
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r ${example.color} rounded-lg flex items-center justify-center flex-shrink-0`}
                      >
                        {example.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-semibold text-white text-sm sm:text-base mb-1">
                          {example.name}
                        </h5>
                        <p className="text-blue-200 text-xs sm:text-sm mb-2">
                          {example.description}
                        </p>
                        <div className="code-block text-xs max-h-16 overflow-y-auto break-words font-mono">
                          {example.reqline}
                        </div>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <ArrowRight className="w-5 h-5 text-blue-300" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="bg-black/30 rounded-xl p-3 sm:p-6 border border-white/10">
              <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <History className="w-4 h-4" />
                Request History
              </h4>
              {requestHistory.length === 0 ? (
                <div className="text-center py-8 text-blue-200 text-sm">
                  <History className="w-12 h-12 mx-auto mb-4 text-blue-300" />
                  <p>
                    No request history yet. Execute your first request to see it
                    here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requestHistory.map((item) => (
                    <div
                      key={item.id}
                      className="bg-black/40 rounded-lg p-3 border border-white/10 hover:bg-black/60 transition-all duration-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-semibold text-white text-sm truncate">
                              {item.reqline.substring(0, 50)}...
                            </h5>
                            {item.result ? (
                              <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded-full">
                                {item.result.response.http_status}
                              </span>
                            ) : (
                              <span className="text-xs text-red-300 bg-red-500/20 px-2 py-1 rounded-full">
                                Error
                              </span>
                            )}
                          </div>
                          <div className="code-block text-xs max-h-16 overflow-y-auto break-words font-mono">
                            {item.reqline}
                          </div>
                          <div className="text-xs text-gray-400 mt-2">
                            {new Date(item.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 justify-center sm:justify-end">
                          <button
                            onClick={() => useHistoryItem(item)}
                            className="p-2 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg transition-all duration-300"
                            title="Use this request"
                          >
                            <Send size={16} />
                          </button>
                          <button
                            onClick={() => removeHistoryItem(item.id)}
                            className="p-2 text-red-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-all duration-300"
                            title="Remove from history"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReqlineParser;
