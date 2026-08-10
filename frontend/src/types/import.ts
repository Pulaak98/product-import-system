export interface CsvPreviewRow {
  [key: string]: string;
}

export interface CsvUploadResponse {
  fileId: string;
  originalFileName: string;
  fileSize: number;
  headers: string[];
  previewRows: CsvPreviewRow[];
}