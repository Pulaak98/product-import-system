# Background Product CSV Import System

A full-stack e-commerce product CSV import system built with **NestJS, React, PostgreSQL, Kysely, Docker, and Server-Sent Events (SSE)**.

The system allows users to upload product CSV files, map CSV columns, preview and validate records, submit imports as background jobs, monitor real-time progress, review failed records, retry failed records, and download failed records.

---

## Features

### Product Management

- View imported products
- Search products
- Paginate products
- Filter products by status
- Display:
  - Product name
  - SKU
  - Price
  - Stock quantity
  - Category
  - Status
  - Created date

### CSV Import Workflow

The import process uses a step-by-step workflow:

1. Browse File
2. Map Columns
3. Preview Data
4. Submit Import
5. Import Progress

### CSV Upload

- CSV-only validation
- File name and file size display
- Empty file validation
- Maximum file size validation
- File removal
- Drag-and-drop upload
- Browser file selection

### Column Mapping

Supports mapping CSV columns to:

- Product name
- SKU
- Description
- Price
- Stock quantity
- Category
- Brand
- Status

Required fields:

- Product name
- SKU
- Price

The system prevents:

- Duplicate column mappings
- Missing required mappings
- Invalid mapping configurations

### CSV Preview and Validation

Before submitting an import, records are validated and previewed.

Validation includes:

- Missing product name
- Missing SKU
- Invalid price
- Negative price
- Invalid stock quantity
- Negative stock quantity
- Invalid status
- Duplicate SKU within the uploaded file
- Missing required values

Invalid records do not stop valid records from being imported.

---

## Background Processing

Imports are processed asynchronously.

When an import is submitted:

1. The CSV file is stored.
2. An import job is created in PostgreSQL.
3. The API immediately returns the job identifier.
4. Background processing starts.
5. Records are processed individually.
6. Progress is persisted in PostgreSQL.
7. Failed records are stored separately.
8. Processing continues after individual record failures.
9. The frontend receives real-time progress through SSE.

The API request does **not** wait for the entire CSV import to finish.

---

## Import Job Tracking

Each import job tracks:

- Job ID
- User ID
- Original file name
- Stored file location
- Import type
- Import status
- Total records
- Processed records
- Successful records
- Failed records
- Progress percentage
- Column mappings
- Created date
- Started date
- Completed date
- Last updated date
- Failure message

Supported statuses include:

- Pending
- Queued
- Processing
- Completed
- Completed with failures
- Failed
- Cancelled

---

## Real-Time Progress

The frontend receives import updates using **Server-Sent Events (SSE)**.

The SSE stream provides updates for events such as:

- `import.queued`
- `import.started`
- `import.progress`
- `import.record_failed`
- `import.completed`
- `import.failed`

Progress information includes:

- Import status
- Total records
- Processed records
- Successful records
- Failed records
- Progress percentage
- Updated timestamp

The frontend also polls the progress API as a fallback and reconnects automatically if the SSE connection is interrupted.

Import processing continues independently of the frontend.

Closing the import modal or browser does not stop the background import.

---

## Failed Records

Failed records are stored separately from the import job.

The failed-record interface provides:

- CSV row number
- SKU
- Product name
- Error message
- Retry status
- Retry count
- Original row data
- Validation errors

### Failed Record Actions

Users can:

- View failed record details
- Retry an individual failed record
- Retry all failed records
- Download failed records as CSV

Retry processing is asynchronous and does not stop other failed records from being retried.

Retry information includes:

- Retry status
- Retry count
- Latest error message
- Last retry date
- Updated success/failure counters

---

## Import History

Previous imports can be reviewed through the import jobs/history interface.

The history provides:

- File name
- Import status
- Total records
- Successful records
- Failed records
- Start time
- Completion time
- Import details
- Progress
- Failed records
- Retry actions
- Failed-record download

---

## API Endpoints

### Import

| Method | Endpoint                       | Description                       |
| ------ | ------------------------------ | --------------------------------- |
| `POST` | `/imports/upload`              | Upload a CSV file                 |
| `POST` | `/imports/jobs`                | Create/start an import job        |
| `GET`  | `/imports/jobs`                | Retrieve import history           |
| `GET`  | `/imports/jobs/:id`            | Retrieve import job details       |
| `GET`  | `/imports/:id/progress`        | Retrieve latest import progress   |
| `GET`  | `/imports/:id/progress/stream` | Subscribe to progress through SSE |

### Failed Records

| Method | Endpoint                                           | Description                    |
| ------ | -------------------------------------------------- | ------------------------------ |
| `GET`  | `/imports/jobs/:id/failed-records`                 | Retrieve failed records        |
| `POST` | `/imports/jobs/:id/failed-records/:recordId/retry` | Retry one failed record        |
| `POST` | `/imports/jobs/:id/failed-records/retry-all`       | Retry all failed records       |
| `GET`  | `/imports/jobs/:id/failed-records/download`        | Download failed records as CSV |

---

## Import Rules

The system enforces the following rules:

- SKU must be unique.
- Product name is required.
- SKU is required.
- Price is required.
- Price must be a valid non-negative number.
- Stock quantity must be a valid non-negative integer.
- Status must use a supported value.
- Empty CSV rows are ignored.
- Unexpected CSV columns do not break the import.
- Duplicate SKUs are rejected and stored as failed records.
- Invalid records are stored as failed records.
- Valid records continue to be imported even when other records fail.

A single failed record never stops the complete import job.

---

## Error Handling

The application handles:

- Invalid CSV files
- Empty CSV files
- Missing CSV headers
- Missing required mappings
- Invalid field values
- Duplicate SKUs
- Database errors
- Background processing errors
- Unexpected application errors
- SSE connection interruptions

User-facing errors are returned without exposing internal stack traces.

---

## Technology Stack

### Backend

- NestJS
- TypeScript
- PostgreSQL
- Kysely
- Node.js
- `csv-parse`
- `cron`
- Class Validator
- Class Transformer

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Fetch API
- Server-Sent Events

### Infrastructure

- Docker
- Docker Compose
- PostgreSQL 17

---

## Project Structure

```text
product-import/
│
├── backend/
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env.example
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

### Running the Project

- Clone Repository
- git clone <repository-url>
- cd product-import-system

### Start Application

- docker compose up --build

## The services will start:

- Frontend: http://localhost:5173
- backend API: http://localhost:3000
- Database: PostgreSQL : 5432