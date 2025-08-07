import DOMPurify from "dompurify";

// Input validation constants
export const INPUT_LIMITS = {
  MAX_REQLINE_LENGTH: 10000, // 10KB max
  MAX_URL_LENGTH: 2048,
  MAX_HEADERS_SIZE: 8192, // 8KB max
  MAX_BODY_SIZE: 1048576, // 1MB max
} as const;

// Rate limiting
export const RATE_LIMITS = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 1000,
} as const;

// Request timeout
export const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove null bytes and control characters (but keep spaces and newlines)
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Sanitize with DOMPurify - only remove HTML tags, keep content
  return DOMPurify.sanitize(cleaned, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Validate reqline syntax length
 */
export function validateReqlineLength(reqline: string): {
  isValid: boolean;
  error?: string;
} {
  if (!reqline || typeof reqline !== "string") {
    return { isValid: false, error: "Reqline input is required" };
  }

  if (reqline.length > INPUT_LIMITS.MAX_REQLINE_LENGTH) {
    return {
      isValid: false,
      error: `Reqline too long. Maximum length is ${INPUT_LIMITS.MAX_REQLINE_LENGTH} characters`,
    };
  }

  if (reqline.trim().length === 0) {
    return { isValid: false, error: "Reqline cannot be empty" };
  }

  return { isValid: true };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url || typeof url !== "string") {
    return { isValid: false, error: "URL is required" };
  }

  if (url.length > INPUT_LIMITS.MAX_URL_LENGTH) {
    return {
      isValid: false,
      error: `URL too long. Maximum length is ${INPUT_LIMITS.MAX_URL_LENGTH} characters`,
    };
  }

  try {
    const urlObj = new URL(url);

    // Only allow HTTP and HTTPS protocols
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return {
        isValid: false,
        error: "Only HTTP and HTTPS protocols are allowed",
      };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }
}

/**
 * Validate JSON string
 */
export function validateJson(jsonString: string): {
  isValid: boolean;
  error?: string;
} {
  if (!jsonString || typeof jsonString !== "string") {
    return { isValid: false, error: "JSON string is required" };
  }

  try {
    JSON.parse(jsonString);
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: "Invalid JSON format" };
  }
}

/**
 * Sanitize API response data to prevent XSS
 */
export function sanitizeResponseData(data: unknown): unknown {
  if (typeof data === "string") {
    return sanitizeInput(data);
  }

  if (typeof data === "object" && data !== null) {
    if (Array.isArray(data)) {
      return data.map(sanitizeResponseData);
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[sanitizeInput(key)] = sanitizeResponseData(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Create a safe error message that doesn't expose sensitive information
 */
export function createSafeErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return sanitizeInput(error);
  }

  if (error && typeof error === "object") {
    // Handle axios error responses with specific backend error messages
    if ("response" in error && error.response && typeof error.response === "object") {
      const response = error.response as any;
      
      // Check if backend returned a specific error message
      if (response.data && typeof response.data === "object") {
        // Handle different backend error response formats
        if (response.data.message && typeof response.data.message === "string") {
          return sanitizeInput(response.data.message);
        }
        if (response.data.error && typeof response.data.error === "string") {
          return sanitizeInput(response.data.error);
        }
        if (response.data.detail && typeof response.data.detail === "string") {
          return sanitizeInput(response.data.detail);
        }
      }
      
      // Handle HTTP status codes with specific messages
      if (response.status) {
        switch (response.status) {
          case 400:
            return "Invalid request format. Please check your Reqline syntax.";
          case 401:
            return "Authentication required. Please check your credentials.";
          case 403:
            return "Access denied. You don't have permission to perform this action.";
          case 404:
            return "API endpoint not found. Please check the URL.";
          case 429:
            return "Too many requests. Please wait a moment before trying again.";
          case 500:
            return "Server error. Please try again later.";
          case 502:
            return "Bad gateway. The server is temporarily unavailable.";
          case 503:
            return "Service unavailable. Please try again later.";
          case 504:
            return "Gateway timeout. The request took too long to process.";
          default:
            return `Request failed with status code ${response.status}`;
        }
      }
    }

    // Handle axios error messages
    if ("message" in error && typeof error.message === "string") {
      const message = error.message.toLowerCase();

      // Check for sensitive information in error messages
      if (
        message.includes("password") ||
        message.includes("token") ||
        message.includes("key") ||
        message.includes("secret") ||
        message.includes("api_key")
      ) {
        return "An authentication error occurred. Please check your credentials.";
      }

      if (message.includes("timeout")) {
        return "Request timed out. Please try again.";
      }

      if (message.includes("network") || message.includes("connection")) {
        return "Network error. Please check your connection and try again.";
      }

      // For axios errors, try to extract the actual error message
      if (message.includes("request failed with status code")) {
        // This will be handled by the response.status check above
        return "Request failed. Please check your input and try again.";
      }

      return sanitizeInput(error.message);
    }
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Rate limiting utility (simple in-memory implementation)
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, [now]);
      return true;
    }

    const requests = this.requests.get(identifier)!;
    const recentRequests = requests.filter((time) => time > windowStart);

    if (recentRequests.length >= limit) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    return true;
  }

  clear() {
    this.requests.clear();
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Check if request is rate limited
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const minuteAllowed = rateLimiter.isAllowed(
    `${identifier}:minute`,
    RATE_LIMITS.MAX_REQUESTS_PER_MINUTE,
    60 * 1000
  );

  const hourAllowed = rateLimiter.isAllowed(
    `${identifier}:hour`,
    RATE_LIMITS.MAX_REQUESTS_PER_HOUR,
    60 * 60 * 1000
  );

  if (!minuteAllowed) {
    return { allowed: false, retryAfter: 60 };
  }

  if (!hourAllowed) {
    return { allowed: false, retryAfter: 3600 };
  }

  return { allowed: true };
}
