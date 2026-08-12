import type {
  CsvUploadResponse,
  CreateImportJobResponse,
  ImportProgress,
} from "../types/import";

const API_URL = "http://localhost:3000";

export async function uploadCsv(
  file: File,
): Promise<CsvUploadResponse> {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/imports/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to upload CSV file.",
    );
  }

  return data;
}

export async function createImportJob(
  fileId: string,
  originalFileName: string,
  columnMappings: Record<string, string>,
): Promise<CreateImportJobResponse> {
  const response = await fetch(
    `${API_URL}/imports/jobs`,
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to create import job.",
    );
  }

  return data;
}

export async function getImportProgress(
  jobId: number,
): Promise<ImportProgress> {
  const response = await fetch(
    `${API_URL}/imports/${jobId}/progress`,
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to get import progress.",
    );
  }

  return data;
}

export function subscribeToImportProgress(
  jobId: number,
  onProgress: (progress: ImportProgress) => void,
  onError?: () => void,
): () => void {
  const eventSource = new EventSource(
    `${API_URL}/imports/${jobId}/progress/stream`,
  );

  const handleEvent = (event: Event) => {
    try {
      const messageEvent =
        event as MessageEvent;

      const progress =
        JSON.parse(
          messageEvent.data,
        ) as ImportProgress;

      onProgress(progress);

      if (
        progress.status === "completed" ||
        progress.status ===
          "completed_with_errors" ||
        progress.status === "failed"
      ) {
        eventSource.close();
      }
    } catch {
      // Ignore malformed SSE messages.
    }
  };

  /*
   * Listen to all named import events.
   */
  const eventTypes = [
    "import.queued",
    "import.started",
    "import.progress",
    "import.record_failed",
    "import.completed",
    "import.failed",
  ];

  eventTypes.forEach((eventType) => {
    eventSource.addEventListener(
      eventType,
      handleEvent,
    );
  });

  /*
   * Also support normal unnamed SSE messages.
   */
  eventSource.onmessage = handleEvent;

  eventSource.onerror = () => {
    eventSource.close();
    onError?.();
  };

  return () => {
    eventTypes.forEach((eventType) => {
      eventSource.removeEventListener(
        eventType,
        handleEvent,
      );
    });

    eventSource.close();
  };
}