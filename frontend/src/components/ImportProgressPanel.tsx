import {
  useEffect,
  useState,
} from "react";

import {
  downloadFailedImportRecords,
  getFailedImportRecords,
  getImportProgress,
  retryAllFailedImportRecords,
  retryFailedImportRecord,
} from "../services/import.service";

import type {
  FailedImportRecord,
} from "../services/import.service";

import type {
  ImportJobProgress,
} from "../types/import";

interface ImportProgressPanelProps {
  jobId: number;
  onClose: () => void;
}

function ImportProgressPanel({
  jobId,
  onClose,
}: ImportProgressPanelProps) {
  const [
    progress,
    setProgress,
  ] =
    useState<ImportJobProgress | null>(
      null,
    );

  const [
    failedRecords,
    setFailedRecords,
  ] =
    useState<FailedImportRecord[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    loadingFailedRecords,
    setLoadingFailedRecords,
  ] =
    useState(false);

  const [
    downloading,
    setDownloading,
  ] =
    useState(false);

  const [
    retryingRecordId,
    setRetryingRecordId,
  ] =
    useState<number | null>(null);

  const [
    retryingAll,
    setRetryingAll,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    failedRecordsError,
    setFailedRecordsError,
  ] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      try {
        const result =
          await getImportProgress(
            jobId,
          );

        if (!cancelled) {
          setProgress(result);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load import progress.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function loadFailedRecords() {
    try {
      setLoadingFailedRecords(
        true,
      );
      setFailedRecordsError("");

      const records =
        await getFailedImportRecords(
          jobId,
        );

      setFailedRecords(records);
    } catch (err) {
      setFailedRecordsError(
        err instanceof Error
          ? err.message
          : "Failed to load failed records.",
      );
    } finally {
      setLoadingFailedRecords(
        false,
      );
    }
  }

  useEffect(() => {
    if (!progress) {
      return;
    }

    if (progress.failedRecords > 0) {
      void loadFailedRecords();
    } else {
      setFailedRecords([]);
    }
  }, [
    jobId,
    progress?.failedRecords,
  ]);

  useEffect(() => {
    if (!progress) {
      return;
    }

    const isTerminal =
      progress.status === "completed" ||
      progress.status ===
        "completed_with_errors" ||
      progress.status === "failed";

    if (isTerminal) {
      return;
    }

    const interval =
      window.setInterval(
        async () => {
          try {
            const result =
              await getImportProgress(
                jobId,
              );

            setProgress(result);
            setError("");
          } catch {
            // Keep existing progress visible.
          }
        },
        1000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    jobId,
    progress?.status,
  ]);

  useEffect(() => {
    if (!progress) {
      return;
    }

    const isTerminal =
      progress.status === "completed" ||
      progress.status ===
        "completed_with_errors" ||
      progress.status === "failed";

    if (isTerminal) {
      return;
    }

    const apiBaseUrl =
      import.meta.env.VITE_API_URL ??
      "http://localhost:3000";

    const eventSource =
      new EventSource(
        `${apiBaseUrl}/imports/${jobId}/progress/stream`,
      );

    const updateProgress = (
      event: MessageEvent,
    ) => {
      try {
        const data =
          JSON.parse(
            event.data,
          );

        if (
          data &&
          typeof data ===
            "object"
        ) {
          setProgress(
            (current) =>
              ({
                ...(current ?? {}),
                ...data,
              }) as ImportJobProgress,
          );
        }
      } catch {
        // Ignore malformed SSE messages.
      }
    };

    eventSource.addEventListener(
      "import.queued",
      updateProgress,
    );

    eventSource.addEventListener(
      "import.started",
      updateProgress,
    );

    eventSource.addEventListener(
      "import.progress",
      updateProgress,
    );

    eventSource.addEventListener(
      "import.record_failed",
      updateProgress,
    );

    eventSource.addEventListener(
      "import.completed",
      updateProgress,
    );

    eventSource.addEventListener(
      "import.failed",
      updateProgress,
    );

    eventSource.onerror = () => {
      // Browser reconnects automatically.
    };

    return () => {
      eventSource.close();
    };
  }, [
    jobId,
    progress?.status,
  ]);

  async function refreshProgress() {
    try {
      const result =
        await getImportProgress(
          jobId,
        );

      setProgress(result);

      if (
        result.failedRecords > 0
      ) {
        await loadFailedRecords();
      } else {
        setFailedRecords([]);
      }
    } catch {
      // Keep current UI state.
    }
  }

  async function handleDownloadFailedRecords() {
    try {
      setDownloading(true);
      setError("");

      await downloadFailedImportRecords(
        jobId,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to download failed records.",
      );
    } finally {
      setDownloading(false);
    }
  }

  async function handleRetryRecord(
    recordId: number,
  ) {
    try {
      setRetryingRecordId(
        recordId,
      );
      setError("");

      await retryFailedImportRecord(
        jobId,
        recordId,
      );

      await refreshProgress();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to retry import record.",
      );
    } finally {
      setRetryingRecordId(
        null,
      );
    }
  }

  async function handleRetryAll() {
    try {
      setRetryingAll(true);
      setError("");

      await retryAllFailedImportRecords(
        jobId,
      );

      await refreshProgress();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to retry failed records.",
      );
    } finally {
      setRetryingAll(false);
    }
  }

  function getStatusLabel(
    status: string,
  ) {
    switch (status) {
      case "pending":
        return "Waiting to start";

      case "processing":
        return "Processing";

      case "completed":
        return "Completed";

      case "completed_with_errors":
        return "Completed with errors";

      case "failed":
        return "Failed";

      default:
        return status;
    }
  }

  function getStatusClass(
    status: string,
  ) {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 ring-1 ring-green-200";

      case "completed_with_errors":
        return "bg-orange-100 text-orange-700 ring-1 ring-orange-200";

      case "failed":
        return "bg-red-100 text-red-700 ring-1 ring-red-200";

      case "processing":
        return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";

      case "pending":
        return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";

      default:
        return "bg-neutral-100 text-neutral-700";
    }
  }

  function getProgressBarClass(
    status: string,
  ) {
    switch (status) {
      case "completed":
        return "bg-gradient-to-r from-green-500 to-emerald-400";

      case "completed_with_errors":
        return "bg-gradient-to-r from-orange-500 to-amber-400";

      case "failed":
        return "bg-gradient-to-r from-red-500 to-rose-400";

      case "processing":
        return "bg-gradient-to-r from-blue-500 to-cyan-400";

      case "pending":
        return "bg-gradient-to-r from-amber-400 to-yellow-300";

      default:
        return "bg-neutral-400";
    }
  }

  function getProgressBackgroundClass(
    status: string,
  ) {
    switch (status) {
      case "completed":
        return "bg-green-50";

      case "completed_with_errors":
        return "bg-orange-50";

      case "failed":
        return "bg-red-50";

      case "processing":
        return "bg-blue-50";

      default:
        return "bg-neutral-100";
    }
  }

  function getRawDataPreview(
    record: FailedImportRecord,
  ) {
    if (!record.rawData) {
      return null;
    }

    const entries =
      Object.entries(
        record.rawData,
      ).slice(0, 4);

    if (entries.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
        {entries.map(
          ([key, value]) => (
            <span key={key}>
              <span className="font-medium text-neutral-600">
                {key}:
              </span>{" "}
              {String(value ?? "-")}
            </span>
          ),
        )}
      </div>
    );
  }

  const percentage =
    progress
      ? Math.min(
          Math.max(
            progress.progressPercentage,
            0,
          ),
          100,
        )
      : 0;

  const hasFailedRecords =
    (progress?.failedRecords ??
      0) > 0 ||
    failedRecords.length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">
              Import Progress
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Job #{jobId}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xl text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          >
            ×
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {loading && (
            <div className="py-10 text-center text-sm text-neutral-500">
              Loading import progress...
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {progress && !loading && (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-neutral-900">
                    {progress.fileName}
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    {progress.processedRecords}{" "}
                    of{" "}
                    {progress.totalRecords}{" "}
                    records processed
                  </p>
                </div>

                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClass(
                    progress.status,
                  )}`}
                >
                  {getStatusLabel(
                    progress.status,
                  )}
                </span>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-600">
                    Progress
                  </span>

                  <span
                    className={`font-bold ${
                      progress.status ===
                      "completed"
                        ? "text-green-600"
                        : progress.status ===
                            "completed_with_errors"
                          ? "text-orange-600"
                          : progress.status ===
                              "failed"
                            ? "text-red-600"
                            : "text-neutral-900"
                    }`}
                  >
                    {
                      progress.progressPercentage
                    }
                    %
                  </span>
                </div>

                <div
                  className={`h-4 overflow-hidden rounded-full ${getProgressBackgroundClass(
                    progress.status,
                  )}`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressBarClass(
                      progress.status,
                    )}`}
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs text-neutral-500">
                    Processed
                  </p>

                  <p className="mt-1 text-xl font-bold text-neutral-900">
                    {
                      progress.processedRecords
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-medium text-green-700">
                    Successful
                  </p>

                  <p className="mt-1 text-xl font-bold text-green-700">
                    {
                      progress.successfulRecords
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-xs font-medium text-orange-700">
                    Failed
                  </p>

                  <p className="mt-1 text-xl font-bold text-orange-700">
                    {
                      progress.failedRecords
                    }
                  </p>
                </div>
              </div>

              {progress.failureMessage && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {
                    progress.failureMessage
                  }
                </div>
              )}

              {hasFailedRecords && (
                <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50/40 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-neutral-900">
                        Failed Records
                      </h3>

                      <p className="mt-1 text-sm text-neutral-500">
                        {
                          progress.failedRecords
                        }{" "}
                        record
                        {progress.failedRecords ===
                        1
                          ? ""
                          : "s"}{" "}
                        could not be imported.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void handleDownloadFailedRecords()
                        }
                        disabled={
                          downloading ||
                          loadingFailedRecords
                        }
                        className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {downloading
                          ? "Downloading..."
                          : "Download Failed Records"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleRetryAll()
                        }
                        disabled={
                          retryingAll ||
                          retryingRecordId !==
                            null ||
                          failedRecords.length ===
                            0
                        }
                        className="rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {retryingAll
                          ? "Retrying..."
                          : "Retry All"}
                      </button>
                    </div>
                  </div>

                  {failedRecordsError && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {
                        failedRecordsError
                      }
                    </div>
                  )}

                  {loadingFailedRecords ? (
                    <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
                      Loading failed records...
                    </div>
                  ) : failedRecords.length ===
                    0 ? (
                    <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
                      No failed records to retry.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {failedRecords.map(
                        (record) => (
                          <div
                            key={
                              record.id
                            }
                            className="rounded-lg border border-neutral-200 bg-white p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-medium text-neutral-500">
                                    Record #
                                    {
                                      record.id
                                    }
                                  </span>

                                  {record.rowNumber !==
                                    null && (
                                    <span className="text-xs text-neutral-400">
                                      CSV row{" "}
                                      {
                                        record.rowNumber
                                      }
                                    </span>
                                  )}
                                </div>

                                <p className="mt-2 text-sm font-medium text-red-700">
                                  {
                                    record.errorMessage
                                  }
                                </p>

                                {getRawDataPreview(
                                  record,
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  void handleRetryRecord(
                                    record.id,
                                  )
                                }
                                disabled={
                                  retryingAll ||
                                  retryingRecordId !==
                                    null
                                }
                                className="shrink-0 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {retryingRecordId ===
                                record.id
                                  ? "Retrying..."
                                  : "Retry"}
                              </button>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}

              {progress.status ===
                "completed" && (
                <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                  Import completed successfully.
                </div>
              )}

              {progress.status ===
                "completed_with_errors" && (
                <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
                  Import completed, but some
                  records could not be
                  imported.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-neutral-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportProgressPanel;