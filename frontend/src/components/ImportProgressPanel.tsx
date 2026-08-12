import { useEffect, useState } from "react";

import {
  getImportProgress,
  subscribeToImportProgress,
} from "../services/import.service";

import type { ImportProgress } from "../types/import";

interface ImportProgressPanelProps {
  jobId: number;
  onClose: () => void;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Waiting to start";

    case "processing":
      return "Importing products";

    case "completed":
      return "Import completed";

    case "completed_with_errors":
      return "Completed with errors";

    case "failed":
      return "Import failed";

    default:
      return status;
  }
}

function ImportProgressPanel({
  jobId,
  onClose,
}: ImportProgressPanelProps) {
  const [progress, setProgress] =
    useState<ImportProgress | null>(null);

  const [loading, setLoading] = useState(true);

  const [connectionError, setConnectionError] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setConnectionError(false);
    setProgress(null);

    /*
     * Subscribe first so we don't miss a live event
     * while fetching the current state.
     */
    const cleanup = subscribeToImportProgress(
      jobId,
      (data) => {
        if (!mounted) {
          return;
        }

        setProgress(data);
        setLoading(false);
        setConnectionError(false);
      },
      () => {
        if (!mounted) {
          return;
        }

        setConnectionError(true);
        setLoading(false);
      },
    );

    /*
     * Fetch the current database state immediately.
     *
     * This is important because the SSE Subject only
     * delivers events that happen after subscription.
     */
    async function loadCurrentProgress() {
      try {
        const currentProgress =
          await getImportProgress(jobId);

        if (!mounted) {
          return;
        }

        setProgress(currentProgress);
        setLoading(false);
        setConnectionError(false);
      } catch {
        if (!mounted) {
          return;
        }

        setLoading(false);
        setConnectionError(true);
      }
    }

    void loadCurrentProgress();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [jobId]);

  const percentage =
    progress?.progressPercentage ?? 0;

  const isCompleted =
    progress?.status === "completed";

  const completedWithErrors =
    progress?.status ===
    "completed_with_errors";

  const failed =
    progress?.status === "failed";

  const isFinished =
    isCompleted ||
    completedWithErrors ||
    failed;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-neutral-200 px-7 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
                    />
                  </svg>
                </div>

                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
                    Import Progress
                  </h2>

                  <p className="mt-1 text-sm text-neutral-500">
                    Job #{jobId}
                  </p>
                </div>
              </div>
            </div>

            {/* Close button is ALWAYS available */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Close import progress"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6l12 12M18 6 6 18"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-7 p-7">
          {/* Status */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-500">
                Current status
              </p>

              <p className="mt-1 text-lg font-semibold text-neutral-900">
                {loading && !progress
                  ? "Loading import status..."
                  : progress
                    ? getStatusLabel(progress.status)
                    : "Unable to load status"}
              </p>
            </div>

            <div
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                isCompleted
                  ? "bg-green-100 text-green-700"
                  : completedWithErrors
                    ? "bg-amber-100 text-amber-700"
                    : failed
                      ? "bg-red-100 text-red-700"
                      : progress?.status === "processing"
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-100 text-neutral-700"
              }`}
            >
              {progress
                ? getStatusLabel(progress.status)
                : "Loading"}
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">
                  Overall progress
                </p>
              </div>

              <span className="text-2xl font-bold text-neutral-900">
                {percentage}%
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  failed
                    ? "bg-red-500"
                    : completedWithErrors
                      ? "bg-amber-500"
                      : "bg-neutral-900"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, percentage),
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Total
              </p>

              <p className="mt-2 text-2xl font-semibold text-neutral-900">
                {progress?.totalRecords ?? "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Processed
              </p>

              <p className="mt-2 text-2xl font-semibold text-neutral-900">
                {progress?.processedRecords ?? "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-green-600">
                Successful
              </p>

              <p className="mt-2 text-2xl font-semibold text-green-700">
                {progress?.successfulRecords ?? "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-red-600">
                Failed
              </p>

              <p className="mt-2 text-2xl font-semibold text-red-700">
                {progress?.failedRecords ?? "-"}
              </p>
            </div>
          </div>

          {/* Loading */}
          {loading && !progress && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />

                <p className="text-sm text-neutral-600">
                  Loading current import status...
                </p>
              </div>
            </div>
          )}

          {/* Connection */}
          {connectionError && !isFinished && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-medium text-amber-800">
                Live progress connection was interrupted.
              </p>

              <p className="mt-1 text-xs text-amber-700">
                The import may still be processing in the
                background.
              </p>
            </div>
          )}

          {/* Completion */}
          {isCompleted && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                  ✓
                </div>

                <div>
                  <p className="font-semibold text-green-900">
                    Import completed successfully
                  </p>

                  <p className="mt-1 text-sm text-green-700">
                    All{" "}
                    {progress?.successfulRecords}{" "}
                    records were imported successfully.
                  </p>
                </div>
              </div>
            </div>
          )}

          {completedWithErrors && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                  !
                </div>

                <div>
                  <p className="font-semibold text-amber-900">
                    Import completed with errors
                  </p>

                  <p className="mt-1 text-sm text-amber-700">
                    {progress?.successfulRecords}{" "}
                    records succeeded and{" "}
                    {progress?.failedRecords}{" "}
                    records failed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {failed && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
                  ×
                </div>

                <div>
                  <p className="font-semibold text-red-900">
                    Import failed
                  </p>

                  <p className="mt-1 text-sm text-red-700">
                    The processor could not complete this
                    import.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              {isFinished ? "Done" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportProgressPanel;