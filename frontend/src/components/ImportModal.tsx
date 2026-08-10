import { useRef, useState } from 'react';
import { uploadCsv } from '../services/import.service';
import type { CsvPreviewRow, CsvUploadResponse } from '../types/import';

interface ImportModalProps {
  onClose: () => void;
}

type ImportStep = 1 | 2;

interface ProductField {
  key: string;
  label: string;
  required: boolean;
}

const PRODUCT_FIELDS: ProductField[] = [
  { key: 'name', label: 'Product Name', required: true },
  { key: 'sku', label: 'SKU', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'price', label: 'Price', required: true },
  { key: 'stock_quantity', label: 'Stock Quantity', required: false },
  { key: 'category', label: 'Category', required: false },
  { key: 'brand', label: 'Brand', required: false },
  { key: 'status', label: 'Status', required: false },
];

const FIELD_ALIASES: Record<string, string[]> = {
  name: [
    'name',
    'product_name',
    'product name',
    'product',
    'title',
  ],
  sku: ['sku', 'product_sku', 'product sku'],
  description: ['description', 'product_description'],
  price: [
    'price',
    'unit_price',
    'unit price',
    'product_price',
    'product price',
  ],
  stock_quantity: [
    'stock',
    'stock_quantity',
    'stock quantity',
    'quantity',
    'qty',
  ],
  category: ['category', 'category_name', 'category name'],
  brand: ['brand', 'brand_name', 'brand name'],
  status: ['status', 'product_status', 'product status'],
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function getSuggestedColumn(
  fieldKey: string,
  headers: string[],
): string {
  const aliases = FIELD_ALIASES[fieldKey] ?? [];

  const normalizedAliases = aliases.map(normalize);

  const exactMatch = headers.find((header) =>
    normalizedAliases.includes(normalize(header)),
  );

  if (exactMatch) {
    return exactMatch;
  }

  const partialMatch = headers.find((header) => {
    const normalizedHeader = normalize(header);

    return normalizedAliases.some(
      (alias) =>
        normalizedHeader.includes(alias) ||
        alias.includes(normalizedHeader),
    );
  });

  return partialMatch ?? '';
}

function ImportModal({ onClose }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>(1);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] =
    useState<CsvUploadResponse | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const [mappings, setMappings] = useState<
    Record<string, string>
  >({});

  async function handleFile(file: File) {
    setError('');
    setUploadResult(null);
    setMappings({});
    setStep(1);

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

      const suggestedMappings: Record<string, string> =
        {};

      PRODUCT_FIELDS.forEach((field) => {
        const suggestedColumn = getSuggestedColumn(
          field.key,
          result.headers,
        );

        if (suggestedColumn) {
          suggestedMappings[field.key] =
            suggestedColumn;
        }
      });

      setMappings(suggestedMappings);
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
    setMappings({});
    setStep(1);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleMappingChange(
    fieldKey: string,
    column: string,
  ) {
    setMappings((current) => ({
      ...current,
      [fieldKey]: column,
    }));

    setError('');
  }

  function getMappingErrors(): string[] {
    if (!uploadResult) {
      return [];
    }

    const errors: string[] = [];

    PRODUCT_FIELDS.forEach((field) => {
      if (
        field.required &&
        !mappings[field.key]
      ) {
        errors.push(
          `${field.label} is required and must be mapped.`,
        );
      }
    });

    const selectedColumns = Object.entries(mappings)
      .filter(([, column]) => column)
      .map(([, column]) => column);

    const duplicateColumns = selectedColumns.filter(
      (column, index) =>
        selectedColumns.indexOf(column) !== index,
    );

    const uniqueDuplicateColumns = [
      ...new Set(duplicateColumns),
    ];

    uniqueDuplicateColumns.forEach((column) => {
      errors.push(
        `CSV column "${column}" can only be mapped once.`,
      );
    });

    return errors;
  }

  function canContinueToMapping(): boolean {
    return Boolean(uploadResult) && !uploading;
  }

  function canContinueFromMapping(): boolean {
    return getMappingErrors().length === 0;
  }

  function getSampleValue(column: string): string {
    if (!uploadResult || !column) {
      return '-';
    }

    const row = uploadResult.previewRows[0];

    if (!row) {
      return '-';
    }

    return row[column] || '-';
  }

  function handleContinue() {
    if (step === 1) {
      if (!canContinueToMapping()) {
        return;
      }

      setError('');
      setStep(2);
      return;
    }

    const mappingErrors = getMappingErrors();

    if (mappingErrors.length > 0) {
      setError(mappingErrors[0]);
      return;
    }

    setError('');

    // Step 3 will be implemented in the next milestone.
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="border-b border-neutral-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">
                Import Products
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Upload and prepare your product CSV.
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
            <div
              className={`flex items-center gap-2 ${
                step >= 1
                  ? 'text-neutral-900'
                  : 'text-neutral-400'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  step >= 1
                    ? 'bg-neutral-900 text-white'
                    : 'border border-neutral-300'
                }`}
              >
                1
              </span>

              <span className="text-sm font-medium">
                Browse File
              </span>
            </div>

            <div
              className={`h-px flex-1 ${
                step >= 2
                  ? 'bg-neutral-900'
                  : 'bg-neutral-200'
              }`}
            />

            <div
              className={`flex items-center gap-2 ${
                step >= 2
                  ? 'text-neutral-900'
                  : 'text-neutral-400'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  step >= 2
                    ? 'bg-neutral-900 text-white'
                    : 'border border-neutral-300'
                }`}
              >
                2
              </span>

              <span className="text-sm font-medium">
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
          {step === 1 && (
            <>
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
                    or click to browse files from your
                    computer
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
                            (
                              row: CsvPreviewRow,
                              index,
                            ) => (
                              <tr key={index}>
                                {uploadResult.headers.map(
                                  (header) => (
                                    <td
                                      key={header}
                                      className="whitespace-nowrap px-4 py-3 text-neutral-600"
                                    >
                                      {row[header] ||
                                        '-'}
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

              {error && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </>
          )}

          {step === 2 && uploadResult && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Map CSV Columns
                </h3>

                <p className="mt-1 text-sm text-neutral-500">
                  Match your CSV columns to the supported
                  product fields.
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-neutral-200">
                <div className="grid grid-cols-[1.2fr_1.5fr_1fr] gap-4 bg-neutral-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <div>Product Field</div>
                  <div>CSV Column</div>
                  <div>Sample Value</div>
                </div>

                <div className="divide-y divide-neutral-200">
                  {PRODUCT_FIELDS.map((field) => {
                    const selectedColumn =
                      mappings[field.key] ?? '';

                    return (
                      <div
                        key={field.key}
                        className="grid grid-cols-[1.2fr_1.5fr_1fr] items-center gap-4 px-5 py-4"
                      >
                        <div>
                          <div className="font-medium text-neutral-900">
                            {field.label}
                          </div>

                          <div className="mt-1 text-xs text-neutral-500">
                            {field.required
                              ? 'Required'
                              : 'Optional'}
                          </div>
                        </div>

                        <select
                          value={selectedColumn}
                          onChange={(event) =>
                            handleMappingChange(
                              field.key,
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-neutral-500"
                        >
                          <option value="">
                            Not mapped
                          </option>

                          {uploadResult.headers.map(
                            (header) => {
                              const usedByAnotherField =
                                Object.entries(
                                  mappings,
                                ).some(
                                  ([key, column]) =>
                                    key !== field.key &&
                                    column === header,
                                );

                              return (
                                <option
                                  key={header}
                                  value={header}
                                  disabled={
                                    usedByAnotherField
                                  }
                                >
                                  {header}
                                </option>
                              );
                            },
                          )}
                        </select>

                        <div className="truncate text-sm text-neutral-600">
                          {getSampleValue(
                            selectedColumn,
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-4">
          <div>
            {step === 2 && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep(1);
                }}
                className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={
                uploading ||
                (step === 1
                  ? !canContinueToMapping()
                  : !canContinueFromMapping())
              }
              onClick={handleContinue}
              className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportModal;