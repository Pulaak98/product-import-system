import type {
  CsvUploadResponse,
  CreateImportJobResponse,
  ImportJobProgress,
} from "../types/import";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3000";

export interface FailedImportRecord {
  id: number;
  rowNumber: number | null;
  errorMessage: string;
  rawData: Record<string, unknown> | null;
}

export async function uploadCsv(
  file: File,
): Promise<CsvUploadResponse> {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/imports/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const message =
      await getErrorMessage(response);

    throw new Error(
      message ||
        "Failed to upload CSV file.",
    );
  }

  return response.json();
}

export async function createImportJob(
  fileId: string,
  originalFileName: string,
  columnMappings: Record<string, string>,
): Promise<CreateImportJobResponse> {
  const response = await fetch(
    `${API_BASE_URL}/imports/jobs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileId,
        originalFileName,
        columnMappings,
      }),
    },
  );

  if (!response.ok) {
    const message =
      await getErrorMessage(response);

    throw new Error(
      message ||
        "Failed to create import job.",
    );
  }

  return response.json();
}

export async function getImportJobs(): Promise<
  ImportJobProgress[]
> {
  const response = await fetch(
    `${API_BASE_URL}/imports/jobs?limit=50`,
  );

  if (!response.ok) {
    const message =
      await getErrorMessage(response);

    throw new Error(
      message ||
        "Failed to load import jobs.",
    );
  }

  return response.json();
}

export async function getImportProgress(
  jobId: number,
): Promise<ImportJobProgress> {
  const response = await fetch(
    `${API_BASE_URL}/imports/${jobId}/progress`,
  );

  if (!response.ok) {
    const message =
      await getErrorMessage(response);

    throw new Error(
      message ||
        "Failed to load import progress.",
    );
  }

  return response.json();
}

export async function getFailedImportRecords(
  jobId: number,
): Promise<FailedImportRecord[]> {
  const response = await fetch(
    `${API_BASE_URL}/imports/jobs/${jobId}/failed-records`,
  );

  if (!response.ok) {
    const message =
      await getErrorMessage(response);

    throw new Error(
      message ||
        "Failed to load failed import records.",
    );
  }

  const body: unknown =
    await response.json();

  return normalizeFailedRecords(body);
}

export async function retryFailedImportRecord(
  jobId: number,
  recordId: number,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/imports/jobs/${jobId}/failed-records/${recordId}/retry`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const message =
      await getErrorMessage(response);

    throw new Error(
      message ||
        "Failed to retry import record.",
    );
  }
}

export async function retryAllFailedImportRecords(
  jobId: number,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/imports/jobs/${jobId}/failed-records/retry-all`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const message =
      await getErrorMessage(response);

    throw new Error(
      message ||
        "Failed to retry failed import records.",
    );
  }
}

export async function downloadFailedImportRecords(
  jobId: number,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/imports/jobs/${jobId}/failed-records/download`,
  );

  if (!response.ok) {
    const message =
      await getErrorMessage(response);

    throw new Error(
      message ||
        "Failed to download failed records.",
    );
  }

  const blob =
    await response.blob();

  const contentDisposition =
    response.headers.get(
      "Content-Disposition",
    );

  const fileName =
    getFileNameFromContentDisposition(
      contentDisposition,
    ) ??
    `import-job-${jobId}-failed-records.csv`;

  const url =
    window.URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();

  link.remove();

  window.URL.revokeObjectURL(url);
}

function normalizeFailedRecords(
  body: unknown,
): FailedImportRecord[] {
  let records: unknown[] = [];

  if (Array.isArray(body)) {
    records = body;
  } else if (
    body &&
    typeof body === "object"
  ) {
    const value =
      body as Record<string, unknown>;

    if (Array.isArray(value.data)) {
      records = value.data;
    } else if (
      Array.isArray(value.records)
    ) {
      records = value.records;
    } else if (
      Array.isArray(value.failedRecords)
    ) {
      records =
        value.failedRecords;
    }
  }

  return records
    .map(
      (record): FailedImportRecord | null => {
        if (
          !record ||
          typeof record !== "object"
        ) {
          return null;
        }

        const value =
          record as Record<
            string,
            unknown
          >;

        const id =
          toNumber(
            value.id ??
              value.recordId ??
              value.record_id,
          );

        if (id === null) {
          return null;
        }

        return {
          id,
          rowNumber:
            toNumber(
              value.rowNumber ??
                value.row_number ??
                value.row,
            ),
          errorMessage:
            String(
              value.errorMessage ??
                value.error_message ??
                value.error ??
                value.failureMessage ??
                "Import failed.",
            ),
          rawData:
            isRecord(
              value.rawData,
            )
              ? value.rawData
              : isRecord(
                    value.raw_data,
                  )
                ? value.raw_data
                : isRecord(
                      value.data,
                    )
                  ? value.data
                  : null,
        };
      },
    )
    .filter(
      (
        record,
      ): record is FailedImportRecord =>
        record !== null,
    );
}

function toNumber(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    const parsed =
      Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function getFileNameFromContentDisposition(
  header: string | null,
): string | null {
  if (!header) {
    return null;
  }

  const utf8Match =
    header.match(
      /filename\*=UTF-8''([^;]+)/i,
    );

  if (utf8Match?.[1]) {
    return decodeURIComponent(
      utf8Match[1].replace(
        /^["']|["']$/g,
        "",
      ),
    );
  }

  const normalMatch =
    header.match(
      /filename="?([^"]+)"?/i,
    );

  return normalMatch?.[1] ?? null;
}

async function getErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const body =
      await response.json();

    if (
      Array.isArray(
        body?.message,
      )
    ) {
      return body.message.join(
        ", ",
      );
    }

    if (
      typeof body?.message ===
      "string"
    ) {
      return body.message;
    }
  } catch {
    // Ignore invalid JSON.
  }

  return "";
}