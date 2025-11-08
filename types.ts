export interface FirmTemplate {
  id: string;
  name: string;
  templateText: string;
  description?: string;
  createdAt: number;
}

export interface UploadedFile {
  file: File;
  id: string;
  previewUrl?: string;
  base64?: string;
  mimeType?: string;
}

export interface GenerationResult {
  fullText: string;
  extractedData?: {
    vmd?: string;
    goods?: string[];
    uktzied?: string[];
    quantity?: string;
    appendixNumber?: string;
    appendixDate?: string;
  };
}
