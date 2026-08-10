import type { CsvUploadResponse } from '../types/import';

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
      data.message || 'Failed to upload CSV file.',
    );
  }

  return data;
}