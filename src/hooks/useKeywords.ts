import { useCallback } from "react";
import type { Keyword } from "../types";

export const useKeywords = () => {
  const keywords: Keyword[] = [
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

  const isKeywordPresent = useCallback(
    (keyword: string, reqline: string): boolean => {
      return reqline.toUpperCase().includes(keyword.toUpperCase());
    },
    []
  );

  const normalizeDelimiters = useCallback((text: string): string => {
    let output = text;
    // Ensure single spacing around delimiter
    output = output.replace(/\s*\|\s*/g, " | ");
    // Collapse repeated delimiters
    output = output.replace(/(?: \| )+/g, " | ");
    // Remove leading/trailing delimiters
    output = output.replace(/^(?: \| )+/, "");
    output = output.replace(/(?: \| )+$/, "");
    return output;
  }, []);

  const handleKeywordClick = useCallback(
    (
      template: string,
      isFileUpload: boolean,
      currentReqline: string,
      onUpdateReqline: (newReqline: string) => void,
      baseUrl?: string,
      onAddFormDataField?: (key: string, value: string) => void
    ) => {
      if (isFileUpload) {
        // For file uploads, add a default field to show the UI
        if (onAddFormDataField) {
          onAddFormDataField("name", "John Doe");
        }
        return;
      }

      let insertText = template;

      // Smart URL logic: if URL keyword and base URL is set, use it
      if (template.startsWith("URL ") && baseUrl) {
        insertText = `URL ${baseUrl}`;
      }

      // Smart delimiter logic: add delimiter only if needed
      if (currentReqline.trim() !== "") {
        const endsWithDelimiter = /\|\s*$/.test(currentReqline);
        insertText = (endsWithDelimiter ? "" : " | ") + insertText;
      }

      const newValue = normalizeDelimiters(currentReqline + insertText);
      onUpdateReqline(newValue);
    },
    [normalizeDelimiters]
  );

  return {
    keywords,
    isKeywordPresent,
    normalizeDelimiters,
    handleKeywordClick,
  };
};
