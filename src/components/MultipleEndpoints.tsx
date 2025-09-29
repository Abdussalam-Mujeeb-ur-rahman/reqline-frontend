import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Copy,
  CheckCircle,
  Clock,
  Globe,
  Zap,
  AlertTriangle,
  Package,
  Plus,
  Trash2,
  Save,
  Key,
  BookOpen,
  Edit3,
  Eye,
  ArrowLeft,
  Play,
  Square,
  Upload,
} from "lucide-react";
import axios from "axios";
import LoadingSpinner from "./LoadingSpinner";
import Toast from "./Toast";
import ProxyCard from "./ProxyCard";
import { useTheme } from "../contexts/ThemeContext";
import { useThemeClasses } from "../hooks/useThemeClasses";
import config from "../../config";
import {
  sanitizeResponseData,
  createSafeErrorMessage,
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
  status: "pending" | "running" | "completed" | "failed";
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

interface VaultItem {
  id: string;
  name: string;
  value: string;
  createdAt: number;
  updatedAt: number;
}

const MultipleEndpoints = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const theme = useThemeClasses();
  const [currentSuite, setCurrentSuite] = useState<TestSuite | null>(null);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [activeTab, setActiveTab] = useState<"current" | "history" | "vault">(
    "current"
  );
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
  const [useProxy, setUseProxy] = useState(false);
  const [proxyTarget, setProxyTarget] = useState("http://localhost:8080");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formDataFields, setFormDataFields] = useState<Record<string, string>>(
    {}
  );
  const [editingEndpoint, setEditingEndpoint] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [newVaultItem, setNewVaultItem] = useState({
    name: "",
    value: "",
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Actively watch for URL changes in real-time
  useEffect(() => {
    checkAndEnableProxy(newEndpoint.reqline);
  }, [newEndpoint.reqline]);

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

      // Filter out expired suites (48 hours)
      const validSuites = suites.filter((suite) => now <= suite.expiresAt);

      // Update storage with only valid suites
      if (validSuites.length !== suites.length) {
        localStorage.setItem(
          "reqline-test-suites",
          JSON.stringify(validSuites)
        );
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
        localStorage.setItem(
          "reqline-test-current-suite",
          JSON.stringify(suite)
        );
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
      expiresAt: Date.now() + 48 * 60 * 60 * 1000, // 48 hours
    };
  };

  const addEndpointToSuite = (
    endpoint: Omit<
      EndpointTest,
      "id" | "createdAt" | "result" | "error" | "isLoading" | "status"
    >
  ): void => {
    // Validate endpoint for current suite
    const validation = validateEndpointForSuite(endpoint.reqline);
    if (!validation.valid) {
      setToast({
        message: validation.message || "Invalid endpoint",
        type: "error",
      });
      return;
    }

    let workingSuite: TestSuite | null = currentSuite;

    // If no current suite, create one with the base URL
    if (!workingSuite) {
      const baseUrl = extractBaseUrl(endpoint.reqline);
      if (!baseUrl) {
        setToast({
          message: "Could not extract base URL from reqline",
          type: "error",
        });
        return;
      }

      workingSuite = createNewSuite(baseUrl);
      setCurrentSuite(workingSuite);
      saveCurrentSuiteToStorage(workingSuite);

      // Add to suites history
      const updatedSuites = [...testSuites, workingSuite];
      setTestSuites(updatedSuites);
      saveSuitesToStorage(updatedSuites);
    } else {
      // If suite exists but has no base URL, set it from the first endpoint
      if (!workingSuite.baseUrl || workingSuite.baseUrl === "") {
        const baseUrl = extractBaseUrl(endpoint.reqline);
        if (baseUrl) {
          workingSuite = {
            ...workingSuite,
            baseUrl: baseUrl,
            updatedAt: Date.now(),
          };
          setCurrentSuite(workingSuite);
          saveCurrentSuiteToStorage(workingSuite);

          // Update in suites history
          if (workingSuite) {
            const updatedSuites = testSuites.map((suite) =>
              suite.id === workingSuite!.id ? workingSuite! : suite
            );
            setTestSuites(updatedSuites);
            saveSuitesToStorage(updatedSuites);
          }
        }
      }
    }

    const newEndpointData: EndpointTest = {
      ...endpoint,
      id: generateId(),
      createdAt: Date.now(),
      result: null,
      error: null,
      isLoading: false,
      status: "pending",
    };

    if (workingSuite) {
      const updatedSuite = {
        ...workingSuite,
        endpoints: [...workingSuite.endpoints, newEndpointData],
        updatedAt: Date.now(),
      };

      setCurrentSuite(updatedSuite);
      saveCurrentSuiteToStorage(updatedSuite);

      // Update in suites history
      const updatedSuites = testSuites.map((suite) =>
        suite.id === updatedSuite.id ? updatedSuite : suite
      );
      setTestSuites(updatedSuites);
      saveSuitesToStorage(updatedSuites);

      setToast({ message: "Endpoint added to test suite", type: "success" });
    }
  };

  const updateEndpointInSuite = (
    endpointId: string,
    updates: Partial<EndpointTest>
  ): void => {
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
    const updatedSuites = testSuites.map((suite) =>
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
    const updatedSuites = testSuites.map((suite) =>
      suite.id === updatedSuite.id ? updatedSuite : suite
    );
    setTestSuites(updatedSuites);
    saveSuitesToStorage(updatedSuites);

    setToast({
      message: "Endpoint removed from test suite",
      type: "success",
    });
  };

  const loadSuiteFromHistory = (suiteId: string): void => {
    const suite = testSuites.find((s) => s.id === suiteId);
    if (!suite) {
      setToast({ message: "Test suite not found", type: "error" });
      return;
    }

    setCurrentSuite(suite);
    saveCurrentSuiteToStorage(suite);
    setToast({ message: "Test suite loaded", type: "success" });
  };

  const deleteSuiteFromHistory = (suiteId: string): void => {
    const updatedSuites = testSuites.filter((s) => s.id !== suiteId);
    setTestSuites(updatedSuites);
    saveSuitesToStorage(updatedSuites);

    // If we're deleting the current suite, clear it
    if (currentSuite?.id === suiteId) {
      setCurrentSuite(null);
      saveCurrentSuiteToStorage(null);
    }

    setToast({ message: "Test suite deleted", type: "success" });
  };

  const saveCurrentSuiteToHistory = (): void => {
    if (!currentSuite || currentSuite.endpoints.length === 0) {
      setToast({
        message: "No test suite or endpoints to save",
        type: "error",
      });
      return;
    }

    // Check if suite already exists in history
    const existingSuiteIndex = testSuites.findIndex(
      (suite) => suite.id === currentSuite.id
    );

    if (existingSuiteIndex >= 0) {
      // Update existing suite
      const updatedSuites = testSuites.map((suite, index) =>
        index === existingSuiteIndex
          ? { ...currentSuite, updatedAt: Date.now() }
          : suite
      );
      setTestSuites(updatedSuites);
      saveSuitesToStorage(updatedSuites);
      setToast({ message: "Test suite updated in history", type: "success" });
    } else {
      // Add new suite to history
      const updatedSuites = [
        ...testSuites,
        { ...currentSuite, updatedAt: Date.now() },
      ];
      setTestSuites(updatedSuites);
      saveSuitesToStorage(updatedSuites);
      setToast({ message: "Test suite saved to history", type: "success" });
    }
  };

  // Direct localhost request function for client-side proxy
  const makeDirectLocalhostRequest = async (
    reqline: string,
    proxyTarget: string
  ) => {
    try {
      // Parse the reqline to extract request details (same logic as ReqlineParser)
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

      if (!url) {
        throw new Error("No URL found in reqline");
      }

      // Transform URL to use proxy target
      const originalUrl = url;
      const urlPath =
        new URL(originalUrl).pathname + new URL(originalUrl).search;
      const targetUrl = proxyTarget + urlPath;
      const queryString = new URLSearchParams(query).toString();
      const finalUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

      console.log("🌐 Direct request details:");
      console.log("  - method:", method);
      console.log("  - finalUrl:", finalUrl);
      console.log("  - headers:", headers);
      console.log("  - body:", body);

      const response = await fetch(finalUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseData = await response.json();

      // Format response to match ApiResponse structure
      const formattedResponse: ApiResponse = {
        request: {
          query,
          body: body || {},
          headers,
          full_url: finalUrl,
        },
        response: {
          http_status: response.status,
          duration: 0, // We can't measure this easily in client-side
          request_start_timestamp: Date.now(),
          request_stop_timestamp: Date.now(),
          response_data: responseData,
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

  const executeSingleEndpoint = async (endpointId: string): Promise<void> => {
    if (!currentSuite) return;

    const endpoint = currentSuite.endpoints.find((ep) => ep.id === endpointId);
    if (!endpoint) return;

    // Update loading state
    updateEndpointInSuite(endpointId, {
      isLoading: true,
      error: null,
      status: "running",
    });

    try {
      let response;

      if (useProxy) {
        // For localhost requests, make direct client-side requests
        response = await makeDirectLocalhostRequest(
          endpoint.reqline,
          proxyTarget
        );
      } else {
        // For regular requests, use the backend
        response = await axios.post(
          config.apiUrl,
          { reqline: endpoint.reqline },
          { timeout: REQUEST_TIMEOUT }
        );
      }

      const sanitizedData = sanitizeResponseData(response.data) as ApiResponse;
      updateEndpointInSuite(endpointId, {
        result: sanitizedData,
        isLoading: false,
        executedAt: Date.now(),
        status: "completed",
      });

      setToast({ message: "Endpoint executed successfully", type: "success" });
    } catch (error: any) {
      const safeError = createSafeErrorMessage(error);
      updateEndpointInSuite(endpointId, {
        error: safeError,
        isLoading: false,
        executedAt: Date.now(),
        status: "failed",
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
      endpoints: currentSuite.endpoints.map((endpoint) => ({
        ...endpoint,
        result: null,
        error: null,
        isLoading: false,
        status: "pending" as const,
      })),
      updatedAt: Date.now(),
    };
    setCurrentSuite(resetSuite);
    saveCurrentSuiteToStorage(resetSuite);

    // Update in suites history
    const updatedSuites = testSuites.map((suite) =>
      suite.id === resetSuite.id ? resetSuite : suite
    );
    setTestSuites(updatedSuites);
    saveSuitesToStorage(updatedSuites);

    // Execute endpoints sequentially
    for (const endpoint of resetSuite.endpoints) {
      await executeSingleEndpoint(endpoint.id);
      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsRunningAll(false);
    setToast({ message: "All endpoints executed", type: "success" });
  };

  const stopAllExecution = (): void => {
    if (!currentSuite) return;

    const updatedSuite = {
      ...currentSuite,
      endpoints: currentSuite.endpoints.map((endpoint) => ({
        ...endpoint,
        isLoading: false,
        status: endpoint.status === "running" ? "pending" : endpoint.status,
      })),
      updatedAt: Date.now(),
    };

    setCurrentSuite(updatedSuite);
    saveCurrentSuiteToStorage(updatedSuite);

    // Update in suites history
    const updatedSuites = testSuites.map((suite) =>
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
  const validateEndpointForSuite = (
    reqline: string
  ): { valid: boolean; message?: string } => {
    if (!currentSuite) {
      return { valid: true }; // First endpoint, always valid
    }

    const newBaseUrl = extractBaseUrl(reqline);
    if (!newBaseUrl) {
      return {
        valid: false,
        message: "Could not extract base URL from reqline syntax",
      };
    }

    // If suite has no base URL yet (first endpoint), allow it
    if (!currentSuite.baseUrl || currentSuite.baseUrl === "") {
      return { valid: true };
    }

    if (newBaseUrl !== currentSuite.baseUrl) {
      return {
        valid: false,
        message: `Different base URLs cannot be mixed in the same test suite. Current suite uses: ${currentSuite.baseUrl}, but this endpoint uses: ${newBaseUrl}`,
      };
    }

    return { valid: true };
  };

  const testNewEndpoint = async (): Promise<void> => {
    if (!newEndpoint.reqline.trim()) {
      setToast({
        message: "Please enter reqline syntax to test",
        type: "error",
      });
      return;
    }

    // Normalize before testing
    const preparedReqline = normalizeDelimiters(newEndpoint.reqline).trim();
    setNewEndpoint((prev) => ({ ...prev, reqline: preparedReqline }));

    setNewEndpointTestResult({
      isLoading: true,
      result: null,
      error: null,
    });

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
            timeout: 30000,
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
        } else {
          // Regular JSON request
          const payload = { reqline: preparedReqline };

          response = await axios.post(endpoint, payload, {
            timeout: 30000,
            headers: {
              "Content-Type": "application/json",
            },
          });
        }
      }

      setNewEndpointTestResult({
        isLoading: false,
        result: response.data,
        error: null,
        executedAt: Date.now(),
      });

      setToast({ message: "Test completed successfully!", type: "success" });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Unknown error occurred";
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

    const currentValue = newEndpoint.reqline;
    let insertText = template;

    // Smart URL logic: if URL keyword and base URL is set, use it
    if (template.startsWith("URL ") && currentSuite?.baseUrl) {
      insertText = `URL ${currentSuite.baseUrl}`;
    }

    // Smart delimiter logic: add delimiter only if needed
    if (currentValue.trim() !== "") {
      const endsWithDelimiter = /\|\s*$/.test(currentValue);
      insertText = (endsWithDelimiter ? "" : " | ") + insertText;
    }

    const newValue = normalizeDelimiters(currentValue + insertText);
    setNewEndpoint((prev) => ({
      ...prev,
      reqline: newValue,
    }));
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
          setProxyTarget(`http://localhost:${portMatch[1]}`);
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

  const generateFormDataReqline = () => {
    const formDataObj: Record<string, any> = { ...formDataFields };

    // Add files to form data
    selectedFiles.forEach((file, index) => {
      const fieldName = `file_${index + 1}`;
      formDataObj[fieldName] = {
        type: "file",
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      };
    });

    return `FORMDATA ${JSON.stringify(formDataObj, null, 2)}`;
  };

  // Initialize test suites and vault from localStorage
  useEffect(() => {
    const loadedSuites = loadSuitesFromStorage();
    setTestSuites(loadedSuites);

    const loadedCurrentSuite = loadCurrentSuiteFromStorage();
    if (loadedCurrentSuite) {
      setCurrentSuite(loadedCurrentSuite);
    }

    const loadedVaultItems = loadVaultFromStorage();
    setVaultItems(loadedVaultItems);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showDocumentation && !target.closest(".download-dropdown")) {
        setShowDocumentation(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDocumentation]);

  const getStatusColor = (status: EndpointTest["status"]) => {
    switch (status) {
      case "pending":
        return `${theme.text.muted} ${theme.bg.secondary}`;
      case "running":
        return `${theme.status.info}`;
      case "completed":
        return `${theme.status.success}`;
      case "failed":
        return `${theme.status.error}`;
      default:
        return `${theme.text.muted} ${theme.bg.secondary}`;
    }
  };

  const getStatusIcon = (status: EndpointTest["status"]) => {
    switch (status) {
      case "pending":
        return <Clock size={12} />;
      case "running":
        return <LoadingSpinner size={12} />;
      case "completed":
        return <CheckCircle size={12} />;
      case "failed":
        return <AlertTriangle size={12} />;
      default:
        return <Clock size={12} />;
    }
  };

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

  const useVaultItem = (item: VaultItem) => {
    // Check if it's a proxy target
    if (item.name.startsWith("Proxy:")) {
      setProxyTarget(item.value);
      setUseProxy(true);
      setToast({
        message: `Proxy target set to ${item.value}`,
        type: "success",
      });
    } else {
      // Copy to clipboard for easy use
      navigator.clipboard.writeText(item.value);
      setToast({
        message: `${item.name} copied to clipboard`,
        type: "success",
      });
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

  return (
    <div className="min-h-screen transition-colors duration-300 bg-transparent">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={3000}
        />
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate("/")}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-105 ${
                isDark
                  ? "bg-slate-700 hover:bg-slate-600"
                  : "bg-slate-800 hover:bg-slate-900"
              }`}
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1
                className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${theme.text.primary}`}
              >
                Multiple Endpoints Testing
              </h1>
              <p className={`text-sm sm:text-base ${theme.text.secondary}`}>
                Test multiple API endpoints and create documentation
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            className={`flex rounded-2xl p-1 border transition-colors duration-300 ${
              isDark
                ? "bg-slate-800 border-slate-700"
                : `${theme.bg.secondary} ${theme.border.primary}`
            }`}
          >
            <button
              onClick={() => setActiveTab("current")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300 rounded-xl flex-1 sm:flex-none sm:px-6 ${
                activeTab === "current"
                  ? isDark
                    ? "text-slate-100 bg-slate-700 border border-slate-600 shadow-lg"
                    : "text-slate-100 bg-slate-800 border border-slate-700 shadow-lg"
                  : isDark
                  ? "text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"
              }`}
            >
              <Package size={16} />
              <span>Test Suite</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300 rounded-xl flex-1 sm:flex-none sm:px-6 ${
                activeTab === "history"
                  ? isDark
                    ? "text-slate-100 bg-slate-700 border border-slate-600 shadow-lg"
                    : "text-slate-100 bg-slate-800 border border-slate-700 shadow-lg"
                  : isDark
                  ? "text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"
              }`}
            >
              <Clock size={16} />
              <span>History</span>
            </button>
            <button
              onClick={() => setActiveTab("vault")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300 rounded-xl flex-1 sm:flex-none sm:px-6 ${
                activeTab === "vault"
                  ? isDark
                    ? "text-slate-100 bg-slate-700 border border-slate-600 shadow-lg"
                    : "text-slate-100 bg-slate-800 border border-slate-700 shadow-lg"
                  : isDark
                  ? "text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"
              }`}
            >
              <BookOpen size={16} />
              <span>Vault</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6 sm:space-y-8">
          {/* Test Suite Tab */}
          {activeTab === "current" && (
            <div className="space-y-6 sm:space-y-8">
              {/* Test Suite Creation/Details */}
              <div
                className={`bg-transparent rounded-3xl p-6 sm:p-8 ${theme.border.primary} shadow-lg`}
              >
                <h4
                  className={`text-sm sm:text-base font-semibold ${theme.text.primary} mb-3 sm:mb-4 flex items-center gap-2`}
                >
                  <Package className="w-4 h-4" />
                  {currentSuite
                    ? "Test Suite Details"
                    : "Create New Test Suite"}
                </h4>

                {currentSuite ? (
                  // Existing suite - show editable details
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
                          const updatedSuites = testSuites.map((suite) =>
                            suite.id === updatedSuite.id ? updatedSuite : suite
                          );
                          setTestSuites(updatedSuites);
                          saveSuitesToStorage(updatedSuites);
                        }}
                        className={`${theme.bg.input} ${theme.border.primary} rounded-lg ${theme.text.primary} ${theme.text.placeholder} text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
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
                          const updatedSuites = testSuites.map((suite) =>
                            suite.id === updatedSuite.id ? updatedSuite : suite
                          );
                          setTestSuites(updatedSuites);
                          saveSuitesToStorage(updatedSuites);
                        }}
                        className={`${theme.bg.input} ${theme.border.primary} rounded-lg ${theme.text.primary} ${theme.text.placeholder} text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none h-20`}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg flex items-center justify-center border border-blue-200">
                          Expires:{" "}
                          {new Date(currentSuite.expiresAt).toLocaleString()}
                        </div>
                        <div className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg flex items-center justify-center truncate border border-green-200">
                          Base URL: {currentSuite.baseUrl || "Not set"}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // No suite - show creation form
                  <div className="space-y-4">
                    <div
                      className={`text-center py-4 ${theme.text.secondary} text-sm`}
                    >
                      Create a new test suite to start testing multiple
                      endpoints
                    </div>
                    <div className="grid gap-3 sm:gap-4">
                      <input
                        type="text"
                        placeholder="Test Suite Title (e.g., User API Tests)"
                        value={newEndpoint.title}
                        onChange={(e) =>
                          setNewEndpoint((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className={`${theme.bg.input} ${theme.border.primary} rounded-lg ${theme.text.primary} ${theme.text.placeholder} text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                      />
                      <textarea
                        placeholder="Test Suite Description (e.g., Comprehensive tests for user management endpoints)"
                        value={newEndpoint.description}
                        onChange={(e) =>
                          setNewEndpoint((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className={`${theme.bg.input} ${theme.border.primary} rounded-lg ${theme.text.primary} ${theme.text.placeholder} text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none h-20`}
                      />
                      <button
                        onClick={() => {
                          if (newEndpoint.title && newEndpoint.description) {
                            const newSuite = createNewSuite();
                            newSuite.title = newEndpoint.title;
                            newSuite.description = newEndpoint.description;
                            setCurrentSuite(newSuite);
                            saveCurrentSuiteToStorage(newSuite);
                            setNewEndpoint({
                              title: "",
                              description: "",
                              reqline: "",
                            });
                            setToast({
                              message:
                                "Test suite created! Now add your first endpoint.",
                              type: "success",
                            });
                          } else {
                            setToast({
                              message: "Title and description are required",
                              type: "error",
                            });
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 text-xs sm:text-sm px-4 py-2 rounded-lg transition-colors"
                      >
                        <Save size={16} />
                        Create Test Suite
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add New Endpoint - Only show if suite exists */}
              {currentSuite && (
                <div
                  className={`bg-transparent rounded-3xl p-6 sm:p-8 ${theme.border.primary} shadow-lg`}
                >
                  <h4
                    className={`text-sm sm:text-base font-semibold ${theme.text.primary} mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center gap-2`}
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span>Add New Endpoint</span>
                    </div>
                    <span
                      className={`text-xs ${theme.text.accent} ${theme.status.success} px-2 py-1 rounded truncate`}
                    >
                      Base URL:{" "}
                      {currentSuite.baseUrl ||
                        "Will be set from first endpoint"}
                    </span>
                  </h4>
                  <div className="grid gap-3 sm:gap-4">
                    {/* Keyword Suggestions */}
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
                            keyword.text === "URL" && currentSuite?.baseUrl
                              ? theme.button.keywordActive
                              : isKeywordPresent(keyword.text)
                              ? theme.button.keywordActive
                              : theme.button.keywordInactive
                          }`}
                          title={
                            keyword.text === "URL" && currentSuite?.baseUrl
                              ? `Insert URL ${currentSuite.baseUrl}`
                              : `Insert ${keyword.template}`
                          }
                          aria-label={
                            keyword.text === "URL" && currentSuite?.baseUrl
                              ? `Insert URL ${currentSuite.baseUrl}`
                              : `Insert ${keyword.template}`
                          }
                        >
                          {keyword.text}
                        </button>
                      ))}
                    </div>

                    {/* File Upload Section */}
                    {(selectedFiles.length > 0 ||
                      Object.keys(formDataFields).length > 0) && (
                      <div
                        className={`${theme.bg.card} rounded-2xl p-4 sm:p-6 ${theme.border.primary} shadow-lg`}
                      >
                        <h5
                          className={`${theme.text.primary} font-semibold mb-3 sm:mb-4 flex items-center gap-1 sm:gap-2 text-sm sm:text-base`}
                        >
                          <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                          FormData Configuration
                        </h5>

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
                          {Object.entries(formDataFields).map(
                            ([key, value]) => (
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
                            )
                          )}
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
                          onClick={() => {
                            const formDataReqline = generateFormDataReqline();
                            const currentValue = newEndpoint.reqline;
                            const insertText =
                              currentValue.trim() !== ""
                                ? " | " + formDataReqline
                                : formDataReqline;
                            setNewEndpoint((prev) => ({
                              ...prev,
                              reqline: currentValue + insertText,
                            }));
                            setToast({
                              message: "FormData generated successfully!",
                              type: "success",
                            });
                          }}
                          className={`${theme.button.primary} flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl w-full sm:w-auto`}
                        >
                          <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                          Generate FormData
                        </button>
                      </div>
                    )}

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
                        className={`${theme.bg.input} ${theme.border.primary} rounded-lg ${theme.text.primary} ${theme.text.placeholder} text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
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
                        className={`${theme.bg.input} ${theme.border.primary} rounded-lg ${theme.text.primary} ${theme.text.placeholder} text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                      />
                    </div>
                    <textarea
                      placeholder="Reqline Syntax (e.g., HTTP GET | URL https://api.example.com/users/1)"
                      value={newEndpoint.reqline}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewEndpoint((prev) => ({
                          ...prev,
                          reqline: value,
                        }));
                      }}
                      className={`${theme.bg.input} ${theme.border.primary} rounded-lg ${theme.text.primary} ${theme.text.placeholder} text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none h-20 font-mono`}
                    />

                    {/* Proxy Configuration */}
                    {useProxy && (
                      <ProxyCard
                        proxyTarget={proxyTarget}
                        onDisable={() => setUseProxy(false)}
                        onTargetChange={setProxyTarget}
                        className="bg-blue-50 border-blue-200"
                      />
                    )}

                    <div className="flex gap-2 sm:gap-3">
                      <button
                        onClick={testNewEndpoint}
                        disabled={
                          newEndpointTestResult.isLoading ||
                          !newEndpoint.reqline.trim()
                        }
                        className={`${theme.button.secondary} flex items-center justify-center gap-2 text-xs sm:text-sm flex-1 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors px-4 py-3`}
                        title="Test endpoint before adding"
                        aria-label="Test endpoint"
                      >
                        {newEndpointTestResult.isLoading ? (
                          <LoadingSpinner size={16} />
                        ) : (
                          <Zap size={16} />
                        )}
                        {newEndpointTestResult.isLoading
                          ? "Testing..."
                          : "Test Endpoint"}
                      </button>
                      <button
                        onClick={() => {
                          if (newEndpoint.title && newEndpoint.reqline) {
                            addEndpointToSuite(newEndpoint);
                            setNewEndpoint({
                              title: "",
                              description: "",
                              reqline: "",
                            });
                            setNewEndpointTestResult({
                              isLoading: false,
                              result: null,
                              error: null,
                            });
                          } else {
                            setToast({
                              message: "Title and reqline are required",
                              type: "error",
                            });
                          }
                        }}
                        className={`${theme.button.primary} flex items-center justify-center gap-2 text-xs sm:text-sm flex-1 rounded-lg transition-colors px-4 py-3`}
                      >
                        <Save size={16} />
                        Add to Test Suite
                      </button>
                    </div>
                  </div>

                  {/* Test Results for New Endpoint */}
                  {(newEndpointTestResult.result ||
                    newEndpointTestResult.error) && (
                    <div
                      className={`mt-4 sm:mt-6 p-3 sm:p-4 ${theme.bg.card} rounded-lg border ${theme.border.primary}`}
                    >
                      <h5
                        className={`text-sm font-semibold ${theme.text.primary} mb-2 flex flex-col sm:flex-row sm:items-center gap-2`}
                      >
                        <div className="flex items-center gap-2">
                          <Zap size={14} />
                          <span>Test Result</span>
                        </div>
                        {newEndpointTestResult.executedAt && (
                          <span
                            className={`text-xs ${theme.text.muted} font-normal`}
                          >
                            (
                            {new Date(
                              newEndpointTestResult.executedAt
                            ).toLocaleTimeString()}
                            )
                          </span>
                        )}
                      </h5>

                      {newEndpointTestResult.result && (
                        <div
                          className={`${theme.status.success} rounded-lg p-2 sm:p-3 mb-2`}
                        >
                          <div
                            className={`text-xs ${theme.status.success} mb-1 flex items-center gap-2`}
                          >
                            <CheckCircle size={12} />
                            Success -{" "}
                            {newEndpointTestResult.result.response
                              ?.http_status || "N/A"}
                          </div>

                          {/* Proxy Information */}
                          {newEndpointTestResult.result.proxy_info && (
                            <div
                              className={`${theme.status.info} rounded-lg p-2 mb-2`}
                            >
                              <div
                                className={`text-xs ${theme.status.info} mb-1 flex items-center gap-2`}
                              >
                                <Globe className="w-3 h-3" />
                                Proxy Information
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                  <span
                                    className={`${theme.status.info} font-medium`}
                                  >
                                    Original:
                                  </span>
                                  <span
                                    className={`${theme.text.primary} font-mono break-all`}
                                  >
                                    {
                                      newEndpointTestResult.result.proxy_info
                                        .original_url
                                    }
                                  </span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                  <span
                                    className={`${theme.status.info} font-medium`}
                                  >
                                    Proxied:
                                  </span>
                                  <span
                                    className={`${theme.text.primary} font-mono break-all`}
                                  >
                                    {
                                      newEndpointTestResult.result.proxy_info
                                        .proxied_url
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          <div
                            className={`${theme.bg.code} rounded-lg p-3 text-xs max-h-32 overflow-y-auto break-words font-mono ${theme.text.primary}`}
                          >
                            {JSON.stringify(
                              newEndpointTestResult.result.response
                                .response_data,
                              null,
                              2
                            )}
                          </div>
                        </div>
                      )}

                      {newEndpointTestResult.error && (
                        <div
                          className={`${theme.status.error} rounded-lg p-2 sm:p-3`}
                        >
                          <div
                            className={`text-xs ${theme.status.error} mb-1 flex items-center gap-2`}
                          >
                            <AlertTriangle size={12} />
                            Error
                          </div>
                          <div
                            className={`${theme.bg.code} rounded-lg p-3 text-xs ${theme.status.error} break-words font-mono`}
                          >
                            {newEndpointTestResult.error}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Execution Controls */}
              {currentSuite && currentSuite.endpoints.length > 0 && (
                <div
                  className={`bg-transparent rounded-3xl p-6 sm:p-8 ${theme.border.primary} shadow-lg`}
                >
                  <h4
                    className={`text-sm sm:text-base font-semibold ${theme.text.primary} mb-3 sm:mb-4 flex items-center gap-2`}
                  >
                    <Play className="w-4 h-4" />
                    Execution Controls
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={executeAllEndpoints}
                      disabled={isRunningAll}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
                      title="Run all endpoints"
                      aria-label="Run all endpoints"
                    >
                      {isRunningAll ? (
                        <LoadingSpinner size={16} />
                      ) : (
                        <Play size={16} />
                      )}
                      {isRunningAll ? "Running..." : "Run All"}
                    </button>
                    <button
                      onClick={stopAllExecution}
                      disabled={!isRunningAll}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
                      title="Stop execution"
                      aria-label="Stop execution"
                    >
                      <Square size={16} />
                      Stop
                    </button>
                    <button
                      onClick={saveCurrentSuiteToHistory}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 text-xs sm:text-sm px-4 py-2 rounded-lg transition-colors"
                      title="Save test suite to history"
                      aria-label="Save test suite to history"
                    >
                      <Save size={16} />
                      Save to History
                    </button>
                  </div>
                </div>
              )}

              {/* Endpoints List */}
              <div className="space-y-3 sm:space-y-4">
                {currentSuite?.endpoints.length === 0 ? (
                  <div
                    className={`text-center py-8 ${theme.text.secondary} text-sm`}
                  >
                    No endpoints in test suite. Add your first endpoint above.
                  </div>
                ) : (
                  currentSuite?.endpoints.map((endpoint) => (
                    <div
                      key={endpoint.id}
                      className={`${theme.bg.card} rounded-xl p-3 sm:p-4 ${theme.border.primary} hover:${theme.bg.secondary} transition-all duration-300 shadow-sm`}
                    >
                      <div className="space-y-3 sm:space-y-4">
                        {/* Endpoint Header */}
                        <div className={`flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 ${editingEndpoint === endpoint.id ? 'ring-2 ring-blue-500 ring-opacity-50 rounded-lg p-2' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h5
                                className={`font-semibold ${theme.text.primary} text-sm sm:text-base truncate`}
                              >
                                {editingEndpoint === endpoint.id ? (
                                  <div className="space-y-1">
                                    <label className={`text-xs ${theme.text.muted} font-medium`}>
                                      Title:
                                    </label>
                                    <input
                                      type="text"
                                      value={endpoint.title}
                                      onChange={(e) =>
                                        updateEndpointInSuite(endpoint.id, {
                                          title: e.target.value,
                                        })
                                      }
                                      className={`${theme.bg.input} border ${theme.border.primary} rounded px-2 py-1 ${theme.text.primary} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full`}
                                      onBlur={() => setEditingEndpoint(null)}
                                      onKeyDown={(e) =>
                                        e.key === "Enter" &&
                                        setEditingEndpoint(null)
                                      }
                                      placeholder="Enter endpoint title..."
                                    />
                                  </div>
                                ) : (
                                  <span
                                    onClick={() =>
                                      setEditingEndpoint(endpoint.id)
                                    }
                                    className="cursor-pointer hover:text-blue-600 transition-colors"
                                    title="Click to edit title"
                                  >
                                    {endpoint.title}
                                  </span>
                                )}
                              </h5>
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                                {new Date(
                                  endpoint.createdAt
                                ).toLocaleDateString()}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getStatusColor(
                                  endpoint.status
                                )}`}
                              >
                                {getStatusIcon(endpoint.status)}
                                {endpoint.status}
                              </span>
                            </div>
                            {editingEndpoint === endpoint.id ? (
                              <div className="space-y-2">
                                <label className={`text-xs ${theme.text.muted} font-medium`}>
                                  Description:
                                </label>
                                <textarea
                                  value={endpoint.description}
                                  onChange={(e) =>
                                    updateEndpointInSuite(endpoint.id, {
                                      description: e.target.value,
                                    })
                                  }
                                  className={`${theme.bg.input} border ${theme.border.primary} rounded px-2 py-1 ${theme.text.primary} text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-16`}
                                  onBlur={() => setEditingEndpoint(null)}
                                  placeholder="Enter endpoint description..."
                                  autoFocus
                                />
                                <div className={`text-xs ${theme.text.muted} flex items-center gap-1`}>
                                  <span>💡</span>
                                  <span>Press Enter or click outside to save</span>
                                </div>
                              </div>
                            ) : (
                              <p
                                className={`${theme.text.secondary} text-xs sm:text-sm mb-2 cursor-pointer hover:${theme.text.primary} transition-colors`}
                                onClick={() => setEditingEndpoint(endpoint.id)}
                                title="Click to edit description"
                              >
                                {endpoint.description ||
                                  "Click to add description"}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-shrink-0 justify-center sm:justify-end">
                            <button
                              onClick={() => executeSingleEndpoint(endpoint.id)}
                              disabled={endpoint.isLoading || isRunningAll}
                              className="p-2 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-300 disabled:opacity-50"
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
                                  editingEndpoint === endpoint.id
                                    ? null
                                    : endpoint.id
                                )
                              }
                              className="p-2 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-300"
                              title="Edit endpoint"
                              aria-label={`Edit ${endpoint.title}`}
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() =>
                                removeEndpointFromSuite(endpoint.id)
                              }
                              className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-300"
                              title="Remove endpoint"
                              aria-label={`Remove ${endpoint.title}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Reqline Syntax */}
                        <div
                          className={`${theme.bg.card} rounded-lg p-2 sm:p-3 border ${theme.border.primary}`}
                        >
                          <div className={`text-xs ${theme.status.info} mb-1`}>
                            Reqline Syntax:
                          </div>
                          <div
                            className={`${theme.bg.code} rounded-lg p-3 text-xs break-words font-mono ${theme.text.primary}`}
                          >
                            {endpoint.reqline}
                          </div>
                        </div>

                        {/* Results */}
                        {endpoint.result && (
                          <div
                            className={`${theme.status.success} rounded-lg p-2 sm:p-3`}
                          >
                            <div
                              className={`text-xs ${theme.status.success} mb-1 flex flex-col sm:flex-row sm:items-center gap-2`}
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle size={12} />
                                <span>
                                  Success -{" "}
                                  {endpoint.result.response.http_status}
                                </span>
                              </div>
                              {endpoint.executedAt && (
                                <span className={theme.text.muted}>
                                  (
                                  {new Date(
                                    endpoint.executedAt
                                  ).toLocaleTimeString()}
                                  )
                                </span>
                              )}
                            </div>
                            <div
                              className={`${theme.bg.code} rounded-lg p-3 text-xs max-h-32 overflow-y-auto break-words font-mono ${theme.text.primary}`}
                            >
                              {JSON.stringify(
                                endpoint.result.response.response_data,
                                null,
                                2
                              )}
                            </div>
                          </div>
                        )}

                        {endpoint.error && (
                          <div
                            className={`${theme.status.error} rounded-lg p-2 sm:p-3`}
                          >
                            <div
                              className={`text-xs ${theme.status.error} mb-1 flex flex-col sm:flex-row sm:items-center gap-2`}
                            >
                              <div className="flex items-center gap-2">
                                <AlertTriangle size={12} />
                                <span>Error</span>
                              </div>
                              {endpoint.executedAt && (
                                <span className={theme.text.muted}>
                                  (
                                  {new Date(
                                    endpoint.executedAt
                                  ).toLocaleTimeString()}
                                  )
                                </span>
                              )}
                            </div>
                            <div
                              className={`${theme.bg.code} rounded-lg p-3 text-xs ${theme.status.error} break-words font-mono`}
                            >
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
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div
              className={`${theme.bg.card} rounded-3xl p-6 sm:p-8 ${theme.border.primary} shadow-lg`}
            >
              <h4
                className={`text-sm sm:text-base font-semibold ${theme.text.primary} mb-3 sm:mb-4 flex items-center gap-2`}
              >
                <Clock className="w-4 h-4" />
                Test Suite History
              </h4>
              {testSuites.length === 0 ? (
                <div
                  className={`text-center py-4 ${theme.text.secondary} text-sm`}
                >
                  No test suites in history. Create your first test suite to see
                  it here.
                </div>
              ) : (
                <div className="space-y-3">
                  {testSuites.map((suite) => (
                    <div
                      key={suite.id}
                      className={`${theme.bg.card} rounded-lg p-3 border ${theme.border.primary} hover:${theme.bg.secondary} transition-all duration-300`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <h5
                            className={`font-semibold ${theme.text.primary} text-sm mb-1 truncate`}
                          >
                            {suite.title}
                          </h5>
                          <p
                            className={`${theme.text.secondary} text-xs mb-2 sm:mb-1 line-clamp-2`}
                          >
                            {suite.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-green-600 bg-green-50 px-2 py-1 rounded truncate max-w-full border border-green-200">
                              {suite.baseUrl}
                            </span>
                            <span className="text-blue-600">
                              {suite.endpoints.length} endpoints
                            </span>
                            <span className="text-gray-500">
                              {new Date(suite.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 justify-center sm:justify-end">
                          <button
                            onClick={() => {
                              loadSuiteFromHistory(suite.id);
                              setActiveTab("current"); // Switch to current tab after loading
                            }}
                            className="p-2 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-300"
                            title="Load this test suite"
                            aria-label={`Load ${suite.title}`}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => deleteSuiteFromHistory(suite.id)}
                            className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-300"
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

          {/* Vault Tab */}
          {activeTab === "vault" && (
            <div className="space-y-6 sm:space-y-8">
              {/* Add New Vault Item */}
              <div
                className={`${theme.bg.card} rounded-3xl p-6 sm:p-8 ${theme.border.primary} shadow-lg`}
              >
                <h4
                  className={`text-sm sm:text-base font-semibold ${theme.text.primary} mb-3 sm:mb-4 flex items-center gap-2`}
                >
                  <Plus className="w-4 h-4" />
                  Add New Vault Item
                </h4>
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid gap-3 sm:gap-4">
                    <input
                      type="text"
                      placeholder="Name (e.g., Bearer Token, API Key, Base URL)"
                      value={newVaultItem.name}
                      onChange={(e) =>
                        setNewVaultItem((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className={`${theme.bg.input} ${theme.border.primary} rounded-lg ${theme.text.primary} ${theme.text.placeholder} text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full`}
                    />
                    <textarea
                      placeholder="Value (e.g., eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..., https://api.example.com, etc.)"
                      value={newVaultItem.value}
                      onChange={(e) =>
                        setNewVaultItem((prev) => ({
                          ...prev,
                          value: e.target.value,
                        }))
                      }
                      className={`${theme.bg.input} ${theme.border.primary} rounded-lg ${theme.text.primary} ${theme.text.placeholder} text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none h-20 font-mono w-full`}
                    />
                    <button
                      onClick={addVaultItem}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-xs sm:text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      <Save size={16} />
                      Add to Vault
                    </button>
                  </div>
                </div>
              </div>

              {/* Vault Items */}
              <div
                className={`${theme.bg.card} rounded-3xl p-6 sm:p-8 ${theme.border.primary} shadow-lg`}
              >
                <h4
                  className={`text-sm sm:text-base font-semibold ${theme.text.primary} mb-3 sm:mb-4 flex items-center gap-2`}
                >
                  <Key className="w-4 h-4" />
                  Vault Items
                </h4>
                {vaultItems.length === 0 ? (
                  <div
                    className={`text-center py-8 ${theme.text.secondary} text-sm`}
                  >
                    <Key
                      className={`w-12 h-12 mx-auto mb-4 ${theme.text.muted}`}
                    />
                    <p>No vault items saved yet. Add your first item above.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vaultItems.map((item) => (
                      <div
                        key={item.id}
                        className={`${theme.bg.card} rounded-lg p-3 border ${theme.border.primary} hover:${theme.bg.secondary} transition-all duration-300`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Key className="w-4 h-4 text-blue-600" />
                              <h5
                                className={`font-semibold ${theme.text.primary} text-sm truncate`}
                              >
                                {item.name}
                              </h5>
                            </div>
                            <div
                              className={`${theme.bg.code} rounded-lg p-3 text-xs max-h-16 overflow-y-auto break-words font-mono ${theme.text.primary}`}
                            >
                              {item.value}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className={`text-xs ${theme.text.muted}`}>
                                {new Date(item.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0 justify-center sm:justify-end">
                            <button
                              onClick={() => useVaultItem(item)}
                              className="p-2 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-300"
                              title={`Copy ${item.name} to clipboard`}
                            >
                              <Send size={16} />
                            </button>
                            <button
                              onClick={() => copyVaultItem(item)}
                              className="p-2 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-300"
                              title="Copy to clipboard"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              onClick={() => removeVaultItem(item.id)}
                              className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-300"
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
        </div>
      </div>
    </div>
  );
};

export default MultipleEndpoints;
