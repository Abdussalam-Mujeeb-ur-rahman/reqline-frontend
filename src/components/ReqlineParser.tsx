import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Copy,
  CheckCircle,
  Globe,
  Code,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Key,
  Layers,
  History,
  Upload,
  FileText,
  ArrowUp,
  Info,
  RotateCcw,
  Download,
  ArrowRight,
  Zap,
} from "lucide-react";
import axios from "axios";
import LoadingSpinner from "./LoadingSpinner";
import Toast from "./Toast";
import ProxyCard from "./ProxyCard";
import { useTheme } from "../contexts/ThemeContext";
import { useThemeClasses } from "../hooks/useThemeClasses";
import config from "../../config";
import fileUploadService from "../services/fileUpload";
import {
  validateReqlineLength,
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
  useProxy?: boolean;
  proxyTarget?: string;
}

const ReqlineParser = () => {
  const { isDark } = useTheme();
  const theme = useThemeClasses();
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
  const [useProxy, setUseProxy] = useState(false);
  const [proxyTarget, setProxyTarget] = useState("http://localhost:8080");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formDataFields, setFormDataFields] = useState<Record<string, string>>(
    {}
  );

  const navigate = useNavigate();

  // Actively watch for URL changes in real-time
  useEffect(() => {
    checkAndEnableProxy(reqline);
  }, [reqline]);

  // Keywords for Reqline syntax with smart templates
  const keywords = [
    { text: "HTTP", template: "HTTP GET" },
    { text: "URL", template: "URL https://dummyjson.com/quotes/3" },
    { text: "HEADERS", template: 'HEADERS {"Authorization": "Bearer token"}' },
    { text: "BODY", template: "BODY {}" },
    { text: "QUERY", template: 'QUERY {"query1": 1920933}' },
    {
      text: "FORMDATA",
      template: "FORMDATA {}",
      isFileUpload: true,
    },
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
    {
      name: "FormData File Upload",
      description:
        "Upload file with form data (click FORMDATA button to use file picker)",
      reqline:
        'HTTP POST | URL https://api.example.com/upload | FORMDATA {"name": "John Doe"}',
      color: "from-pink-500 to-pink-600",
      icon: <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
      note: "Click the FORMDATA keyword button to open file picker and add files",
    },
    {
      name: "Localhost API Testing",
      description: "Test your local development server",
      reqline: "HTTP GET | URL http://localhost:3000/api/users",
      color: "from-cyan-500 to-cyan-600",
      icon: <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
      note: "Auto-detects localhost! Configure CORS on your local server to allow this domain.",
    },
    {
      name: "CORS Setup Guide",
      description: "Quick CORS configuration for popular frameworks",
      reqline: "// CORS Setup Examples",
      color: "from-yellow-500 to-yellow-600",
      icon: <Key className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
      note: "Express: app.use(cors({origin: 'https://reqline-frontend.vercel.app'})) | FastAPI: add CORSMiddleware | Spring: @CrossOrigin",
    },
  ];

  // Check if a keyword is present in the current input
  const isKeywordPresent = (keyword: string): boolean => {
    return reqline.toUpperCase().includes(keyword.toUpperCase());
  };

  // Normalize delimiters: ensure single " | ", remove leading/trailing delimiters
  const normalizeDelimiters = (text: string): string => {
    let output = text;
    // Ensure single spacing around delimiter
    output = output.replace(/\s*\|\s*/g, " | ");
    // Collapse repeated delimiters
    output = output.replace(/(?: \| )+/g, " | ");
    // Remove leading/trailing delimiters
    output = output.replace(/^(?: \| )+/, "");
    output = output.replace(/(?: \| )+$/, "");
    return output;
  };

  // Handle keyword click to insert template with smart delimiter logic
  const handleKeywordClick = (template: string, isFileUpload = false) => {
    if (isFileUpload) {
      // For file uploads, add a default field to show the UI
      updateFormDataField("name", "John Doe");
      return;
    }

    const currentValue = reqline;
    let insertText = template;

    // Smart delimiter logic
    if (currentValue.trim() !== "") {
      const endsWithDelimiter = /\|\s*$/.test(currentValue);
      // If there's already a trailing delimiter, do not add another
      insertText = (endsWithDelimiter ? "" : " | ") + template;
    }

    const newValue = normalizeDelimiters(currentValue + insertText);
    setReqline(newValue);
  };

  // Auto-detect localhost URLs and enable proxy automatically
  const checkAndEnableProxy = (reqlineText: string) => {
    const localhostRegex = /localhost:\d+/i;
    const hasLocalhost = localhostRegex.test(reqlineText);

    if (hasLocalhost) {
      // Always enable proxy when localhost is detected
      setUseProxy(true);

      // Extract the localhost URL from the reqline - improved regex to handle both http and https
      const urlMatch = reqlineText.match(/URL\s+(https?:\/\/localhost:\d+)/i);

      if (urlMatch) {
        setProxyTarget(urlMatch[1]);
      } else {
        // Try to extract just the port number and construct the URL
        const portMatch = reqlineText.match(/localhost:(\d+)/i);

        if (portMatch) {
          const constructedUrl = `http://localhost:${portMatch[1]}`;
          setProxyTarget(constructedUrl);
        } else {
          // Default to common localhost port
          setProxyTarget("http://localhost:8080");
        }
      }

      // Show CORS warning for localhost requests
      setToast({
        message: `🌐 Localhost detected! Make sure CORS is configured on your local server to allow origin: ${window.location.origin} or set to "*"`,
        type: "success",
      });
    } else {
      // Disable proxy if no localhost detected
      setUseProxy(false);
    }
  };

  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFormDataField = (key: string, value: string) => {
    setFormDataFields((prev) => ({ ...prev, [key]: value }));
  };

  const removeFormDataField = (key: string) => {
    setFormDataFields((prev) => {
      const newFields = { ...prev };
      delete newFields[key];
      return newFields;
    });
  };

  const generateFormDataReqline = async () => {
    try {
      // Upload files first
      const uploadedFiles = await fileUploadService.uploadFiles(selectedFiles);

      // Generate FormData reqline with server file paths
      const formDataReqline = fileUploadService.generateFormDataReqline(
        uploadedFiles,
        formDataFields
      );

      return formDataReqline;
    } catch (error: any) {
      setToast({
        message: `File upload failed: ${error.message}`,
        type: "error",
      });
      throw error;
    }
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

  // Function to make direct requests to localhost (client-side proxy)
  const makeDirectLocalhostRequest = async (
    reqline: string,
    proxyTarget: string
  ) => {
    try {
      // Parse the reqline to extract request details
      const parts = reqline.split(" | ");
      const method = parts[0].replace("HTTP ", "").toUpperCase();

      let url = "";
      let headers: Record<string, string> = {};
      let body: any = null;
      let query: Record<string, any> = {};

      // Parse each part of the reqline
      for (const part of parts) {
        if (part.startsWith("URL ")) {
          url = part.replace("URL ", "");
        } else if (part.startsWith("HEADERS ")) {
          try {
            headers = JSON.parse(part.replace("HEADERS ", ""));
          } catch (e) {
            console.warn("Invalid headers format:", part);
          }
        } else if (part.startsWith("BODY ")) {
          try {
            body = JSON.parse(part.replace("BODY ", ""));
          } catch (e) {
            body = part.replace("BODY ", "");
          }
        } else if (part.startsWith("QUERY ")) {
          try {
            query = JSON.parse(part.replace("QUERY ", ""));
          } catch (e) {
            console.warn("Invalid query format:", part);
          }
        }
      }

      // Replace the original URL with the proxy target
      const originalUrl = url;
      const urlPath =
        new URL(originalUrl).pathname + new URL(originalUrl).search;
      const targetUrl = proxyTarget + urlPath;

      // Add query parameters if any
      const queryString = new URLSearchParams(query).toString();
      const finalUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

      console.log("🌐 Direct request details:");
      console.log("  - method:", method);
      console.log("  - finalUrl:", finalUrl);
      console.log("  - headers:", headers);
      console.log("  - body:", body);

      // Make the direct request
      const response = await fetch(finalUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseData = await response.json();

      // Format response to match the expected ApiResponse structure
      const formattedResponse = {
        request: {
          query: query,
          body: body || {},
          headers: headers,
          full_url: finalUrl,
        },
        response: {
          http_status: response.status,
          duration: 0, // We can't measure this easily in client-side
          request_start_timestamp: Date.now(),
          request_stop_timestamp: Date.now(),
          response_data: responseData,
        },
        proxy_info: {
          original_url: originalUrl,
          proxy_target: proxyTarget,
          proxied_url: finalUrl,
        },
      };

      return { data: formattedResponse };
    } catch (error: any) {
      console.error("Direct localhost request failed:", error);

      // Check for CORS errors
      if (
        error.message.includes("CORS") ||
        error.message.includes("Access-Control-Allow-Origin")
      ) {
        throw new Error(
          `CORS Error: Your local server at ${proxyTarget} needs to allow requests from this domain. ` +
            `Add CORS configuration to allow origin: ${window.location.origin}. ` +
            `See documentation for setup instructions.`
        );
      }

      // Check for network errors
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        throw new Error(
          `Connection failed to ${proxyTarget}. Make sure your local server is running and accessible.`
        );
      }

      throw new Error(`Connection failed to ${proxyTarget}: ${error.message}`);
    }
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

    // Normalize delimiters before sending
    const preparedReqline = normalizeDelimiters(reqline).trim();
    setReqline(preparedReqline);

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let response;

      if (useProxy) {
        // For localhost requests, make direct client-side requests
        response = await makeDirectLocalhostRequest(
          preparedReqline,
          proxyTarget
        );
      } else {
        // For regular requests, use the backend
        const endpoint = `${config.apiUrl}/`;

        // Check if this is a FormData request with files
        const hasFormDataWithFiles =
          selectedFiles.length > 0 && preparedReqline.includes("FORMDATA");

        if (hasFormDataWithFiles) {
          // For FormData with files, we need to send the actual files
          const formData = new FormData();
          formData.append("reqline", preparedReqline);

          // Add files to FormData
          selectedFiles.forEach((file, index) => {
            formData.append(`file_${index + 1}`, file);
          });

          // Add form fields
          Object.entries(formDataFields).forEach(([key, value]) => {
            formData.append(key, value);
          });

          response = await axios.post(endpoint, formData, {
            timeout: REQUEST_TIMEOUT,
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
        } else {
          // Regular JSON request
          const payload = { reqline: preparedReqline };

          response = await axios.post(endpoint, payload, {
            timeout: REQUEST_TIMEOUT,
            headers: {
              "Content-Type": "application/json",
            },
          });
        }
      }

      // Sanitize response data
      const sanitizedData = sanitizeResponseData(response.data);
      setResult(sanitizedData as ApiResponse);

      // Add to history
      const historyItem: RequestHistory = {
        id: Date.now().toString(),
        reqline: preparedReqline,
        result: sanitizedData as ApiResponse,
        error: null,
        timestamp: Date.now(),
        useProxy: useProxy,
        proxyTarget: useProxy ? proxyTarget : undefined,
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
        reqline: preparedReqline,
        result: null,
        error: safeErrorMessage,
        timestamp: Date.now(),
        useProxy: useProxy,
        proxyTarget: useProxy ? proxyTarget : undefined,
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
    // Check if it's a proxy target
    if (item.name.startsWith("Proxy:")) {
      setProxyTarget(item.value);
      setUseProxy(true);
      setActiveTab("request"); // Switch to request tab
      setToast({
        message: `Proxy target set to ${item.value}`,
        type: "success",
      });
    } else {
      setReqline(item.value);
      setActiveTab("request"); // Switch to request tab
      setToast({ message: `Loaded: ${item.name}`, type: "success" });
    }
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
    if (item.useProxy && item.proxyTarget) {
      setUseProxy(true);
      setProxyTarget(item.proxyTarget);
    } else {
      setUseProxy(false);
    }
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
    <div className="min-h-screen transition-colors duration-300 bg-transparent">
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
          className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center ${
            isDark
              ? "bg-slate-700 hover:bg-slate-600 text-slate-100"
              : "bg-slate-800 hover:bg-slate-900 text-slate-100"
          }`}
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          <ArrowUp size={20} />
        </button>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div
              className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-xl ${
                isDark ? "bg-slate-700" : "bg-slate-800"
              }`}
            >
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1
                className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${theme.text.primary}`}
              >
                API Request Tester
              </h1>
              <p className={`text-sm sm:text-base ${theme.text.secondary}`}>
                Test individual API endpoints with Reqline syntax
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            className={`flex rounded-2xl p-1 border transition-colors duration-300 overflow-x-auto ${
              isDark
                ? "bg-slate-800 border-slate-700"
                : "bg-slate-100 border-slate-200"
            }`}
          >
            <button
              onClick={() => setActiveTab("request")}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-300 rounded-xl flex-1 sm:flex-none whitespace-nowrap ${
                activeTab === "request"
                  ? isDark
                    ? "text-slate-100 bg-slate-700 border border-slate-600 shadow-lg"
                    : "text-slate-100 bg-slate-800 border border-slate-700 shadow-lg"
                  : isDark
                  ? "text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"
              }`}
            >
              <Send size={14} className="sm:w-4 sm:h-4" />
              <span>Request</span>
            </button>
            <button
              onClick={() => setActiveTab("vault")}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-300 rounded-xl flex-1 sm:flex-none whitespace-nowrap ${
                activeTab === "vault"
                  ? isDark
                    ? "text-slate-100 bg-slate-700 border border-slate-600 shadow-lg"
                    : "text-slate-100 bg-slate-800 border border-slate-700 shadow-lg"
                  : isDark
                  ? "text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"
              }`}
            >
              <Key size={14} className="sm:w-4 sm:h-4" />
              <span>Vault</span>
            </button>
            <button
              onClick={() => setActiveTab("examples")}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-300 rounded-xl flex-1 sm:flex-none whitespace-nowrap ${
                activeTab === "examples"
                  ? isDark
                    ? "text-slate-100 bg-slate-700 border border-slate-600 shadow-lg"
                    : "text-slate-100 bg-slate-800 border border-slate-700 shadow-lg"
                  : isDark
                  ? "text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"
              }`}
            >
              <Info size={14} className="sm:w-4 sm:h-4" />
              <span>Examples</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-300 rounded-xl flex-1 sm:flex-none whitespace-nowrap ${
                activeTab === "history"
                  ? isDark
                    ? "text-slate-100 bg-slate-700 border border-slate-600 shadow-lg"
                    : "text-slate-100 bg-slate-800 border border-slate-700 shadow-lg"
                  : isDark
                  ? "text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"
              }`}
            >
              <History size={14} className="sm:w-4 sm:h-4" />
              <span>History</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6 sm:space-y-8">
          {/* Single Request Tab */}
          {activeTab === "request" && (
            <div className="space-y-6 sm:space-y-8">
              {/* Request Form Card */}
              <div
                className={`rounded-3xl p-6 sm:p-8 border shadow-lg transition-colors duration-300 bg-transparent ${theme.border.primary}`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2
                    className={`text-xl sm:text-2xl font-bold flex items-center gap-3 ${theme.text.primary}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isDark ? "bg-slate-700" : "bg-slate-800"
                      }`}
                    >
                      <Send className="w-4 h-4 text-white" />
                    </div>
                    Request Builder
                  </h2>
                  <button
                    onClick={() => navigate("/multiple-endpoints")}
                    className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-colors ${theme.button.secondary}`}
                  >
                    <Layers size={16} />
                    <span className="hidden sm:inline">Multiple Endpoints</span>
                    <span className="sm:hidden">Multiple</span>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Keyword Suggestions */}
                  <div>
                    <h3
                      className={`${theme.text.primary} font-semibold mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2 text-sm sm:text-base`}
                    >
                      <Code className="w-3 h-3 sm:w-4 sm:h-4" />
                      Quick Actions
                    </h3>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {keywords.map((keyword, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() =>
                            handleKeywordClick(
                              keyword.template,
                              (keyword as any).isFileUpload
                            )
                          }
                          className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 hover:scale-105 ${
                            isKeywordPresent(keyword.text)
                              ? theme.button.keywordActive
                              : theme.button.keywordInactive
                          }`}
                          title={`Insert ${keyword.template}`}
                        >
                          {keyword.text}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* File Upload Section */}
                  {(selectedFiles.length > 0 ||
                    Object.keys(formDataFields).length > 0) && (
                    <div
                      className={`${theme.bg.card} rounded-2xl p-4 sm:p-6 ${theme.border.primary} shadow-lg`}
                    >
                      <h3
                        className={`${theme.text.primary} font-semibold mb-3 sm:mb-4 flex items-center gap-1 sm:gap-2 text-sm sm:text-base`}
                      >
                        <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                        FormData Configuration
                      </h3>

                      {/* File Selection */}
                      <div className="mb-4 sm:mb-6">
                        <label
                          className={`block ${theme.text.accent} font-medium mb-2 sm:mb-3 text-sm sm:text-base`}
                        >
                          Files to Upload
                        </label>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className={`w-full ${theme.bg.input} ${theme.border.primary} rounded-lg sm:rounded-xl ${theme.text.primary} text-xs sm:text-sm p-3 sm:p-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                        />
                        {selectedFiles.length > 0 && (
                          <div className="mt-3 sm:mt-4 space-y-2">
                            {selectedFiles.map((file, index) => (
                              <div
                                key={index}
                                className={`flex items-center justify-between ${theme.bg.code} rounded-lg sm:rounded-xl p-2 sm:p-3`}
                              >
                                <span
                                  className={`${theme.text.primary} text-xs sm:text-sm truncate`}
                                >
                                  {file.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className={`${theme.text.muted} hover:${theme.text.secondary} text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-lg hover:${theme.bg.secondary}`}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Form Data Fields */}
                      <div className="mb-4 sm:mb-6">
                        <label
                          className={`block ${theme.text.accent} font-medium mb-2 sm:mb-3 text-sm sm:text-base`}
                        >
                          Additional Form Fields
                        </label>
                        {Object.entries(formDataFields).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-2 sm:mb-3"
                          >
                            <input
                              type="text"
                              placeholder="Field name"
                              value={key}
                              onChange={(e) => {
                                const newKey = e.target.value;
                                const newFields = { ...formDataFields };
                                delete newFields[key];
                                newFields[newKey] = value;
                                setFormDataFields(newFields);
                              }}
                              className={`flex-1 ${theme.bg.input} ${theme.border.primary} rounded-lg sm:rounded-xl ${theme.text.primary} ${theme.text.placeholder} text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                            />
                            <input
                              type="text"
                              placeholder="Field value"
                              value={value}
                              onChange={(e) =>
                                updateFormDataField(key, e.target.value)
                              }
                              className={`flex-1 ${theme.bg.input} ${theme.border.primary} rounded-lg sm:rounded-xl ${theme.text.primary} ${theme.text.placeholder} text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                            />
                            <button
                              type="button"
                              onClick={() => removeFormDataField(key)}
                              className={`${theme.text.muted} hover:${theme.text.secondary} text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:${theme.bg.secondary} whitespace-nowrap`}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            updateFormDataField(`field_${Date.now()}`, "")
                          }
                          className={`${theme.text.accent} hover:${theme.text.primary} text-xs sm:text-sm`}
                        >
                          + Add Field
                        </button>
                      </div>

                      {/* Generate FormData Button */}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const formDataReqline =
                              await generateFormDataReqline();
                            const currentValue = reqline;
                            const insertText =
                              currentValue.trim() !== ""
                                ? " | " + formDataReqline
                                : formDataReqline;
                            setReqline(currentValue + insertText);
                            setToast({
                              message: "FormData generated successfully!",
                              type: "success",
                            });
                          } catch (error) {
                            // Error already handled in generateFormDataReqline
                          }
                        }}
                        className={`${theme.button.primary} flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl w-full sm:w-auto`}
                      >
                        <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                        Generate FormData
                      </button>
                    </div>
                  )}

                  {/* Request Input */}
                  <div>
                    <h3
                      className={`${theme.text.primary} font-semibold mb-3 flex items-center gap-2`}
                    >
                      <FileText className="w-4 h-4" />
                      Request Syntax
                    </h3>
                    <div className="relative">
                      <textarea
                        value={reqline}
                        onChange={handleInputChange}
                        placeholder="HTTP GET | URL https://dummyjson.com/quotes/3 | QUERY {'refid': 1920933}"
                        className={`w-full h-32 ${theme.bg.input} ${theme.border.primary} rounded-2xl ${theme.text.primary} ${theme.text.placeholder} resize-none text-sm font-mono p-6 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300`}
                        maxLength={10000}
                        aria-label="Reqline syntax input"
                      />
                      <div
                        className={`absolute top-4 right-4 ${theme.text.muted} text-xs ${theme.bg.secondary} px-3 py-1 rounded-full`}
                      >
                        {reqline.length}/10000
                      </div>
                    </div>
                  </div>

                  {/* Proxy Configuration */}
                  {useProxy && (
                    <ProxyCard
                      proxyTarget={proxyTarget}
                      onDisable={() => setUseProxy(false)}
                      onTargetChange={setProxyTarget}
                      className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20"
                    />
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      type="submit"
                      disabled={isLoading || !reqline.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-lg flex-1 sm:flex-none px-8 py-4 rounded-xl font-semibold transition-colors duration-200"
                      aria-label="Execute request"
                    >
                      {isLoading ? (
                        <LoadingSpinner size={20} />
                      ) : (
                        <Send size={20} />
                      )}
                      {isLoading ? "Processing..." : "Execute Request"}
                    </button>

                    <button
                      type="button"
                      onClick={handleClear}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 flex items-center justify-center gap-3 text-sm px-8 py-4 rounded-xl transition-colors duration-200"
                      aria-label="Clear all data"
                    >
                      <RotateCcw size={20} />
                      Clear
                    </button>
                  </div>
                </form>
              </div>

              {/* Results Section */}
              {(result || error) && (
                <div
                  id="response-details-section"
                  className={`${theme.bg.card} rounded-3xl p-6 sm:p-8 ${theme.border.primary} shadow-lg`}
                >
                  <h2
                    className={`text-xl sm:text-2xl font-bold ${theme.text.primary} mb-6 flex items-center gap-3`}
                  >
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                      {result ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    {result ? "Response Details" : "Error Details"}
                  </h2>

                  {result && (
                    <div className="space-y-6">
                      {/* Response Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div
                          className={`${theme.status.success} rounded-2xl p-4`}
                        >
                          <div
                            className={`${theme.text.accent} text-sm font-medium mb-1`}
                          >
                            Status
                          </div>
                          <div
                            className={`${theme.text.primary} text-2xl font-bold`}
                          >
                            {result.response.http_status}
                          </div>
                        </div>
                        <div className={`${theme.status.info} rounded-2xl p-4`}>
                          <div
                            className={`${theme.text.accent} text-sm font-medium mb-1`}
                          >
                            Duration
                          </div>
                          <div
                            className={`${theme.text.primary} text-2xl font-bold`}
                          >
                            {formatDuration(result.response.duration)}
                          </div>
                        </div>
                        <div className={`${theme.status.info} rounded-2xl p-4`}>
                          <div
                            className={`${theme.text.accent} text-sm font-medium mb-1`}
                          >
                            Started
                          </div>
                          <div className={`${theme.text.primary} text-sm`}>
                            {formatTimestamp(
                              result.response.request_start_timestamp
                            )}
                          </div>
                        </div>
                        <div className={`${theme.status.info} rounded-2xl p-4`}>
                          <div
                            className={`${theme.text.accent} text-sm font-medium mb-1`}
                          >
                            Completed
                          </div>
                          <div className={`${theme.text.primary} text-sm`}>
                            {formatTimestamp(
                              result.response.request_stop_timestamp
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Request Details */}
                      <div
                        className={`${theme.bg.code} rounded-2xl p-6 ${theme.border.primary}`}
                      >
                        <h3
                          className={`${theme.text.primary} font-semibold mb-4 flex items-center gap-2`}
                        >
                          <Globe className="w-4 h-4" />
                          Request Details
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div>
                            <span
                              className={`${theme.text.accent} font-medium`}
                            >
                              URL:
                            </span>{" "}
                            <span
                              className={`${theme.text.primary} font-mono break-all`}
                            >
                              {result.request.full_url}
                            </span>
                          </div>
                          {Object.keys(result.request.headers).length > 0 && (
                            <div>
                              <span
                                className={`${theme.text.accent} font-medium`}
                              >
                                Headers:
                              </span>{" "}
                              <span
                                className={`${theme.text.primary} font-mono`}
                              >
                                {JSON.stringify(result.request.headers)}
                              </span>
                            </div>
                          )}
                          {Object.keys(result.request.query).length > 0 && (
                            <div>
                              <span
                                className={`${theme.text.accent} font-medium`}
                              >
                                Query:
                              </span>{" "}
                              <span
                                className={`${theme.text.primary} font-mono`}
                              >
                                {JSON.stringify(result.request.query)}
                              </span>
                            </div>
                          )}
                          {Object.keys(result.request.body).length > 0 && (
                            <div>
                              <span
                                className={`${theme.text.accent} font-medium`}
                              >
                                Body:
                              </span>{" "}
                              <span
                                className={`${theme.text.primary} font-mono`}
                              >
                                {JSON.stringify(result.request.body)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Proxy Information */}
                      {(result as any).proxy_info && (
                        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl p-6 border border-blue-500/20">
                          <h3 className="text-blue-300 font-semibold mb-4 flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Proxy Information
                          </h3>
                          <div className="space-y-3 text-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className="text-blue-300 font-medium">
                                Original URL:
                              </span>
                              <span className="text-white font-mono break-all">
                                {(result as any).proxy_info.original_url}
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className="text-blue-300 font-medium">
                                Proxy Target:
                              </span>
                              <span className="text-white font-mono break-all">
                                {(result as any).proxy_info.proxy_target}
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className="text-blue-300 font-medium">
                                Proxied URL:
                              </span>
                              <span className="text-white font-mono break-all">
                                {(result as any).proxy_info.proxied_url}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Response Data */}
                      <div className="bg-black/40 rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-white font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Response Data
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={copyResponseData}
                              className={`p-2 ${theme.text.accent} hover:text-white hover:${theme.bg.secondary} rounded-xl transition-all duration-300`}
                              title="Copy response data"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              onClick={copyResultAsJson}
                              className={`p-2 ${theme.text.accent} hover:text-white hover:${theme.bg.secondary} rounded-xl transition-all duration-300`}
                              title="Copy full result"
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="bg-black/60 rounded-xl p-4 max-h-64 overflow-y-auto">
                          <pre className="text-sm text-white whitespace-pre-wrap">
                            {JSON.stringify(
                              result.response.response_data,
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-2xl p-6 border border-red-500/20">
                      <h3 className="text-red-300 font-semibold mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Error Details
                      </h3>
                      <div className="bg-black/60 rounded-xl p-4">
                        <pre className="text-sm text-red-200 whitespace-pre-wrap">
                          {error}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Vault Tab */}
          {activeTab === "vault" && (
            <div className="space-y-6 sm:space-y-8">
              {/* Add New Vault Item */}
              <div
                className={`${theme.bg.card} rounded-3xl p-6 sm:p-8 ${theme.border.primary} shadow-lg`}
              >
                <h2
                  className={`text-xl sm:text-2xl font-bold ${theme.text.primary} mb-6 flex items-center gap-3`}
                >
                  <div
                    className={`w-8 h-8 ${
                      isDark ? "bg-slate-700" : "bg-slate-800"
                    } rounded-lg flex items-center justify-center`}
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  Add New Vault Item
                </h2>
                <div className="space-y-4">
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
                    className={`w-full ${theme.bg.input} ${theme.border.primary} rounded-xl ${theme.text.primary} ${theme.text.placeholder} text-sm p-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
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
                    className={`w-full ${theme.bg.input} ${theme.border.primary} rounded-xl ${theme.text.primary} ${theme.text.placeholder} text-sm p-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none h-24 font-mono`}
                  />
                  <button
                    onClick={addVaultItem}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-sm px-6 py-3 rounded-xl transition-colors duration-200"
                  >
                    <Save className="w-4 h-4" />
                    Add to Vault
                  </button>
                </div>
              </div>

              {/* Vault Items */}
              <div
                className={`${theme.bg.card} rounded-3xl p-6 sm:p-8 ${theme.border.primary} shadow-lg`}
              >
                <h2
                  className={`text-xl sm:text-2xl font-bold ${theme.text.primary} mb-6 flex items-center gap-3`}
                >
                  <div
                    className={`w-8 h-8 ${
                      isDark ? "bg-slate-700" : "bg-slate-800"
                    } rounded-lg flex items-center justify-center`}
                  >
                    <Key className="w-4 h-4 text-white" />
                  </div>
                  Saved Vault Items
                </h2>
                {vaultItems.length === 0 ? (
                  <div className={`text-center py-12 ${theme.text.secondary}`}>
                    <Key
                      className={`w-16 h-16 mx-auto mb-4 ${theme.text.muted}`}
                    />
                    <p className="text-lg">
                      No vault items saved yet. Add your first item above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vaultItems.map((item) => (
                      <div
                        key={item.id}
                        className={`${theme.bg.code} rounded-2xl p-4 ${theme.border.primary} hover:${theme.bg.secondary} transition-all duration-300`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`font-semibold ${theme.text.primary} text-lg mb-2`}
                            >
                              {item.name}
                            </h3>
                            <div
                              className={`${theme.bg.code} rounded-xl p-3 max-h-20 overflow-y-auto`}
                            >
                              <pre
                                className={`text-sm ${theme.text.primary} whitespace-pre-wrap font-mono`}
                              >
                                {item.value}
                              </pre>
                            </div>
                            <div className={`text-sm ${theme.text.muted} mt-2`}>
                              {new Date(item.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => useVaultItem(item)}
                              className={`p-3 ${theme.button.vaultAction} rounded-xl transition-all duration-300`}
                              title="Use this item"
                            >
                              <Send size={18} />
                            </button>
                            <button
                              onClick={() => copyVaultItem(item)}
                              className={`p-3 ${theme.button.vaultAction} rounded-xl transition-all duration-300`}
                              title="Copy to clipboard"
                            >
                              <Copy size={18} />
                            </button>
                            <button
                              onClick={() => removeVaultItem(item.id)}
                              className="p-3 text-red-600 hover:text-white hover:bg-red-600 rounded-xl transition-all duration-300"
                              title="Remove item"
                            >
                              <Trash2 size={18} />
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
            <div
              className={`${theme.bg.card} rounded-3xl p-6 sm:p-8 ${theme.border.primary} shadow-lg`}
            >
              <h2
                className={`text-xl sm:text-2xl font-bold ${theme.text.primary} mb-6 flex items-center gap-3`}
              >
                <div
                  className={`w-8 h-8 ${
                    isDark ? "bg-slate-700" : "bg-slate-800"
                  } rounded-lg flex items-center justify-center`}
                >
                  <Info className="w-4 h-4 text-white" />
                </div>
                Example Requests
              </h2>
              <p
                className={`${theme.text.secondary} text-base sm:text-lg mb-6 sm:mb-8`}
              >
                Common use cases and syntax examples. Click any example to load
                it into the request form.
              </p>
              <div className="grid gap-4 sm:gap-6">
                {examples.map((example, index) => (
                  <div
                    key={index}
                    className={`${theme.bg.code} rounded-2xl p-4 sm:p-6 ${theme.border.primary} hover:${theme.bg.secondary} transition-all duration-300 group cursor-pointer w-full overflow-hidden`}
                    onClick={() => {
                      setReqline(example.reqline);
                      setActiveTab("request");
                      setToast({
                        message: `Loaded: ${example.name}`,
                        type: "success",
                      });
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${example.color} rounded-xl flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0`}
                      >
                        {example.icon}
                      </div>
                      <div className="min-w-0 flex-1 text-center sm:text-left w-full overflow-hidden">
                        <h3
                          className={`font-semibold ${theme.text.primary} text-base sm:text-lg mb-2`}
                        >
                          {example.name}
                        </h3>
                        <p
                          className={`${theme.text.secondary} text-sm sm:text-base mb-3`}
                        >
                          {example.description}
                        </p>
                        {example.note && (
                          <p
                            className={`${theme.text.accent} text-xs sm:text-sm mb-3 ${theme.status.info} px-2 sm:px-3 py-2 rounded-xl`}
                          >
                            💡 {example.note}
                          </p>
                        )}
                        <div
                          className={`${theme.bg.code} rounded-xl p-3 sm:p-4 max-h-20 sm:max-h-24 overflow-y-auto overflow-x-hidden`}
                        >
                          <pre
                            className={`text-xs sm:text-sm ${theme.text.primary} whitespace-pre-wrap font-mono break-words break-all`}
                          >
                            {example.reqline}
                          </pre>
                        </div>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block">
                        <ArrowRight
                          className={`w-5 h-5 sm:w-6 sm:h-6 ${theme.text.accent}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div
              className={`${theme.bg.card} rounded-3xl p-6 sm:p-8 ${theme.border.primary} shadow-lg`}
            >
              <h2
                className={`text-xl sm:text-2xl font-bold ${theme.text.primary} mb-6 flex items-center gap-3`}
              >
                <div
                  className={`w-8 h-8 ${
                    isDark ? "bg-slate-700" : "bg-slate-800"
                  } rounded-lg flex items-center justify-center`}
                >
                  <History className="w-4 h-4 text-white" />
                </div>
                Request History
              </h2>
              {requestHistory.length === 0 ? (
                <div className={`text-center py-12 ${theme.text.secondary}`}>
                  <History
                    className={`w-16 h-16 mx-auto mb-4 ${theme.text.muted}`}
                  />
                  <p className="text-lg">
                    No request history yet. Execute your first request to see it
                    here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requestHistory.map((item) => (
                    <div
                      key={item.id}
                      className={`${theme.bg.code} rounded-2xl p-4 ${theme.border.primary} hover:${theme.bg.secondary} transition-all duration-300`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3
                              className={`font-semibold ${theme.text.primary} text-lg truncate`}
                            >
                              {item.reqline.substring(0, 50)}...
                            </h3>
                            {item.result ? (
                              <span className="text-sm text-green-700 bg-green-100 px-3 py-1 rounded-full">
                                {item.result.response.http_status}
                              </span>
                            ) : (
                              <span className="text-sm text-red-700 bg-red-100 px-3 py-1 rounded-full">
                                Error
                              </span>
                            )}
                          </div>
                          <div
                            className={`${theme.bg.code} rounded-xl p-3 max-h-20 overflow-y-auto`}
                          >
                            <pre
                              className={`text-sm ${theme.text.primary} whitespace-pre-wrap font-mono`}
                            >
                              {item.reqline}
                            </pre>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span className={`text-sm ${theme.text.muted}`}>
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                            {item.useProxy && item.proxyTarget && (
                              <span
                                className={`text-sm ${theme.text.accent} ${theme.status.info} px-3 py-1 rounded-full flex items-center gap-1`}
                              >
                                <Globe className="w-3 h-3" />
                                Proxy: {item.proxyTarget}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => useHistoryItem(item)}
                            className={`p-3 ${theme.button.historyAction} rounded-xl transition-all duration-300`}
                            title="Use this request"
                          >
                            <Send size={18} />
                          </button>
                          <button
                            onClick={() => removeHistoryItem(item.id)}
                            className="p-3 text-red-600 hover:text-white hover:bg-red-600 rounded-xl transition-all duration-300"
                            title="Remove from history"
                          >
                            <Trash2 size={18} />
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
