import { useState, useCallback } from "react";
import { FormDataField } from "../types";

export const useFormData = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formDataFields, setFormDataFields] = useState<FormDataField>({});

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      setSelectedFiles((prev) => [...prev, ...files]);
    },
    []
  );

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateFormDataField = useCallback((key: string, value: string) => {
    setFormDataFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const removeFormDataField = useCallback((key: string) => {
    setFormDataFields((prev) => {
      const newFields = { ...prev };
      delete newFields[key];
      return newFields;
    });
  }, []);

  const generateFormDataReqline = useCallback(() => {
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
  }, [selectedFiles, formDataFields]);

  const clearFormData = useCallback(() => {
    setSelectedFiles([]);
    setFormDataFields({});
  }, []);

  return {
    selectedFiles,
    formDataFields,
    handleFileSelect,
    removeFile,
    updateFormDataField,
    removeFormDataField,
    generateFormDataReqline,
    clearFormData,
  };
};
