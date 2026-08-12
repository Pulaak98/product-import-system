import type {
  CsvUploadResponse,
  CreateImportJobResponse,
  ImportJobProgress,
} from "../types/import";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3000";

export async function uploadCsv(
  file: File,
): Promise<CsvUploadResponse> {
  const formData =
    new FormData();

  formData.append(
    "file",
    file,
  );

  const response =
    await fetch(
      `${API_BASE_URL}/imports/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

  if (!response.ok) {
    const message =
      await getErrorMessage(
        response,
      );

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
  columnMappings: Record<
    string,
    string
  >,
): Promise<CreateImportJobResponse> {
  const response =
    await fetch(
      `${API_BASE_URL}/imports/jobs`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
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
      await getErrorMessage(
        response,
      );

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
  const response =
    await fetch(
      `${API_BASE_URL}/imports/jobs?limit=50`,
    );

  if (!response.ok) {
    const message =
      await getErrorMessage(
        response,
      );

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
  const response =
    await fetch(
      `${API_BASE_URL}/imports/${jobId}/progress`,
    );

  if (!response.ok) {
    const message =
      await getErrorMessage(
        response,
      );

    throw new Error(
      message ||
        "Failed to load import progress.",
    );
  }

  return response.json();
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