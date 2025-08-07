import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  sanitizeInput,
  validateReqlineLength,
  validateUrl,
  validateJson,
  sanitizeResponseData,
  createSafeErrorMessage,
  checkRateLimit,
  rateLimiter,
  INPUT_LIMITS,
  RATE_LIMITS,
  REQUEST_TIMEOUT,
} from "../utils/security";

describe("Security Utilities", () => {
  beforeEach(() => {
    rateLimiter.clear();
  });

  afterEach(() => {
    rateLimiter.clear();
  });

  describe("sanitizeInput", () => {
    it("removes script tags and other HTML", () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const result = sanitizeInput(maliciousInput);
      expect(result).toBe("Hello World");
    });

    it("removes null bytes and control characters", () => {
      const inputWithNulls = "Hello\x00World\x1F\x7F";
      const result = sanitizeInput(inputWithNulls);
      expect(result).toBe("HelloWorld");
    });

    it("handles empty string", () => {
      const result = sanitizeInput("");
      expect(result).toBe("");
    });

    it("handles non-string input", () => {
      const result = sanitizeInput(null as any);
      expect(result).toBe("");
    });

    it("preserves safe text", () => {
      const safeInput = "HTTP GET | URL https://example.com";
      const result = sanitizeInput(safeInput);
      expect(result).toBe(safeInput);
    });
  });

  describe("validateReqlineLength", () => {
    it("validates empty input", () => {
      const result = validateReqlineLength("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Reqline input is required");
    });

    it("validates whitespace-only input", () => {
      const result = validateReqlineLength("   ");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Reqline cannot be empty");
    });

    it("validates input that is too long", () => {
      const longInput = "A".repeat(INPUT_LIMITS.MAX_REQLINE_LENGTH + 1);
      const result = validateReqlineLength(longInput);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Reqline too long");
    });

    it("validates valid input", () => {
      const validInput = "HTTP GET | URL https://example.com";
      const result = validateReqlineLength(validInput);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("handles non-string input", () => {
      const result = validateReqlineLength(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Reqline input is required");
    });
  });

  describe("validateUrl", () => {
    it("validates empty URL", () => {
      const result = validateUrl("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("URL is required");
    });

    it("validates URL that is too long", () => {
      const longUrl =
        "https://example.com/" + "a".repeat(INPUT_LIMITS.MAX_URL_LENGTH);
      const result = validateUrl(longUrl);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("URL too long");
    });

    it("validates invalid URL format", () => {
      const result = validateUrl("not-a-url");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid URL format");
    });

    it("validates non-HTTP/HTTPS protocols", () => {
      const result = validateUrl("ftp://example.com");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Only HTTP and HTTPS protocols are allowed");
    });

    it("validates valid HTTP URL", () => {
      const result = validateUrl("http://example.com");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("validates valid HTTPS URL", () => {
      const result = validateUrl("https://example.com");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("validateJson", () => {
    it("validates empty JSON string", () => {
      const result = validateJson("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("JSON string is required");
    });

    it("validates invalid JSON", () => {
      const result = validateJson("{invalid json}");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid JSON format");
    });

    it("validates valid JSON", () => {
      const result = validateJson('{"key": "value"}');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("validates valid JSON array", () => {
      const result = validateJson("[1, 2, 3]");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("sanitizeResponseData", () => {
    it("sanitizes string data", () => {
      const maliciousString = '<script>alert("xss")</script>Hello';
      const result = sanitizeResponseData(maliciousString);
      expect(result).toBe("Hello");
    });

    it("sanitizes object data", () => {
      const maliciousObject = {
        safe: "safe data",
        malicious: '<script>alert("xss")</script>',
        nested: {
          malicious: '<img src=x onerror=alert("xss")>',
        },
      };
      const result = sanitizeResponseData(maliciousObject) as any;
      expect(result.safe).toBe("safe data");
      expect(result.malicious).toBe("");
      expect(result.nested.malicious).toBe("");
    });

    it("sanitizes array data", () => {
      const maliciousArray = [
        "safe data",
        '<script>alert("xss")</script>',
        { malicious: '<script>alert("xss")</script>' },
      ];
      const result = sanitizeResponseData(maliciousArray) as any[];
      expect(result[0]).toBe("safe data");
      expect(result[1]).toBe("");
      expect(result[2].malicious).toBe("");
    });

    it("handles null and undefined", () => {
      expect(sanitizeResponseData(null)).toBe(null);
      expect(sanitizeResponseData(undefined)).toBe(undefined);
    });

    it("handles numbers and booleans", () => {
      expect(sanitizeResponseData(42)).toBe(42);
      expect(sanitizeResponseData(true)).toBe(true);
      expect(sanitizeResponseData(false)).toBe(false);
    });
  });

  describe("createSafeErrorMessage", () => {
    it("sanitizes string errors", () => {
      const maliciousError = '<script>alert("xss")</script>Error message';
      const result = createSafeErrorMessage(maliciousError);
      expect(result).toBe("Error message");
    });

    it("masks authentication errors", () => {
      const authError = { message: "Invalid password provided" };
      const result = createSafeErrorMessage(authError);
      expect(result).toBe(
        "An authentication error occurred. Please check your credentials."
      );
    });

    it("masks token errors", () => {
      const tokenError = { message: "Invalid API key" };
      const result = createSafeErrorMessage(tokenError);
      expect(result).toBe(
        "An authentication error occurred. Please check your credentials."
      );
    });

    it("handles timeout errors", () => {
      const timeoutError = { message: "Request timeout" };
      const result = createSafeErrorMessage(timeoutError);
      expect(result).toBe("Request timed out. Please try again.");
    });

    it("handles network errors", () => {
      const networkError = { message: "Network connection failed" };
      const result = createSafeErrorMessage(networkError);
      expect(result).toBe(
        "Network error. Please check your connection and try again."
      );
    });

    it("handles unknown errors", () => {
      const unknownError = { message: "Some unknown error" };
      const result = createSafeErrorMessage(unknownError);
      expect(result).toBe("Some unknown error");
    });

    it("handles non-object errors", () => {
      const result = createSafeErrorMessage("Simple error");
      expect(result).toBe("Simple error");
    });
  });

  describe("Rate Limiting", () => {
    it("allows requests within rate limit", () => {
      const result = checkRateLimit("user1");
      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    it("blocks requests exceeding minute limit", () => {
      // Make requests up to the limit
      for (let i = 0; i < RATE_LIMITS.MAX_REQUESTS_PER_MINUTE; i++) {
        checkRateLimit("user2");
      }

      // Next request should be blocked
      const result = checkRateLimit("user2");
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(60);
    });

    it('blocks requests exceeding hour limit', () => {
      // Use a different identifier to avoid minute limit interference
      const hourUser = 'hour-test-user'
      
      // Make requests up to the hour limit
      for (let i = 0; i < RATE_LIMITS.MAX_REQUESTS_PER_HOUR; i++) {
        checkRateLimit(hourUser)
      }
      
      // Next request should be blocked by hour limit
      const result = checkRateLimit(hourUser)
      expect(result.allowed).toBe(false)
      expect(result.retryAfter).toBe(3600)
    })

    it("tracks different users separately", () => {
      // User A makes many requests
      for (let i = 0; i < RATE_LIMITS.MAX_REQUESTS_PER_MINUTE; i++) {
        checkRateLimit("userA");
      }

      // User B should still be allowed
      const result = checkRateLimit("userB");
      expect(result.allowed).toBe(true);
    });
  });

  describe("Constants", () => {
    it("has correct input limits", () => {
      expect(INPUT_LIMITS.MAX_REQLINE_LENGTH).toBe(10000);
      expect(INPUT_LIMITS.MAX_URL_LENGTH).toBe(2048);
      expect(INPUT_LIMITS.MAX_HEADERS_SIZE).toBe(8192);
      expect(INPUT_LIMITS.MAX_BODY_SIZE).toBe(1048576);
    });

    it("has correct rate limits", () => {
      expect(RATE_LIMITS.MAX_REQUESTS_PER_MINUTE).toBe(60);
      expect(RATE_LIMITS.MAX_REQUESTS_PER_HOUR).toBe(1000);
    });

    it("has correct request timeout", () => {
      expect(REQUEST_TIMEOUT).toBe(30000);
    });
  });
});
