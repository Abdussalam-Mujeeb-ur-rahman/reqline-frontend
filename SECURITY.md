# Security Documentation

## Overview

This document outlines the security measures implemented in the Reqline Parser Frontend application to protect against common web vulnerabilities and ensure safe operation.

## Security Measures Implemented

### 1. Input Validation & Sanitization

#### XSS Prevention
- **DOMPurify Integration**: All user inputs are sanitized using DOMPurify to prevent XSS attacks
- **HTML Tag Removal**: All HTML tags are stripped from user input while preserving content
- **Control Character Filtering**: Null bytes and control characters are removed

```typescript
// Example: sanitizeInput function
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
    KEEP_CONTENT: true 
  });
}
```

#### Input Length Limits
- **Reqline Input**: Maximum 10,000 characters
- **URL Length**: Maximum 2,048 characters
- **Headers Size**: Maximum 8KB
- **Body Size**: Maximum 1MB

#### URL Validation
- Only HTTP and HTTPS protocols allowed
- Valid URL format validation
- Protocol whitelist enforcement

```typescript
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url || typeof url !== "string") {
    return { isValid: false, error: "URL is required" };
  }
  
  if (url.length > INPUT_LIMITS.MAX_URL_LENGTH) {
    return { 
      isValid: false, 
      error: `URL too long. Maximum length is ${INPUT_LIMITS.MAX_URL_LENGTH} characters` 
    };
  }
  
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTP and HTTPS protocols
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return { isValid: false, error: "Only HTTP and HTTPS protocols are allowed" };
    }
    
    return { isValid: true };
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }
}
```

### 2. Rate Limiting

#### Implementation
- **Per-User Tracking**: Rate limits are tracked per user identifier
- **Two-Tier System**: Separate limits for minute and hour windows
- **Configurable Limits**: Easy to adjust limits based on requirements

```typescript
export const RATE_LIMITS = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 1000,
} as const;
```

#### Rate Limit Logic
- **Minute Limit**: 60 requests per minute per user
- **Hour Limit**: 1,000 requests per hour per user
- **Graceful Degradation**: Returns retry-after time when limits exceeded

### 3. Error Handling & Information Disclosure

#### Safe Error Messages
- **No Sensitive Data**: Error messages never expose internal system information
- **Generic Messages**: Authentication errors are masked with generic messages
- **Sanitized Output**: All error messages are sanitized before display

```typescript
export function createSafeErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return sanitizeInput(error);
  }
  
  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string") {
      const message = error.message.toLowerCase();
      
      // Check for sensitive information in error messages
      if (message.includes("password") || 
          message.includes("token") || 
          message.includes("key") ||
          message.includes("secret") ||
          message.includes("api_key")) {
        return "An authentication error occurred. Please check your credentials.";
      }
      
      if (message.includes("timeout")) {
        return "Request timed out. Please try again.";
      }
      
      if (message.includes("network") || message.includes("connection")) {
        return "Network error. Please check your connection and try again.";
      }
      
      return sanitizeInput(error.message);
    }
  }
  
  return "An unexpected error occurred. Please try again.";
}
```

### 4. API Security

#### Request Timeout
- **30-Second Timeout**: All API requests have a 30-second timeout
- **Proper Headers**: Content-Type and other headers are properly set
- **Error Handling**: Timeout errors are handled gracefully

#### Response Sanitization
- **All Responses Sanitized**: Every API response is sanitized before display
- **Nested Object Support**: Handles complex nested objects and arrays
- **Recursive Processing**: Deep sanitization of all response data

```typescript
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
```

### 5. Client-Side Security

#### Clipboard Security
- **Sanitized Copy**: All clipboard operations sanitize data before copying
- **Error Handling**: Clipboard failures are handled gracefully
- **User Feedback**: Clear success/error messages for clipboard operations

#### Form Security
- **Input Validation**: All form inputs are validated before submission
- **CSRF Protection**: Form submissions include proper headers
- **Disabled States**: Buttons are properly disabled during processing

### 6. Accessibility & Security

#### ARIA Labels
- **Proper Labeling**: All interactive elements have proper ARIA labels
- **Screen Reader Support**: Full accessibility for assistive technologies
- **Keyboard Navigation**: All functionality accessible via keyboard

#### Error Boundaries
- **React Error Boundaries**: Catches and handles React component errors
- **Graceful Degradation**: Application continues to function even with errors
- **User-Friendly Messages**: Clear error messages for users

## Security Testing

### Automated Tests
- **Input Validation Tests**: Verify all input validation functions
- **XSS Prevention Tests**: Ensure malicious scripts are properly sanitized
- **Rate Limiting Tests**: Verify rate limiting logic works correctly
- **Error Handling Tests**: Ensure safe error messages

### Manual Testing Checklist
- [ ] Test XSS payloads in input fields
- [ ] Verify rate limiting behavior
- [ ] Test error message sanitization
- [ ] Check clipboard security
- [ ] Verify URL validation
- [ ] Test input length limits

## Security Best Practices

### Development
1. **Input Validation**: Always validate and sanitize user input
2. **Error Handling**: Never expose sensitive information in error messages
3. **Rate Limiting**: Implement rate limiting for all API endpoints
4. **Timeout Handling**: Set appropriate timeouts for all requests
5. **Content Security**: Sanitize all content before display

### Deployment
1. **HTTPS Only**: Ensure all communications use HTTPS
2. **Security Headers**: Implement proper security headers
3. **Regular Updates**: Keep dependencies updated
4. **Monitoring**: Monitor for security issues
5. **Backup Strategy**: Implement proper backup and recovery

## Known Limitations

1. **Client-Side Rate Limiting**: Rate limiting is implemented client-side and can be bypassed
2. **Browser Security**: Relies on browser security features
3. **Network Security**: Depends on network-level security measures

## Recommendations

1. **Server-Side Validation**: Implement server-side validation for all inputs
2. **API Rate Limiting**: Add server-side rate limiting
3. **Content Security Policy**: Implement CSP headers
4. **Security Monitoring**: Add security monitoring and alerting
5. **Regular Security Audits**: Conduct regular security audits

## Contact

For security issues or questions, please contact the development team. 