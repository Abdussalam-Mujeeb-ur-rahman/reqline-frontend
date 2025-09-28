import axios from "axios";
import config from "../../config";

export interface UploadedFile {
  originalName: string;
  serverPath: string;
  filename: string;
  size: number;
  mimetype: string;
  fieldName: string;
}

export interface FileUploadResponse {
  message: string;
  files: UploadedFile[];
}

export class FileUploadService {
  private static instance: FileUploadService;
  private uploadedFiles: Map<string, UploadedFile> = new Map();

  static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  async uploadFiles(files: File[]): Promise<UploadedFile[]> {
    if (files.length === 0) {
      throw new Error("No files to upload");
    }

    try {
      // Convert files to base64 for upload
      const filePromises = files.map(async (file) => {
        return new Promise<{ name: string; content: string; type: string }>(
          (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64Content = result.split(",")[1]; // Remove data URL prefix
              resolve({
                name: file.name,
                content: base64Content,
                type: file.type,
              });
            };
            reader.onerror = () =>
              reject(new Error(`Failed to read file ${file.name}`));
            reader.readAsDataURL(file);
          }
        );
      });

      const fileData = await Promise.all(filePromises);

      const response = await axios.post<FileUploadResponse>(
        `${config.apiUrl}/upload`,
        { files: fileData },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      const uploadedFiles = response.data.files;

      uploadedFiles.forEach((file) => {
        this.uploadedFiles.set(file.originalName, file);
      });

      return uploadedFiles;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || "File upload failed";
      throw new Error(errorMessage);
    }
  }

  generateFormDataReqline(
    files: UploadedFile[],
    additionalFields: Record<string, string> = {}
  ): string {
    const formDataObj: Record<string, any> = { ...additionalFields };

    files.forEach((file, index) => {
      const fieldName = file.fieldName || `file_${index + 1}`;
      formDataObj[fieldName] = {
        type: "file",
        path: file.serverPath,
        filename: file.filename,
        contentType: file.mimetype,
      };
    });

    return `FORMDATA ${JSON.stringify(formDataObj, null, 2)}`;
  }

  getUploadedFile(originalName: string): UploadedFile | undefined {
    return this.uploadedFiles.get(originalName);
  }

  getAllUploadedFiles(): UploadedFile[] {
    return Array.from(this.uploadedFiles.values());
  }

  clearUploadedFiles(): void {
    this.uploadedFiles.clear();
  }

  removeUploadedFile(originalName: string): boolean {
    return this.uploadedFiles.delete(originalName);
  }
}

export default FileUploadService.getInstance();
