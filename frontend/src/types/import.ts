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

export interface CreateImportJobResponse {
  message: string;
  job: {
    id: number;
    original_file_name: string;
    status: string;
    total_records: number;
    processed_records: number;
    successful_records: number;
    failed_records: number;
    progress_percentage: number;
  };
}