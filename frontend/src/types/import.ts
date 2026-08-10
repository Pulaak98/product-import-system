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

export interface ImportJob {
  id: number;
  user_id: number | null;
  original_file_name: string;
  stored_file_location: string;
  import_type: string;
  status: string;
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  progress_percentage: number | string;
  column_mappings: Record<string, string>;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
  failure_message: string | null;
}

export interface CreateImportJobResponse {
  message: string;
  job: ImportJob;
}