CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL CHECK (stock_quantity >= 0),
    category VARCHAR(255),
    brand VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE import_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_location TEXT NOT NULL,
    import_type VARCHAR(50) NOT NULL DEFAULT 'product_csv',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_records INTEGER NOT NULL DEFAULT 0,
    processed_records INTEGER NOT NULL DEFAULT 0,
    successful_records INTEGER NOT NULL DEFAULT 0,
    failed_records INTEGER NOT NULL DEFAULT 0,
    progress_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    column_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    failure_message TEXT
);

CREATE TABLE failed_records (
    id SERIAL PRIMARY KEY,
    import_job_id INTEGER NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    csv_row_number INTEGER NOT NULL,
    original_row_data JSONB NOT NULL,
    mapped_product_data JSONB,
    error_code VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    retry_status VARCHAR(50) NOT NULL DEFAULT 'not_retried',
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_retry_date TIMESTAMP
);

CREATE INDEX idx_products_status
    ON products(status);

CREATE INDEX idx_products_created_at
    ON products(created_at);

CREATE INDEX idx_import_jobs_status
    ON import_jobs(status);

CREATE INDEX idx_failed_records_import_job_id
    ON failed_records(import_job_id);