import type {
  CreateImportJobResponse,
  CsvUploadResponse,
} from '../types/import';

const API_URL = 'http://localhost:3000';

export async function uploadCsv(
  file: File,
): Promise<CsvUploadResponse> {
  const formData = new FormData();

  formData.append('file', file);

  const response = await fetch(
    `${API_URL}/imports/upload`,
    {
      method: 'POST',
      body: formData,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Failed to upload CSV file.',
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
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    const message = Array.isArray(data.message)
      ? data.message[0]
      : data.message;

    throw new Error(
      message ||
        'Failed to create import job.',
    );
  }

  return data;
}

export async function getImportJob(
  id: number,
) {
  const response = await fetch(
    `${API_URL}/imports/jobs/${id}`,
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Failed to get import job.',
    );
  }

  return data;
}