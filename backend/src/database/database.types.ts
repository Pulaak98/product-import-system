import { Generated } from 'kysely';

export interface Database {
  products: ProductsTable;
  import_jobs: ImportJobsTable;
  failed_records: FailedRecordsTable;
}

export interface ProductsTable {
  id: Generated<number>;
  name: string;
  sku: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  category: string | null;
  brand: string | null;
  status: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ImportJobsTable {
  id: Generated<number>;
  user_id: number | null;
  original_file_name: string;
  stored_file_location: string;
  import_type: string;
  status: string;
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  progress_percentage: number;
  column_mappings: unknown;
  created_at: Generated<Date>;
  started_at: Date | null;
  completed_at: Date | null;
  updated_at: Generated<Date>;
  failure_message: string | null;
}

export interface FailedRecordsTable {
  id: Generated<number>;
  import_job_id: number;
  csv_row_number: number;
  original_row_data: unknown;
  mapped_product_data: unknown;
  error_code: string;
  error_message: string;
  retry_status: string;
  retry_count: number;
  created_at: Generated<Date>;
  last_retry_date: Date | null;
}