import {
  BadRequestException,
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Query,
  Sse,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";

import {
  FileInterceptor,
} from "@nestjs/platform-express";

import { memoryStorage } from "multer";

import {
  Observable,
  map,
} from "rxjs";

import { ImportService } from "./import.service";

import {
  ImportProgressService,
} from "./import-progress.service";

import {
  CreateImportJobDto,
} from "./dto/create-import-job.dto";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

@Controller("imports")
export class ImportController {
  constructor(
    private readonly importService: ImportService,

    private readonly importProgressService:
      ImportProgressService,
  ) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),

      limits: {
        fileSize: MAX_FILE_SIZE,
      },

      fileFilter: (
        _request,
        file,
        callback,
      ) => {
        const extension =
          file.originalname
            .toLowerCase()
            .split(".")
            .pop();

        if (extension !== "csv") {
          callback(
            new BadRequestException(
              "Only CSV files are supported.",
            ),
            false,
          );

          return;
        }

        callback(null, true);
      },
    }),
  )
  uploadCsv(
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    return this.importService.uploadCsv(
      file,
    );
  }

  @Post("jobs")
  createImportJob(
    @Body()
    dto: CreateImportJobDto,
  ) {
    return this.importService.createImportJob(
      dto,
    );
  }

  @Get("jobs")
  async getImportJobs(
    @Query("limit") limit?: string,
  ) {
    return this.importService.getImportJobs(
      limit ? Number(limit) : 50,
    );
  }

  @Get(":jobId/progress")
  async getProgress(
    @Param("jobId") jobId: string,
  ) {
    return this.importService.getImportProgress(
      Number(jobId),
    );
  }

  @Sse(":jobId/progress/stream")
  progressStream(
    @Param("jobId") jobId: string,
  ): Observable<MessageEvent> {
    return this.importProgressService
      .subscribe(Number(jobId))
      .pipe(
        map((event) => ({
          event: event.type,
          data: event.data,
        })),
      );
  }
}