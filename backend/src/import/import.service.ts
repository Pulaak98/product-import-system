import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { Kysely } from 'kysely';

import { CsvService } from './csv/csv.service';
import { CreateImportJobDto } from './dto/create-import-job.dto';

import { DATABASE } from '../database/database.module';
import { Database } from '../database/database.types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class ImportService {
  private readonly uploadDirectory = join(
    process.cwd(),
    'storage',
    'imports',
  );

  constructor(
    private readonly csvService: CsvService,

    @Inject(DATABASE)
    private readonly db: Kysely<Database>,
  ) {}

  async uploadCsv(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'A CSV file is required.',
      );
    }

    if (file.size === 0) {
      throw new BadRequestException(
        'The CSV file is empty.',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        'The CSV file must not exceed 10 MB.',
      );
    }

    const extension = file.originalname
      .toLowerCase()
      .split('.')
      .pop();

    if (extension !== 'csv') {
      throw new BadRequestException(
        'Only CSV files are supported.',
      );
    }

    await mkdir(this.uploadDirectory, {
      recursive: true,
    });

    const fileId = randomUUID();

    const storedFileName = `${fileId}.csv`;

    const filePath = join(
      this.uploadDirectory,
      storedFileName,
    );

    await writeFile(filePath, file.buffer);

    try {
      const preview =
        await this.csvService.readPreview(filePath);

      return {
        fileId,
        originalFileName: file.originalname,
        fileSize: file.size,
        headers: preview.headers,
        previewRows: preview.rows,
      };
    } catch (error) {
      await this.removeFile(filePath);

      throw error;
    }
  }

  async createImportJob(
    dto: CreateImportJobDto,
  ) {
    const filePath = join(
      this.uploadDirectory,
      `${dto.fileId}.csv`,
    );

    let preview;

    try {
      preview =
        await this.csvService.readPreview(
          filePath,
          Number.MAX_SAFE_INTEGER,
        );
    } catch {
      throw new NotFoundException(
        'Uploaded CSV file could not be found.',
      );
    }

    if (preview.rows.length === 0) {
      throw new BadRequestException(
        'The CSV file does not contain any data rows.',
      );
    }

    const requiredMappings = [
      'name',
      'sku',
      'price',
    ];

    for (const field of requiredMappings) {
      if (!dto.columnMappings[field]) {
        throw new BadRequestException(
          `${field} must be mapped before creating the import job.`,
        );
      }
    }

    const mappedColumns =
      Object.values(dto.columnMappings);

    const uniqueColumns = new Set(mappedColumns);

    if (
      mappedColumns.length !== uniqueColumns.size
    ) {
      throw new BadRequestException(
        'A CSV column can only be mapped once.',
      );
    }

    const invalidMappings =
      mappedColumns.some(
        (column) =>
          !preview.headers.includes(column),
      );

    if (invalidMappings) {
      throw new BadRequestException(
        'One or more mapped CSV columns do not exist.',
      );
    }

    const existingJob = await this.db
      .selectFrom('import_jobs')
      .select('id')
      .where(
        'original_file_name',
        '=',
        dto.originalFileName,
      )
      .where(
        'status',
        'in',
        ['pending', 'processing'],
      )
      .executeTakeFirst();

    if (existingJob) {
      throw new ConflictException(
        'An import job for this file is already processing.',
      );
    }

    const job = await this.db
      .insertInto('import_jobs')
      .values({
        user_id: null,
        original_file_name:
          dto.originalFileName,
        stored_file_location: filePath,
        import_type: 'product_csv',
        status: 'pending',
        total_records: preview.rows.length,
        processed_records: 0,
        successful_records: 0,
        failed_records: 0,
        progress_percentage: 0,
        column_mappings: dto.columnMappings,
        started_at: null,
        completed_at: null,
        failure_message: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      message: 'Import job created successfully.',
      job,
    };
  }
async getImportProgress(
  jobId: number,
) {
  const job = await this.db
    .selectFrom('import_jobs')
    .select([
      'id',
      'original_file_name',
      'status',
      'total_records',
      'processed_records',
      'successful_records',
      'failed_records',
      'progress_percentage',
      'created_at',
      'started_at',
      'completed_at',
    ])
    .where('id', '=', jobId)
    .executeTakeFirst();

  if (!job) {
    throw new NotFoundException(
      'Import job not found.',
    );
  }

  return {
    jobId: job.id,

    fileName:
      job.original_file_name,

    status:
      job.status,

    totalRecords:
      job.total_records,

    processedRecords:
      job.processed_records,

    successfulRecords:
      job.successful_records,

    failedRecords:
      job.failed_records,

    progressPercentage:
      Number(
        job.progress_percentage,
      ),

    createdAt:
      job.created_at,

    startedAt:
      job.started_at,

    completedAt:
      job.completed_at,
  };
}


  private async removeFile(
    filePath: string,
  ) {
    try {
      await unlink(filePath);
    } catch {
      // Ignore cleanup errors.
    }
  }
}