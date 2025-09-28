import React from "react";
import { Code } from "lucide-react";
import { useThemeClasses } from "../hooks/useThemeClasses";
import { Keyword } from "../types";

interface KeywordButtonsProps {
  keywords: Keyword[];
  currentReqline: string;
  onKeywordClick: (template: string, isFileUpload?: boolean) => void;
  baseUrl?: string;
  title?: string;
}

const KeywordButtons: React.FC<KeywordButtonsProps> = ({
  keywords,
  currentReqline,
  onKeywordClick,
  baseUrl,
  title = "Quick Actions",
}) => {
  const theme = useThemeClasses();

  const isKeywordPresent = (keyword: string): boolean => {
    return currentReqline.toUpperCase().includes(keyword.toUpperCase());
  };

  return (
    <div>
      <h3
        className={`${theme.text.primary} font-semibold mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2 text-sm sm:text-base`}
      >
        <Code className="w-3 h-3 sm:w-4 sm:h-4" />
        {title}
      </h3>
      <div className="flex flex-wrap gap-1 sm:gap-2">
        {keywords.map((keyword, index) => (
          <button
            key={index}
            type="button"
            onClick={() =>
              onKeywordClick(keyword.template, keyword.isFileUpload)
            }
            className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 hover:scale-105 ${
              keyword.text === "URL" && baseUrl
                ? theme.button.keywordActive
                : isKeywordPresent(keyword.text)
                ? theme.button.keywordActive
                : theme.button.keywordInactive
            }`}
            title={
              keyword.text === "URL" && baseUrl
                ? `Insert URL ${baseUrl}`
                : `Insert ${keyword.template}`
            }
            aria-label={
              keyword.text === "URL" && baseUrl
                ? `Insert URL ${baseUrl}`
                : `Insert ${keyword.template}`
            }
          >
            {keyword.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default KeywordButtons;
