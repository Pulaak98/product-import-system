import { useRef, useState } from 'react';
import { uploadCsv } from '../services/import.service';
import type { CsvUploadResponse } from '../types/import';

interface ImportModalProps {
  onClose: () => void;
}

function ImportModal({ onClose }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] =
    useState<CsvUploadResponse | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  async function handleFile(file: File) {
    setError('');
    setUploadResult(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV files are supported.');
      return;
    }

    if (file.size === 0) {
      setError('The CSV file is empty.');
      return;
    }

    try {
      setUploading(true);

      const result = await uploadCsv(file);

      setUploadResult(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to upload CSV file.',
      );
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (file) {
      handleFile(file);
    }
  }

  function handleDrop(
    event: React.DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();

    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleFile(file);
    }
  }

  function handleDragOver(
    event: React.DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function handleRemoveFile() {
    setUploadResult(null);
    setError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="border-b border-neutral-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">
                Import Products
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Upload a CSV file to begin importing products.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              ×
            </button>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white">
                1
              </span>

              <span className="text-sm font-medium text-neutral-900">
                Browse File
              </span>
            </div>

            <div className="h-px flex-1 bg-neutral-200" />

            <div className="flex items-center gap-2 text-neutral-400">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 text-xs">
                2
              </span>

              <span className="text-sm">
                Map Columns
              </span>
            </div>

            <div className="h-px flex-1 bg-neutral-200" />

            <div className="flex items-center gap-2 text-neutral-400">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 text-xs">
                3
              </span>

              <span className="text-sm">
                Preview
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!uploadResult && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() =>
                fileInputRef.current?.click()
              }
              className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition ${
                isDragging
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-300 hover:border-neutral-500 hover:bg-neutral-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-2xl">
                ↑
              </div>

              <h3 className="mt-4 font-medium text-neutral-900">
                Drag and drop your CSV file here
              </h3>

              <p className="mt-1 text-sm text-neutral-500">
                or click to browse files from your computer
              </p>

              <p className="mt-4 text-xs text-neutral-400">
                CSV files only · Maximum size 10 MB
              </p>
            </div>
          )}

          {uploading && (
            <div className="mt-5 rounded-lg bg-neutral-50 p-4 text-center text-sm text-neutral-600">
              Uploading and inspecting CSV file...
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {uploadResult && (
            <div className="space-y-5">
              <div className="rounded-xl border border-neutral-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {uploadResult.originalFileName}
                    </p>

                    <p className="mt-1 text-sm text-neutral-500">
                      {formatFileSize(
                        uploadResult.fileSize,
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-neutral-900">
                  Detected CSV columns
                </h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  {uploadResult.headers.map(
                    (header) => (
                      <span
                        key={header}
                        className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700"
                      >
                        {header}
                      </span>
                    ),
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-neutral-900">
                    Sample data
                  </h3>

                  <span className="text-xs text-neutral-500">
                    Showing up to 20 rows
                  </span>
                </div>

                <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-neutral-50">
                      <tr>
                        {uploadResult.headers.map(
                          (header) => (
                            <th
                              key={header}
                              className="whitespace-nowrap px-4 py-3 font-medium text-neutral-700"
                            >
                              {header}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-neutral-100">
                      {uploadResult.previewRows.map(
                        (row, index) => (
                          <tr key={index}>
                            {uploadResult.headers.map(
                              (header) => (
                                <td
                                  key={header}
                                  className="whitespace-nowrap px-4 py-3 text-neutral-600"
                                >
                                  {row[header] || '-'}
                                </td>
                              ),
                            )}
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!uploadResult || uploading}
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportModal;