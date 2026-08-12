import { Injectable } from "@nestjs/common";
import { Subject } from "rxjs";

export interface ImportProgressData {
  jobId: number;
  status: string;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  progressPercentage: number;
  updatedAt: string;
}

export interface ImportProgressEvent {
  type:
    | "import.queued"
    | "import.started"
    | "import.progress"
    | "import.record_failed"
    | "import.completed"
    | "import.failed";

  data:
    | ImportProgressData
    | string
    | Record<string, unknown>;
}

@Injectable()
export class ImportProgressService {
  private readonly streams = new Map<
    number,
    Subject<ImportProgressEvent>
  >();

  private getStream(
    jobId: number,
  ): Subject<ImportProgressEvent> {
    let stream = this.streams.get(jobId);

    if (!stream) {
      stream =
        new Subject<ImportProgressEvent>();

      this.streams.set(jobId, stream);
    }

    return stream;
  }

  subscribe(jobId: number) {
    return this.getStream(jobId).asObservable();
  }

  emitQueued(
    dataOrJobId: ImportProgressData | number,
    message?: string,
  ) {
    this.emit(
      "import.queued",
      dataOrJobId,
      message,
    );
  }

  emitStarted(
    dataOrJobId: ImportProgressData | number,
    message?: string,
  ) {
    this.emit(
      "import.started",
      dataOrJobId,
      message,
    );
  }

  emitProgress(
    dataOrJobId: ImportProgressData | number,
    message?: string,
  ) {
    this.emit(
      "import.progress",
      dataOrJobId,
      message,
    );
  }

  emitRecordFailed(
    dataOrJobId: ImportProgressData | number,
    message?: string,
  ) {
    this.emit(
      "import.record_failed",
      dataOrJobId,
      message,
    );
  }

  emitCompleted(
    dataOrJobId: ImportProgressData | number,
    message?: string,
  ) {
    this.emit(
      "import.completed",
      dataOrJobId,
      message,
    );
  }

  emitFailed(
    dataOrJobId: ImportProgressData | number,
    message?: string,
  ) {
    this.emit(
      "import.failed",
      dataOrJobId,
      message,
    );
  }

  private emit(
    type: ImportProgressEvent["type"],
    dataOrJobId: ImportProgressData | number,
    message?: string,
  ) {
    if (typeof dataOrJobId === "number") {
      this.getStream(dataOrJobId).next({
        type,
        data: message ?? {},
      });

      return;
    }

    this.getStream(dataOrJobId.jobId).next({
      type,
      data: dataOrJobId,
    });
  }

  close(jobId: number) {
    const stream = this.streams.get(jobId);

    if (!stream) {
      return;
    }

    stream.complete();

    this.streams.delete(jobId);
  }
}