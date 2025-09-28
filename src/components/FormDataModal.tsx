import React from "react";
import { Upload } from "lucide-react";
import { useThemeClasses } from "../hooks/useThemeClasses";
import { FileUploadState, ToastMessage } from "../types";

interface FormDataModalProps {
  selectedFiles: File[];
  formDataFields: Record<string, string>;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onUpdateFormDataField: (key: string, value: string) => void;
  onRemoveFormDataField: (key: string) => void;
  onGenerateFormData: () => void;
  onShowToast: (toast: ToastMessage) => void;
}

const FormDataModal: React.FC<FormDataModalProps> = ({
  selectedFiles,
  formDataFields,
  onFileSelect,
  onRemoveFile,
  onUpdateFormDataField,
  onRemoveFormDataField,
  onGenerateFormData,
  onShowToast,
}) => {
  const theme = useThemeClasses();

  const handleGenerateFormData = () => {
    onGenerateFormData();
    onShowToast({
      message: "FormData generated successfully!",
      type: "success",
    });
  };

  // Don't render if no files or form fields
  if (selectedFiles.length === 0 && Object.keys(formDataFields).length === 0) {
    return null;
  }

  return (
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
          onChange={onFileSelect}
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
                  onClick={() => onRemoveFile(index)}
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
                // Update all fields with new key
                Object.entries(newFields).forEach(([k, v]) => {
                  onUpdateFormDataField(k, v);
                });
              }}
              className={`flex-1 ${theme.bg.input} ${theme.border.primary} rounded-lg sm:rounded-xl ${theme.text.primary} ${theme.text.placeholder} text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            />
            <input
              type="text"
              placeholder="Field value"
              value={value}
              onChange={(e) => onUpdateFormDataField(key, e.target.value)}
              className={`flex-1 ${theme.bg.input} ${theme.border.primary} rounded-lg sm:rounded-xl ${theme.text.primary} ${theme.text.placeholder} text-xs sm:text-sm p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            />
            <button
              type="button"
              onClick={() => onRemoveFormDataField(key)}
              className={`${theme.text.muted} hover:${theme.text.secondary} text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:${theme.bg.secondary} whitespace-nowrap`}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onUpdateFormDataField(`field_${Date.now()}`, "")}
          className={`${theme.text.accent} hover:${theme.text.primary} text-xs sm:text-sm`}
        >
          + Add Field
        </button>
      </div>

      {/* Generate FormData Button */}
      <button
        type="button"
        onClick={handleGenerateFormData}
        className={`${theme.button.primary} flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl w-full sm:w-auto`}
      >
        <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
        Generate FormData
      </button>
    </div>
  );
};

export default FormDataModal;
