import { useState, useCallback, useEffect } from "react";
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
  description?: string;
  createdAt: number;
}

const ReqlineParser = () => {
  const [reqline, setReqline] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(true);
  const [showVault, setShowVault] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [newVaultItem, setNewVaultItem] = useState({
    name: "",
    value: "",
    description: "",
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Keywords for Reqline syntax with smart templates
  const keywords = [
    { text: "HTTP", template: "HTTP GET" },
    { text: "URL", template: "URL https://dummyjson.com/quotes/3" },
    { text: "HEADERS", template: 'HEADERS {"Authorization": "Bearer token"}' },
    { text: "BODY", template: "BODY {}" },
    { text: "QUERY", template: 'QUERY {"query1": 1920933}' },
  ];

  // Check if a keyword is present in the current input
  const isKeywordPresent = (keyword: string): boolean => {
    return reqline.toUpperCase().includes(keyword.toUpperCase());
  };

  // Handle keyword click to insert template with smart delimiter logic
  const handleKeywordClick = (template: string) => {
    const textarea = document.querySelector(
      'textarea[aria-label="Reqline syntax input"]'
    ) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = reqline;

    let insertText = template;

    // Smart delimiter logic
    if (currentValue.trim() !== "") {
      // If there's already content, add delimiter before the keyword
      insertText = " | " + template;
    }

    // Insert template at cursor position
    const newValue =
      currentValue.substring(0, start) +
      insertText +
      currentValue.substring(end);
    setReqline(newValue);

    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + insertText.length,
        start + insertText.length
      );
    }, 0);
  };

  const examples = [
    {
      name: "Simple GET request",
      reqline: "HTTP GET | URL https://dummyjson.com/quotes/3",
      description: "Basic request to fetch data",
      icon: <Zap className="w-4 h-4" />,
      color: "from-blue-500 to-cyan-500",
    },
    {
      name: "GET with query parameters",
      reqline:
        'HTTP GET | URL https://dummyjson.com/quotes/3 | QUERY {"refid": 1920933}',
      description: "Request with additional parameters",
      icon: <Code className="w-4 h-4" />,
      color: "from-purple-500 to-pink-500",
    },
    {
      name: "POST with body",
      reqline:
        'HTTP POST | URL https://jsonplaceholder.typicode.com/posts | BODY {"title": "Test", "body": "Test body", "userId": 1}',
      description: "Create new resource with data",
      icon: <Send className="w-4 h-4" />,
      color: "from-green-500 to-emerald-500",
    },
    {
      name: "Complete request with headers",
      reqline:
        'HTTP GET | URL https://dummyjson.com/quotes/3 | HEADERS {"Authorization": "Bearer token"} | QUERY {"refid": 1920933}',
      description: "Full request with authentication",
      icon: <Sparkles className="w-4 h-4" />,
      color: "from-orange-500 to-red-500",
    },
  ];

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const sanitizedValue = sanitizeInput(e.target.value);
      setReqline(sanitizedValue);
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    const validation = validateReqlineLength(reqline);
    if (!validation.isValid) {
      setError(validation.error!);
      return;
    }

    // Check rate limiting
    const rateLimitCheck = checkRateLimit("user");
    if (!rateLimitCheck.allowed) {
      setError(
        `Too many requests. Please wait ${rateLimitCheck.retryAfter} seconds before trying again.`
      );
      return;
    }

    // Auto-collapse examples when sending request
    setShowExamples(false);

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
  const addVaultItem = () => {
    if (!newVaultItem.name.trim() || !newVaultItem.value.trim()) {
      setToast({ message: "Name and value are required", type: "error" });
      return;
    }

    const item: VaultItem = {
      id: Date.now().toString(),
      name: newVaultItem.name.trim(),
      value: newVaultItem.value.trim(),
      description: newVaultItem.description.trim() || undefined,
      createdAt: Date.now(),
    };

    setVaultItems((prev) => [...prev, item]);
    setNewVaultItem({ name: "", value: "", description: "" });
    setToast({ message: "Item added to vault", type: "success" });
  };

  const removeVaultItem = (id: string) => {
    setVaultItems((prev) => prev.filter((item) => item.id !== id));
    setToast({ message: "Item removed from vault", type: "success" });
  };

  const useVaultItem = (item: VaultItem) => {
    const textarea = document.querySelector(
      'textarea[aria-label="Reqline syntax input"]'
    ) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = reqline;

    // Insert vault value at cursor position
    const newValue =
      currentValue.substring(0, start) +
      item.value +
      currentValue.substring(end);
    setReqline(newValue);

    // Set cursor position after inserted value
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + item.value.length,
        start + item.value.length
      );
    }, 0);

    setToast({ message: `Inserted ${item.name}`, type: "success" });
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

      {/* Main Input Section */}
      <div className="glass-dark rounded-xl sm:rounded-2xl p-3 sm:p-6 lg:p-8 animate-fade-in-up border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
              Request Syntax
            </h2>
            <p className="text-blue-200 text-xs sm:text-sm lg:text-base">
              Enter your Reqline syntax below
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 sm:space-y-4 lg:space-y-6"
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

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 lg:gap-4">
            <button
              type="submit"
              disabled={isLoading || !reqline.trim()}
              className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-xs sm:text-sm lg:text-base"
              aria-label="Execute request"
            >
              {isLoading ? <LoadingSpinner size={16} /> : <Send size={16} />}
              {isLoading ? "Processing..." : "Execute Request"}
            </button>

            <button
              type="button"
              onClick={() => {
                const newShowExamples = !showExamples;
                setShowExamples(newShowExamples);
                if (newShowExamples) {
                  setTimeout(() => {
                    const examplesSection =
                      document.getElementById("examples-section");
                    if (examplesSection) {
                      examplesSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }
                  }, 100);
                }
              }}
              className="btn-secondary flex items-center justify-center gap-2 text-xs sm:text-sm lg:text-base"
              aria-label={showExamples ? "Hide examples" : "Show examples"}
            >
              {showExamples ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
              Examples {showExamples ? "(Hide)" : "(Show)"}
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="btn-secondary flex items-center justify-center gap-2 text-xs sm:text-sm lg:text-base"
              aria-label="Clear all data"
            >
              <RotateCcw size={16} />
              Clear
            </button>

            <button
              type="button"
              onClick={() => {
                const newShowVault = !showVault;
                setShowVault(newShowVault);
                if (newShowVault) {
                  setTimeout(() => {
                    const vaultSection =
                      document.getElementById("vault-section");
                    if (vaultSection) {
                      vaultSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }
                  }, 100);
                }
              }}
              className="btn-secondary flex items-center justify-center gap-2 text-xs sm:text-sm lg:text-base"
              aria-label={showVault ? "Hide vault" : "Show vault"}
            >
              <Key size={16} />
              Vault {showVault ? "(Hide)" : "(Show)"}
            </button>
          </div>
        </form>
      </div>

      {/* Examples Section */}
      {showExamples && (
        <div
          id="examples-section"
          className="glass-dark rounded-xl sm:rounded-2xl p-3 sm:p-6 lg:p-8 animate-slide-in-right border border-white/10"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-accent rounded-xl flex items-center justify-center shadow-lg">
              <Info className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                Example Requests
              </h3>
              <p className="text-blue-200 text-xs sm:text-sm lg:text-base">
                Common use cases and syntax examples
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:gap-6">
            {examples.map((example, index) => (
              <div
                key={index}
                className="bg-black/30 rounded-xl p-3 sm:p-6 border border-white/10 hover:bg-black/40 transition-all duration-300 group"
              >
                <div className="flex flex-col gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r ${example.color} rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      {example.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-white text-sm sm:text-base lg:text-lg mb-1">
                        {example.name}
                      </h4>
                      <p className="text-blue-200 text-xs sm:text-sm">
                        {example.description}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(example.reqline)}
                      className="p-2 sm:p-3 text-blue-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 group-hover:scale-110 flex-shrink-0"
                      title="Copy to clipboard"
                      aria-label={`Copy ${example.name} example`}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <div className="code-block text-xs sm:text-sm lg:text-base leading-relaxed">
                  {example.reqline}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vault Section */}
      {showVault && (
        <div
          id="vault-section"
          className="glass-dark rounded-xl sm:rounded-2xl p-3 sm:p-6 lg:p-8 animate-slide-in-right border border-white/10"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Key className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                Secure Vault
              </h3>
              <p className="text-blue-200 text-xs sm:text-sm lg:text-base">
                Store and reuse tokens, keys, and other data
              </p>
            </div>
          </div>

          {/* Add New Item */}
          <div className="bg-black/30 rounded-xl p-3 sm:p-6 border border-white/10 mb-4 sm:mb-6">
            <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Item
            </h4>
            <div className="grid gap-3 sm:gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <input
                  type="text"
                  placeholder="Name (e.g., JWT Token)"
                  value={newVaultItem.name}
                  onChange={(e) =>
                    setNewVaultItem((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="bg-black/40 border border-white/20 rounded-lg text-white placeholder-blue-300 text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newVaultItem.description}
                  onChange={(e) =>
                    setNewVaultItem((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="bg-black/40 border border-white/20 rounded-lg text-white placeholder-blue-300 text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <textarea
                placeholder="Value (e.g., eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)"
                value={newVaultItem.value}
                onChange={(e) =>
                  setNewVaultItem((prev) => ({
                    ...prev,
                    value: e.target.value,
                  }))
                }
                className="bg-black/40 border border-white/20 rounded-lg text-white placeholder-blue-300 text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none h-20"
              />
              <button
                onClick={addVaultItem}
                className="btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <Save size={16} />
                Add to Vault
              </button>
            </div>
          </div>

          {/* Vault Items */}
          <div className="space-y-3 sm:space-y-4">
            {vaultItems.length === 0 ? (
              <div className="text-center py-8 text-blue-200 text-sm">
                No items in vault. Add your first item above.
              </div>
            ) : (
              vaultItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-black/30 rounded-xl p-3 sm:p-4 border border-white/10 hover:bg-black/40 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-white text-sm sm:text-base">
                          {item.name}
                        </h5>
                        <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded-full">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-blue-200 text-xs sm:text-sm mb-2">
                          {item.description}
                        </p>
                      )}
                      <div className="code-block text-xs break-all">
                        {item.value.length > 50
                          ? `${item.value.substring(0, 50)}...`
                          : item.value}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => useVaultItem(item)}
                        className="p-2 text-blue-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                        title="Insert into request"
                        aria-label={`Insert ${item.name} into request`}
                      >
                        <ArrowRight size={16} />
                      </button>
                      <button
                        onClick={() => copyVaultItem(item)}
                        className="p-2 text-blue-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                        title="Copy to clipboard"
                        aria-label={`Copy ${item.name} to clipboard`}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => removeVaultItem(item.id)}
                        className="p-2 text-red-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-all duration-300"
                        title="Remove from vault"
                        aria-label={`Remove ${item.name} from vault`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="glass-dark border border-red-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 animate-fade-in-up">
          <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-error rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2">
                Error
              </h3>
              <p className="text-red-200 text-xs sm:text-sm lg:text-lg">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div
          id="results-section"
          className="space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in-up"
        >
          {/* Copy JSON Button */}
          <div className="flex justify-end">
            <button
              onClick={copyResultAsJson}
              className="btn-secondary flex items-center gap-2 text-xs sm:text-sm lg:text-base"
              title="Copy full result as JSON"
              aria-label="Copy result as JSON"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Copy Result as JSON</span>
              <span className="sm:hidden">Copy JSON</span>
            </button>
          </div>

          {/* Request Details */}
          <div className="glass-dark rounded-xl sm:rounded-2xl p-3 sm:p-6 lg:p-8 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-success rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                  Request Details
                </h3>
                <p className="text-blue-200 text-xs sm:text-sm lg:text-base">
                  Parsed request information
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-200 mb-2 sm:mb-3 flex items-center gap-2">
                    <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
                    Full URL
                  </h4>
                  <div className="code-block break-all text-xs sm:text-sm">
                    {result.request.full_url}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-200 mb-2 sm:mb-3 flex items-center gap-2">
                    <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                    Query Parameters
                  </h4>
                  <div className="code-block text-xs sm:text-sm">
                    {JSON.stringify(result.request.query, null, 2)}
                  </div>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-200 mb-2 sm:mb-3 flex items-center gap-2">
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                    Headers
                  </h4>
                  <div className="code-block text-xs sm:text-sm">
                    {JSON.stringify(result.request.headers, null, 2)}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-200 mb-2 sm:mb-3 flex items-center gap-2">
                    <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                    Request Body
                  </h4>
                  <div className="code-block text-xs sm:text-sm">
                    {JSON.stringify(result.request.body, null, 2)}
                  </div>
                </div>

                {result.request.cookies_sent &&
                  result.request.cookies_sent.length > 0 && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-blue-200 mb-2 sm:mb-3 flex items-center gap-2">
                        <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                        Cookies Sent
                      </h4>
                      <div className="code-block text-xs sm:text-sm">
                        {result.request.cookies_sent.map((cookie, index) => (
                          <div key={index} className="text-green-300">
                            {cookie}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Response Details */}
          <div
            id="response-details-section"
            className="glass-dark rounded-xl sm:rounded-2xl p-3 sm:p-6 lg:p-8 border border-white/10"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                  Response Details
                </h3>
                <p className="text-blue-200 text-xs sm:text-sm lg:text-base">
                  Response information and data
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6 lg:mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-black/30 rounded-xl p-3 sm:p-4 border border-white/10">
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-200 mb-2 sm:mb-3 flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    Status Code
                  </h4>
                  <div
                    className={`inline-block px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold ${
                      result.response.http_status >= 200 &&
                      result.response.http_status < 300
                        ? "bg-green-500/20 text-green-300 border border-green-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {result.response.http_status}
                  </div>
                </div>

                <div className="bg-black/30 rounded-xl p-3 sm:p-4 border border-white/10">
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-200 mb-2 sm:mb-3 flex items-center gap-2">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    Duration
                  </h4>
                  <div className="text-white font-mono text-xs sm:text-sm">
                    {formatDuration(result.response.duration)}
                  </div>
                </div>

                <div className="bg-black/30 rounded-xl p-3 sm:p-4 border border-white/10">
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-200 mb-2 sm:mb-3 flex items-center gap-2">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    Start Time
                  </h4>
                  <div className="text-white text-xs sm:text-sm">
                    {formatTimestamp(result.response.request_start_timestamp)}
                  </div>
                </div>

                <div className="bg-black/30 rounded-xl p-3 sm:p-4 border border-white/10">
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-200 mb-2 sm:mb-3 flex items-center gap-2">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    End Time
                  </h4>
                  <div className="text-white text-xs sm:text-sm">
                    {formatTimestamp(result.response.request_stop_timestamp)}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h4 className="text-xs sm:text-sm font-semibold text-blue-200 flex items-center gap-2">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  Response Data
                </h4>
                <button
                  onClick={copyResponseData}
                  className="p-2 sm:p-3 text-blue-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
                  title="Copy response data"
                  aria-label="Copy response data"
                >
                  <Copy size={16} />
                </button>
              </div>
              <div
                className="code-block text-xs sm:text-sm"
                style={{ maxHeight: config.maxResponseHeight }}
              >
                {JSON.stringify(result.response.response_data, null, 2)}
              </div>
            </div>

            {result.response.cookies_received &&
              result.response.cookies_received.length > 0 && (
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-200 mb-3 sm:mb-4 flex items-center gap-2">
                    <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                    Cookies Received
                  </h4>
                  <div className="code-block text-xs sm:text-sm">
                    {result.response.cookies_received.map((cookie, index) => (
                      <div key={index} className="text-green-300">
                        {cookie}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReqlineParser;
