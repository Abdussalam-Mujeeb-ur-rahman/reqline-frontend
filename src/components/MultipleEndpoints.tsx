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
  BookOpen,
  FileDown,
  FileUp,
  Edit3,
  Eye,
  EyeOff,
  ArrowLeft,
  Play,
  Square,
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

// Multiple Endpoints Interfaces
interface EndpointTest {
  id: string;
  title: string;
  description: string;
  reqline: string;
  result: ApiResponse | null;
  error: string | null;
  isLoading: boolean;
  createdAt: number;
  executedAt?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface TestSuite {
  id: string;
  title: string;
  description: string;
  baseUrl: string; // Base URL for all endpoints in this suite
  endpoints: EndpointTest[];
  createdAt: number;
  updatedAt: number;
  expiresAt: number; // 4 hours from creation
}

const MultipleEndpoints = () => {
  const navigate = useNavigate();
  const [currentSuite, setCurrentSuite] = useState<TestSuite | null>(null);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [showSuiteHistory, setShowSuiteHistory] = useState(false);
  const [newEndpoint, setNewEndpoint] = useState({
    title: "",
    description: "",
    reqline: "",
  });
  const [newEndpointTestResult, setNewEndpointTestResult] = useState<{
    isLoading: boolean;
    result: any;
    error: string | null;
    executedAt?: number;
  }>({
    isLoading: false,
    result: null,
    error: null,
  });
  const [editingEndpoint, setEditingEndpoint] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
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

  // Utility Functions
  const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const loadSuitesFromStorage = (): TestSuite[] => {
    try {
      const stored = localStorage.getItem("reqline-test-suites");
      if (!stored) return [];

      const suites: TestSuite[] = JSON.parse(stored);
      const now = Date.now();

      // Filter out expired suites
      const validSuites = suites.filter(suite => now <= suite.expiresAt);
      
      // Update storage with only valid suites
      if (validSuites.length !== suites.length) {
        localStorage.setItem("reqline-test-suites", JSON.stringify(validSuites));
      }

      return validSuites;
    } catch (error) {
      console.error("Error loading test suites from storage:", error);
      return [];
    }
  };

  const saveSuitesToStorage = (suites: TestSuite[]): void => {
    try {
      localStorage.setItem("reqline-test-suites", JSON.stringify(suites));
    } catch (error) {
      console.error("Error saving test suites to storage:", error);
      setToast({ message: "Failed to save test suites", type: "error" });
    }
  };

  const loadCurrentSuiteFromStorage = (): TestSuite | null => {
    try {
      const stored = localStorage.getItem("reqline-test-current-suite");
      if (!stored) return null;
      
      const suite: TestSuite = JSON.parse(stored);
      
      // Check if suite has expired (4 hours)
      if (Date.now() > suite.expiresAt) {
        localStorage.removeItem("reqline-test-current-suite");
        return null;
      }
      
      return suite;
    } catch (error) {
      console.error("Error loading current test suite from storage:", error);
      return null;
    }
  };

  const saveCurrentSuiteToStorage = (suite: TestSuite | null): void => {
    try {
      if (suite) {
        localStorage.setItem("reqline-test-current-suite", JSON.stringify(suite));
      } else {
        localStorage.removeItem("reqline-test-current-suite");
      }
    } catch (error) {
      console.error("Error saving current test suite to storage:", error);
    }
  };

  const createNewSuite = (baseUrl?: string): TestSuite => {
    return {
      id: generateId(),
      title: "API Test Suite",
      description: "Test suite for multiple API endpoints",
      baseUrl: baseUrl || "",
      endpoints: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + 4 * 60 * 60 * 1000, // 4 hours
    };
  };

  const addEndpointToSuite = (
    endpoint: Omit<EndpointTest, "id" | "createdAt" | "result" | "error" | "isLoading" | "status">
  ): void => {
    // Validate endpoint for current suite
    const validation = validateEndpointForSuite(endpoint.reqline);
    if (!validation.valid) {
      setToast({ message: validation.message || "Invalid endpoint", type: "error" });
      return;
    }

    // If no current suite, create one with the base URL
    if (!currentSuite) {
      const baseUrl = extractBaseUrl(endpoint.reqline);
      if (!baseUrl) {
        setToast({ message: "Could not extract base URL from reqline", type: "error" });
        return;
      }

      const newSuite = createNewSuite(baseUrl);
      setCurrentSuite(newSuite);
      saveCurrentSuiteToStorage(newSuite);
      
      // Add to suites history
      const updatedSuites = [...testSuites, newSuite];
      setTestSuites(updatedSuites);
      saveSuitesToStorage(updatedSuites);
    }

    const newEndpointData: EndpointTest = {
      ...endpoint,
      id: generateId(),
      createdAt: Date.now(),
      result: null,
      error: null,
      isLoading: false,
      status: 'pending',
    };

    const updatedSuite = {
      ...currentSuite!,
      endpoints: [...currentSuite!.endpoints, newEndpointData],
      updatedAt: Date.now(),
    };

    setCurrentSuite(updatedSuite);
    saveCurrentSuiteToStorage(updatedSuite);
    
    // Update in suites history
    const updatedSuites = testSuites.map(suite => 
      suite.id === updatedSuite.id ? updatedSuite : suite
    );
    setTestSuites(updatedSuites);
    saveSuitesToStorage(updatedSuites);
    
    setToast({ message: "Endpoint added to test suite", type: "success" });
  };

  const updateEndpointInSuite = (endpointId: string, updates: Partial<EndpointTest>): void => {
    if (!currentSuite) return;

    const updatedSuite = {
      ...currentSuite,
      endpoints: currentSuite.endpoints.map((endpoint) =>
        endpoint.id === endpointId ? { ...endpoint, ...updates } : endpoint
      ),
      updatedAt: Date.now(),
    };

    setCurrentSuite(updatedSuite);
    saveCurrentSuiteToStorage(updatedSuite);
    
    // Update in suites history
    const updatedSuites = testSuites.map(suite => 
      suite.id === updatedSuite.id ? updatedSuite : suite
    );
    setTestSuites(updatedSuites);
    saveSuitesToStorage(updatedSuites);
  };

  const removeEndpointFromSuite = (endpointId: string): void => {
    if (!currentSuite) return;

    const updatedSuite = {
      ...currentSuite,
      endpoints: currentSuite.endpoints.filter(
        (endpoint) => endpoint.id !== endpointId
      ),
      updatedAt: Date.now(),
    };

    setCurrentSuite(updatedSuite);
    saveCurrentSuiteToStorage(updatedSuite);
    
    // Update in suites history
    const updatedSuites = testSuites.map(suite => 
      suite.id === updatedSuite.id ? updatedSuite : suite
    );
    setTestSuites(updatedSuites);
    saveSuitesToStorage(updatedSuites);
    
    setToast({
      message: "Endpoint removed from test suite",
      type: "success",
    });
  };

  const createNewTestSuite = (): void => {
    // Move current suite to history if it exists and has endpoints
    if (currentSuite && currentSuite.endpoints.length > 0) {
      const updatedSuites = testSuites.map(suite => 
        suite.id === currentSuite.id ? currentSuite : suite
      );
      setTestSuites(updatedSuites);
      saveSuitesToStorage(updatedSuites);
    }

    // Clear current suite
    setCurrentSuite(null);
    saveCurrentSuiteToStorage(null);
    setNewEndpointTestResult({ isLoading: false, result: null, error: null });
    
    setToast({ message: "New test suite created", type: "success" });
  };

  const cancelCurrentSuite = (): void => {
    if (!currentSuite) {
      setToast({ message: "No active test suite to cancel", type: "error" });
      return;
    }

    // Move to history if it has endpoints
    if (currentSuite.endpoints.length > 0) {
      const updatedSuites = testSuites.map(suite => 
        suite.id === currentSuite.id ? currentSuite : suite
      );
      setTestSuites(updatedSuites);
      saveSuitesToStorage(updatedSuites);
    }

    // Clear current suite
    setCurrentSuite(null);
    saveCurrentSuiteToStorage(null);
    setNewEndpointTestResult({ isLoading: false, result: null, error: null });
    
    setToast({ message: "Test suite cancelled", type: "success" });
  };

  const loadSuiteFromHistory = (suiteId: string): void => {
    const suite = testSuites.find(s => s.id === suiteId);
    if (!suite) {
      setToast({ message: "Test suite not found", type: "error" });
      return;
    }

    setCurrentSuite(suite);
    saveCurrentSuiteToStorage(suite);
    setShowSuiteHistory(false);
    setToast({ message: "Test suite loaded", type: "success" });
  };

  const deleteSuiteFromHistory = (suiteId: string): void => {
    const updatedSuites = testSuites.filter(s => s.id !== suiteId);
    setTestSuites(updatedSuites);
    saveSuitesToStorage(updatedSuites);
    
    // If we're deleting the current suite, clear it
    if (currentSuite?.id === suiteId) {
      setCurrentSuite(null);
      saveCurrentSuiteToStorage(null);
    }
    
    setToast({ message: "Test suite deleted", type: "success" });
  };

  const executeSingleEndpoint = async (endpointId: string): Promise<void> => {
    if (!currentSuite) return;

    const endpoint = currentSuite.endpoints.find(
      (ep) => ep.id === endpointId
    );
    if (!endpoint) return;

    // Update loading state
    updateEndpointInSuite(endpointId, { 
      isLoading: true, 
      error: null, 
      status: 'running' 
    });

    try {
      const response = await axios.post(
        config.apiUrl,
        { reqline: endpoint.reqline },
        { timeout: REQUEST_TIMEOUT }
      );

      const sanitizedData = sanitizeResponseData(response.data) as ApiResponse;
      updateEndpointInSuite(endpointId, {
        result: sanitizedData,
        isLoading: false,
        executedAt: Date.now(),
        status: 'completed',
      });

      setToast({ message: "Endpoint executed successfully", type: "success" });
    } catch (error: any) {
      const safeError = createSafeErrorMessage(error);
      updateEndpointInSuite(endpointId, {
        error: safeError,
        isLoading: false,
        executedAt: Date.now(),
        status: 'failed',
      });
      setToast({ message: "Endpoint execution failed", type: "error" });
    }
  };

  const executeAllEndpoints = async (): Promise<void> => {
    if (!currentSuite || currentSuite.endpoints.length === 0) {
      setToast({ message: "No endpoints to execute", type: "error" });
      return;
    }

    setIsRunningAll(true);
    
    // Reset all endpoints to pending
    const resetSuite = {
      ...currentSuite,
      endpoints: currentSuite.endpoints.map(endpoint => ({
        ...endpoint,
        result: null,
        error: null,
        isLoading: false,
        status: 'pending' as const,
      })),
      updatedAt: Date.now(),
    };
    setCurrentSuite(resetSuite);
    saveCurrentSuiteToStorage(resetSuite);
    
    // Update in suites history
    const updatedSuites = testSuites.map(suite => 
      suite.id === resetSuite.id ? resetSuite : suite
    );
    setTestSuites(updatedSuites);
    saveSuitesToStorage(updatedSuites);

    // Execute endpoints sequentially
    for (const endpoint of resetSuite.endpoints) {
      await executeSingleEndpoint(endpoint.id);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunningAll(false);
    setToast({ message: "All endpoints executed", type: "success" });
  };

  const stopAllExecution = (): void => {
    if (!currentSuite) return;

    const updatedSuite = {
      ...currentSuite,
      endpoints: currentSuite.endpoints.map(endpoint => ({
        ...endpoint,
        isLoading: false,
        status: endpoint.status === 'running' ? 'pending' : endpoint.status,
      })),
      updatedAt: Date.now(),
    };

    setCurrentSuite(updatedSuite);
    saveCurrentSuiteToStorage(updatedSuite);
    
    // Update in suites history
    const updatedSuites = testSuites.map(suite => 
      suite.id === updatedSuite.id ? updatedSuite : suite
    );
    setTestSuites(updatedSuites);
    saveSuitesToStorage(updatedSuites);
    
    setIsRunningAll(false);
    setToast({ message: "Execution stopped", type: "success" });
  };

  // Extract base URL from reqline syntax
  const extractBaseUrl = (reqline: string): string | null => {
    try {
      // Look for URL pattern in reqline
      const urlMatch = reqline.match(/URL\s+(https?:\/\/[^\s|]+)/i);
      if (urlMatch) {
        const fullUrl = urlMatch[1];
        const url = new URL(fullUrl);
        return `${url.protocol}//${url.host}`;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  // Validate if endpoint can be added to current suite
  const validateEndpointForSuite = (reqline: string): { valid: boolean; message?: string } => {
    if (!currentSuite) {
      return { valid: true }; // First endpoint, always valid
    }

    const newBaseUrl = extractBaseUrl(reqline);
    if (!newBaseUrl) {
      return { valid: false, message: "Could not extract base URL from reqline syntax" };
    }

    if (newBaseUrl !== currentSuite.baseUrl) {
      return { 
        valid: false, 
        message: `Different base URLs cannot be mixed in the same test suite. Current suite uses: ${currentSuite.baseUrl}, but this endpoint uses: ${newBaseUrl}` 
      };
    }

    return { valid: true };
  };

  const testNewEndpoint = async (): Promise<void> => {
    if (!newEndpoint.reqline.trim()) {
      setToast({ message: "Please enter reqline syntax to test", type: "error" });
      return;
    }

    setNewEndpointTestResult({
      isLoading: true,
      result: null,
      error: null,
    });

    try {
      const response = await axios.post(
        `${config.apiUrl}/`,
        {
          reqline: newEndpoint.reqline.trim(),
        },
        {
          timeout: 30000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setNewEndpointTestResult({
        isLoading: false,
        result: response.data,
        error: null,
        executedAt: Date.now(),
      });

      setToast({ message: "Test completed successfully!", type: "success" });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || "Unknown error occurred";
      setNewEndpointTestResult({
        isLoading: false,
        result: null,
        error: errorMessage,
        executedAt: Date.now(),
      });

      setToast({ message: "Test failed", type: "error" });
    }
  };

  // Check if a keyword is present in the current input
  const isKeywordPresent = (keyword: string): boolean => {
    return newEndpoint.reqline.toUpperCase().includes(keyword.toUpperCase());
  };

  // Handle keyword click to insert template with smart delimiter logic
  const handleKeywordClick = (template: string) => {
    const currentValue = newEndpoint.reqline;
    let insertText = template;

    // Smart delimiter logic
    if (currentValue.trim() !== "") {
      // If there's already content, add delimiter before the keyword
      insertText = " | " + template;
    }

    setNewEndpoint(prev => ({
      ...prev,
      reqline: currentValue + insertText,
    }));
  };

  // Documentation export functions
  const exportToMarkdown = (): string => {
    if (!currentSuite) return "";

    let markdown = `# ${currentSuite.title}\n\n`;
    markdown += `${currentSuite.description}\n\n`;
    markdown += `**Created:** ${new Date(
      currentSuite.createdAt
    ).toLocaleString()}\n`;
    markdown += `**Last Updated:** ${new Date(
      currentSuite.updatedAt
    ).toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    currentSuite.endpoints.forEach((endpoint, index) => {
      markdown += `## ${index + 1}. ${endpoint.title}\n\n`;
      markdown += `${endpoint.description}\n\n`;
      markdown += `**Status:** ${endpoint.status}\n`;
      markdown += `**Request:**\n\`\`\`\n${endpoint.reqline}\n\`\`\`\n\n`;

      if (endpoint.result) {
        markdown += `**Response:**\n\`\`\`json\n${JSON.stringify(
          endpoint.result,
          null,
          2
        )}\n\`\`\`\n\n`;
      } else if (endpoint.error) {
        markdown += `**Error:**\n\`\`\`\n${endpoint.error}\n\`\`\`\n\n`;
      }

      markdown += `---\n\n`;
    });

    return markdown;
  };

  const downloadMarkdown = (): void => {
    const markdown = exportToMarkdown();
    if (!markdown) {
      setToast({ message: "No test suite to export", type: "error" });
      return;
    }

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentSuite?.title || "api-test-suite"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setToast({ message: "Markdown exported successfully", type: "success" });
  };

  const downloadPDF = async (): Promise<void> => {
    try {
      const markdown = exportToMarkdown();
      if (!markdown) {
        setToast({ message: "No test suite to export", type: "error" });
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${currentSuite?.title || "API Test Suite"}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #333; border-bottom: 2px solid #333; }
            h2 { color: #555; margin-top: 30px; }
            pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
            code { font-family: 'Courier New', monospace; }
            .metadata { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          ${markdown
            .replace(/\n/g, "<br>")
            .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")}
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentSuite?.title || "api-test-suite"}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToast({
        message: "HTML version exported (print to PDF)",
        type: "success",
      });
    } catch (error) {
      setToast({ message: "Failed to export PDF", type: "error" });
    }
  };

  // Initialize test suites from localStorage
  useEffect(() => {
    const loadedSuites = loadSuitesFromStorage();
    setTestSuites(loadedSuites);
    
    const loadedCurrentSuite = loadCurrentSuiteFromStorage();
    if (loadedCurrentSuite) {
      setCurrentSuite(loadedCurrentSuite);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showDocumentation && !target.closest('.download-dropdown')) {
        setShowDocumentation(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDocumentation]);

  const getStatusColor = (status: EndpointTest['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-400';
      case 'running': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: EndpointTest['status']) => {
    switch (status) {
      case 'pending': return <Clock size={12} />;
      case 'running': return <LoadingSpinner size={12} />;
      case 'completed': return <CheckCircle size={12} />;
      case 'failed': return <AlertTriangle size={12} />;
      default: return <Clock size={12} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={3000}
        />
      )}

      {/* Header */}
      <div className="glass-dark rounded-xl sm:rounded-2xl p-3 sm:p-6 lg:p-8 animate-fade-in-up border border-white/10">
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          {/* Top row: Back button, icon, title */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105"
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
                Multiple Endpoints Testing
              </h2>
              <p className="text-blue-200 text-xs sm:text-sm lg:text-base">
                Test multiple API endpoints and create documentation
              </p>
            </div>
          </div>
          
          {/* Bottom row: Action buttons */}
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <button
              onClick={() => setShowSuiteHistory(!showSuiteHistory)}
              className="btn-secondary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2"
              title="View test suite history"
              aria-label="View test suite history"
            >
              <Package size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">History</span>
              <span className="sm:hidden">Hist</span>
            </button>
            <button
              onClick={createNewTestSuite}
              className="btn-secondary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2"
              title="Create new test suite"
              aria-label="Create new test suite"
            >
              <Plus size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">New Suite</span>
              <span className="sm:hidden">New</span>
            </button>
            {currentSuite && (
              <button
                onClick={cancelCurrentSuite}
                className="btn-secondary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2"
                title="Cancel current test suite"
                aria-label="Cancel current test suite"
              >
                <Square size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Cancel</span>
                <span className="sm:hidden">Cancel</span>
              </button>
            )}
            <div className="relative download-dropdown">
              <button
                onClick={() => setShowDocumentation(!showDocumentation)}
                className="btn-secondary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2"
                title="Download documentation"
                aria-label="Download documentation"
              >
                <Download size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Download</span>
                <span className="sm:hidden">Download</span>
                {showDocumentation ? <ChevronUp size={12} className="sm:w-3 sm:h-3" /> : <ChevronDown size={12} className="sm:w-3 sm:h-3" />}
              </button>
              {showDocumentation && (
                <div className="absolute right-0 top-full mt-2 bg-black/90 border border-white/20 rounded-lg shadow-lg z-50 min-w-48 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      downloadMarkdown();
                      setShowDocumentation(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-white/10 transition-colors duration-200 text-xs sm:text-sm"
                    title="Export as Markdown"
                    aria-label="Export as Markdown"
                  >
                    <FileDown size={16} />
                    <span>Export as Markdown</span>
                  </button>
                  <button
                    onClick={() => {
                      downloadPDF();
                      setShowDocumentation(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-white/10 transition-colors duration-200 text-xs sm:text-sm border-t border-white/10"
                    title="Export as PDF"
                    aria-label="Export as PDF"
                  >
                    <FileUp size={16} />
                    <span>Export as PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Suite History */}
        {showSuiteHistory && (
          <div className="bg-black/30 rounded-xl p-3 sm:p-6 border border-white/10 mb-4 sm:mb-6">
            <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Test Suite History
            </h4>
            {testSuites.length === 0 ? (
              <div className="text-center py-4 text-blue-200 text-sm">
                No test suites in history. Create your first test suite above.
              </div>
            ) : (
              <div className="space-y-3">
                {testSuites.map((suite) => (
                  <div
                    key={suite.id}
                    className="bg-black/40 rounded-lg p-3 border border-white/10 hover:bg-black/60 transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-white text-sm mb-1 truncate">
                          {suite.title}
                        </h5>
                        <p className="text-blue-200 text-xs mb-2 sm:mb-1 line-clamp-2">
                          {suite.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-green-300 bg-green-500/20 px-2 py-1 rounded truncate max-w-full">
                            {suite.baseUrl}
                          </span>
                          <span className="text-blue-300">
                            {suite.endpoints.length} endpoints
                          </span>
                          <span className="text-gray-400">
                            {new Date(suite.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 justify-center sm:justify-end">
                        <button
                          onClick={() => loadSuiteFromHistory(suite.id)}
                          className="p-2 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg transition-all duration-300"
                          title="Load this test suite"
                          aria-label={`Load ${suite.title}`}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => deleteSuiteFromHistory(suite.id)}
                          className="p-2 text-red-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-all duration-300"
                          title="Delete this test suite"
                          aria-label={`Delete ${suite.title}`}
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

        {/* Suite Info */}
        {currentSuite && (
          <div className="bg-black/30 rounded-xl p-3 sm:p-6 border border-white/10 mb-4 sm:mb-6">
            <div className="grid gap-3 sm:gap-4">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <input
                  type="text"
                  placeholder="Test Suite Title"
                  value={currentSuite.title}
                  onChange={(e) => {
                    const updatedSuite = {
                      ...currentSuite,
                      title: e.target.value,
                      updatedAt: Date.now(),
                    };
                    setCurrentSuite(updatedSuite);
                    saveCurrentSuiteToStorage(updatedSuite);
                    
                    // Update in suites history
                    const updatedSuites = testSuites.map(suite => 
                      suite.id === updatedSuite.id ? updatedSuite : suite
                    );
                    setTestSuites(updatedSuites);
                    saveSuitesToStorage(updatedSuites);
                  }}
                  className="bg-black/40 border border-white/20 rounded-lg text-white placeholder-blue-300 text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <textarea
                  placeholder="Test Suite Description"
                  value={currentSuite.description}
                  onChange={(e) => {
                    const updatedSuite = {
                      ...currentSuite,
                      description: e.target.value,
                      updatedAt: Date.now(),
                    };
                    setCurrentSuite(updatedSuite);
                    saveCurrentSuiteToStorage(updatedSuite);
                    
                    // Update in suites history
                    const updatedSuites = testSuites.map(suite => 
                      suite.id === updatedSuite.id ? updatedSuite : suite
                    );
                    setTestSuites(updatedSuites);
                    saveSuitesToStorage(updatedSuites);
                  }}
                  className="bg-black/40 border border-white/20 rounded-lg text-white placeholder-blue-300 text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-20"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="text-xs text-blue-300 bg-blue-500/20 px-3 py-2 rounded-lg flex items-center justify-center">
                    Expires: {new Date(currentSuite.expiresAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-green-300 bg-green-500/20 px-3 py-2 rounded-lg flex items-center justify-center truncate">
                    Base URL: {currentSuite.baseUrl || "Not set"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Execution Controls */}
        {currentSuite && currentSuite.endpoints.length > 0 && (
          <div className="bg-black/30 rounded-xl p-3 sm:p-6 border border-white/10 mb-4 sm:mb-6">
            <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Play className="w-4 h-4" />
              Execution Controls
            </h4>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={executeAllEndpoints}
                disabled={isRunningAll}
                className="btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
                title="Run all endpoints"
                aria-label="Run all endpoints"
              >
                {isRunningAll ? <LoadingSpinner size={16} /> : <Play size={16} />}
                {isRunningAll ? "Running..." : "Run All"}
              </button>
              <button
                onClick={stopAllExecution}
                disabled={!isRunningAll}
                className="btn-secondary flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
                title="Stop execution"
                aria-label="Stop execution"
              >
                <Square size={16} />
                Stop
              </button>
            </div>
          </div>
        )}

        {/* Add New Endpoint */}
        <div className="bg-black/30 rounded-xl p-3 sm:p-6 border border-white/10 mb-4 sm:mb-6">
          <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Add New Endpoint Test</span>
            </div>
            {currentSuite && (
              <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded truncate">
                Base URL: {currentSuite.baseUrl}
              </span>
            )}
          </h4>
          {!currentSuite && (
            <div className="text-center py-4 text-blue-200 text-sm mb-4">
              No active test suite. Add your first endpoint to create a new test suite, or load one from history.
            </div>
          )}
          <div className="grid gap-3 sm:gap-4">
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

            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <input
                type="text"
                placeholder="Endpoint Title (e.g., Get User Profile)"
                value={newEndpoint.title}
                onChange={(e) =>
                  setNewEndpoint((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="bg-black/40 border border-white/20 rounded-lg text-white placeholder-blue-300 text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Description (e.g., Fetch user profile data)"
                value={newEndpoint.description}
                onChange={(e) =>
                  setNewEndpoint((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="bg-black/40 border border-white/20 rounded-lg text-white placeholder-blue-300 text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <textarea
              placeholder="Reqline Syntax (e.g., HTTP GET | URL https://api.example.com/users/1)"
              value={newEndpoint.reqline}
              onChange={(e) =>
                setNewEndpoint((prev) => ({
                  ...prev,
                  reqline: e.target.value,
                }))
              }
              className="bg-black/40 border border-white/20 rounded-lg text-white placeholder-blue-300 text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-20 font-mono"
            />
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={testNewEndpoint}
                disabled={newEndpointTestResult.isLoading || !newEndpoint.reqline.trim()}
                className="btn-secondary flex items-center justify-center gap-2 text-xs sm:text-sm flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Test endpoint before adding"
                aria-label="Test endpoint"
              >
                {newEndpointTestResult.isLoading ? (
                  <LoadingSpinner size={16} />
                ) : (
                  <Zap size={16} />
                )}
                {newEndpointTestResult.isLoading ? "Testing..." : "Test Endpoint"}
              </button>
              <button
                onClick={() => {
                  if (newEndpoint.title && newEndpoint.reqline) {
                    addEndpointToSuite(newEndpoint);
                    setNewEndpoint({ title: "", description: "", reqline: "" });
                    setNewEndpointTestResult({ isLoading: false, result: null, error: null });
                  } else {
                    setToast({
                      message: "Title and reqline are required",
                      type: "error",
                    });
                  }
                }}
                className="btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm flex-1"
              >
                <Save size={16} />
                Add to Test Suite
              </button>
            </div>
          </div>

          {/* Test Results for New Endpoint */}
          {(newEndpointTestResult.result || newEndpointTestResult.error) && (
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-black/20 rounded-lg border border-white/10">
              <h5 className="text-sm font-semibold text-white mb-2 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <Zap size={14} />
                  <span>Test Result</span>
                </div>
                {newEndpointTestResult.executedAt && (
                  <span className="text-xs text-gray-400 font-normal">
                    ({new Date(newEndpointTestResult.executedAt).toLocaleTimeString()})
                  </span>
                )}
              </h5>
              
              {newEndpointTestResult.result && (
                <div className="bg-green-500/10 rounded-lg p-2 sm:p-3 border border-green-500/30 mb-2">
                  <div className="text-xs text-green-300 mb-1 flex items-center gap-2">
                    <CheckCircle size={12} />
                    Success - {newEndpointTestResult.result.response?.http_status || 'N/A'}
                  </div>
                  <div className="code-block text-xs max-h-32 overflow-y-auto break-words">
                    {JSON.stringify(newEndpointTestResult.result, null, 2)}
                  </div>
                </div>
              )}

              {newEndpointTestResult.error && (
                <div className="bg-red-500/10 rounded-lg p-2 sm:p-3 border border-red-500/30">
                  <div className="text-xs text-red-300 mb-1 flex items-center gap-2">
                    <AlertTriangle size={12} />
                    Error
                  </div>
                  <div className="code-block text-xs text-red-200 break-words">
                    {newEndpointTestResult.error}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Endpoints List */}
      <div className="space-y-3 sm:space-y-4">
        {currentSuite?.endpoints.length === 0 ? (
          <div className="text-center py-8 text-blue-200 text-sm">
            No endpoints in test suite. Add your first endpoint test above.
          </div>
        ) : (
          currentSuite?.endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              className="glass-dark rounded-xl p-3 sm:p-4 border border-white/10 hover:bg-black/40 transition-all duration-300"
            >
              <div className="space-y-3 sm:space-y-4">
                {/* Endpoint Header */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h5 className="font-semibold text-white text-sm sm:text-base truncate">
                        {editingEndpoint === endpoint.id ? (
                          <input
                            type="text"
                            value={endpoint.title}
                            onChange={(e) =>
                              updateEndpointInSuite(endpoint.id, {
                                title: e.target.value,
                              })
                            }
                            className="bg-black/40 border border-white/20 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                            onBlur={() => setEditingEndpoint(null)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && setEditingEndpoint(null)
                            }
                            autoFocus
                          />
                        ) : (
                          <span
                            onClick={() => setEditingEndpoint(endpoint.id)}
                            className="cursor-pointer hover:text-blue-300"
                          >
                            {endpoint.title}
                          </span>
                        )}
                      </h5>
                      <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded-full">
                        {new Date(endpoint.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getStatusColor(endpoint.status)}`}>
                        {getStatusIcon(endpoint.status)}
                        {endpoint.status}
                      </span>
                    </div>
                    {editingEndpoint === endpoint.id ? (
                      <textarea
                        value={endpoint.description}
                        onChange={(e) =>
                          updateEndpointInSuite(endpoint.id, {
                            description: e.target.value,
                          })
                        }
                        className="bg-black/40 border border-white/20 rounded px-2 py-1 text-white text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-16"
                        onBlur={() => setEditingEndpoint(null)}
                        placeholder="Description"
                      />
                    ) : (
                      <p
                        className="text-blue-200 text-xs sm:text-sm mb-2 cursor-pointer hover:text-blue-300"
                        onClick={() => setEditingEndpoint(endpoint.id)}
                      >
                        {endpoint.description || "Click to add description"}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 justify-center sm:justify-end">
                    <button
                      onClick={() => executeSingleEndpoint(endpoint.id)}
                      disabled={endpoint.isLoading || isRunningAll}
                      className="p-2 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg transition-all duration-300 disabled:opacity-50"
                      title="Execute endpoint"
                      aria-label={`Execute ${endpoint.title}`}
                    >
                      {endpoint.isLoading ? (
                        <LoadingSpinner size={16} />
                      ) : (
                        <Zap size={16} />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setEditingEndpoint(
                          editingEndpoint === endpoint.id ? null : endpoint.id
                        )
                      }
                      className="p-2 text-blue-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                      title="Edit endpoint"
                      aria-label={`Edit ${endpoint.title}`}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => removeEndpointFromSuite(endpoint.id)}
                      className="p-2 text-red-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-all duration-300"
                      title="Remove endpoint"
                      aria-label={`Remove ${endpoint.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Reqline Syntax */}
                <div className="bg-black/40 rounded-lg p-2 sm:p-3 border border-white/10">
                  <div className="text-xs text-blue-300 mb-1">
                    Reqline Syntax:
                  </div>
                  <div className="code-block text-xs break-words font-mono">
                    {endpoint.reqline}
                  </div>
                </div>

                {/* Results */}
                {endpoint.result && (
                  <div className="bg-green-500/10 rounded-lg p-2 sm:p-3 border border-green-500/30">
                    <div className="text-xs text-green-300 mb-1 flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={12} />
                        <span>Success - {endpoint.result.response.http_status}</span>
                      </div>
                      {endpoint.executedAt && (
                        <span className="text-gray-400">
                          ({new Date(endpoint.executedAt).toLocaleTimeString()})
                        </span>
                      )}
                    </div>
                    <div className="code-block text-xs max-h-32 overflow-y-auto break-words">
                      {JSON.stringify(endpoint.result, null, 2)}
                    </div>
                  </div>
                )}

                {endpoint.error && (
                  <div className="bg-red-500/10 rounded-lg p-2 sm:p-3 border border-red-500/30">
                    <div className="text-xs text-red-300 mb-1 flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={12} />
                        <span>Error</span>
                      </div>
                      {endpoint.executedAt && (
                        <span className="text-gray-400">
                          ({new Date(endpoint.executedAt).toLocaleTimeString()})
                        </span>
                      )}
                    </div>
                    <div className="code-block text-xs text-red-200 break-words">
                      {endpoint.error}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MultipleEndpoints;
