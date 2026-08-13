import {
  BadRequestException,
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Query,
  Res,
  Sse,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import type { Response } from 'express';

import { FileInterceptor } from '@nestjs/platform-express';

import { memoryStorage } from 'multer';

import { Observable, map } from 'rxjs';

import { ImportService } from './import.service';

import { ImportProgressService } from './import-progress.service';

import { CreateImportJobDto } from './dto/create-import-job.dto';

import { FailedRecordsService } from './failed-records.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller('imports')
export class ImportController {
  constructor(
    private readonly importService: ImportService,

    private readonly importProgressService: ImportProgressService,

    private readonly failedRecordsService: FailedRecordsService,
  ) {}

  // ============================================================
  // CSV UPLOAD
  // ============================================================

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),

      limits: {
        fileSize: MAX_FILE_SIZE,
      },

      fileFilter: (_request, file, callback) => {
        const extension = file.originalname
          .toLowerCase()
          .split('.')
          .pop();

        if (extension !== 'csv') {
          callback(
            new BadRequestException(
              'Only CSV files are supported.',
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
    return this.importService.uploadCsv(file);
  }

  // ============================================================
  // CREATE IMPORT JOB
  // ============================================================

  @Post('jobs')
  createImportJob(
    @Body()
    dto: CreateImportJobDto,
  ) {
    return this.importService.createImportJob(dto);
  }

  // ============================================================
  // LIST IMPORT JOBS
  // ============================================================

  @Get('jobs')
  async getImportJobs(
    @Query('limit')
    limit?: string,
  ) {
    return this.importService.getImportJobs(
      limit ? Number(limit) : 50,
    );
  }

  // ============================================================
  // FAILED RECORDS
  // ============================================================

  @Get('jobs/:jobId/failed-records')
  async getFailedRecords(
    @Param('jobId')
    jobId: string,
  ) {
    return this.failedRecordsService.getFailedRecords(
      Number(jobId),
    );
  }

  // ============================================================
  // DOWNLOAD FAILED RECORDS
  //
  // IMPORTANT:
  // This MUST come before:
  //
  // :failedRecordId
  //
  // Otherwise "download" can be interpreted as a failedRecordId.
  // ============================================================

  @Get('jobs/:jobId/failed-records/download')
  async downloadFailedRecords(
    @Param('jobId')
    jobId: string,

    @Res()
    response: Response,
  ) {
    const result =
      await this.failedRecordsService.downloadFailedRecords(
        Number(jobId),
      );

    response.setHeader(
      'Content-Type',
      'text/csv; charset=utf-8',
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );

    response.send(result.csv);
  }

  // ============================================================
  // RETRY ALL FAILED RECORDS
  // ============================================================

  @Post('jobs/:jobId/failed-records/retry-all')
  async retryAllFailedRecords(
    @Param('jobId')
    jobId: string,
  ) {
    return this.failedRecordsService.retryAllFailedRecords(
      Number(jobId),
    );
  }

  // ============================================================
  // GET ONE FAILED RECORD
  //
  // Keep this AFTER the "download" route.
  // ============================================================

  @Get(
    'jobs/:jobId/failed-records/:failedRecordId',
  )
  async getFailedRecord(
    @Param('jobId')
    jobId: string,

    @Param('failedRecordId')
    failedRecordId: string,
  ) {
    return this.failedRecordsService.getFailedRecord(
      Number(jobId),
      Number(failedRecordId),
    );
  }

  // ============================================================
  // RETRY ONE FAILED RECORD
  // ============================================================

  @Post(
    'jobs/:jobId/failed-records/:failedRecordId/retry',
  )
  async retryFailedRecord(
    @Param('jobId')
    jobId: string,

    @Param('failedRecordId')
    failedRecordId: string,
  ) {
    return this.failedRecordsService.retryFailedRecord(
      Number(jobId),
      Number(failedRecordId),
    );
  }

  // ============================================================
  // IMPORT PROGRESS
  // ============================================================

  @Get(':jobId/progress')
  async getProgress(
    @Param('jobId')
    jobId: string,
  ) {
    return this.importService.getImportProgress(
      Number(jobId),
    );
  }

  // ============================================================
  // IMPORT PROGRESS SSE
  // ============================================================

  @Sse(':jobId/progress/stream')
  progressStream(
    @Param('jobId')
    jobId: string,
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