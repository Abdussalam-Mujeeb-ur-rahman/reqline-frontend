// Shared types and interfaces for the Reqline application

export interface RequestData {
  query: Record<string, unknown>;
  body: Record<string, unknown>;
  headers: Record<string, unknown>;
  full_url: string;
  cookies_sent?: string[];
}

export interface ResponseData {
  http_status: number;
  duration: number;
  request_start_timestamp: number;
  request_stop_timestamp: number;
  response_data: unknown;
  cookies_received?: string[];
}

export interface ApiResponse {
  request: RequestData;
  response: ResponseData;
}

export interface VaultItem {
  id: string;
  name: string;
  value: string;
  createdAt: number;
  updatedAt: number;
}

export interface RequestHistory {
  id: string;
  reqline: string;
  timestamp: number;
  useProxy?: boolean;
  proxyTarget?: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  endpoints: Endpoint[];
  createdAt: number;
  updatedAt: number;
}

export interface Endpoint {
  id: string;
  title: string;
  description: string;
  reqline: string;
  testResult?: {
    isLoading: boolean;
    result: ApiResponse | null;
    error: string | null;
    executedAt?: number;
  };
}

export interface Keyword {
  text: string;
  template: string;
  isFileUpload?: boolean;
}

export interface ToastMessage {
  message: string;
  type: "success" | "error";
}

export interface FormDataField {
  [key: string]: string;
}

export interface FileUploadState {
  selectedFiles: File[];
  formDataFields: FormDataField;
}

export interface ProxyState {
  useProxy: boolean;
  proxyTarget: string;
}
