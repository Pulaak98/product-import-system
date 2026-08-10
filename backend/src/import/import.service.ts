import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { mkdir, writeFile, unlink, access } from 'fs/promises';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { Kysely } from 'kysely';

import { DATABASE } from '../database/database.module';
import { Database } from '../database/database.types';
import { CsvService } from './csv/csv.service';

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

  async createImportJob(data: {
    fileId: string;
    originalFileName: string;
    columnMappings: Record<string, string>;
  }) {
    const filePath = this.getFilePath(data.fileId);

    try {
      await access(filePath);
    } catch {
      throw new NotFoundException(
        'Uploaded CSV file could not be found.',
      );
    }

    const mappingErrors =
      this.validateMappings(data.columnMappings);

    if (mappingErrors.length > 0) {
      throw new BadRequestException(mappingErrors);
    }

    const totalRecords =
      await this.csvService.getRecordCount(filePath);

    if (totalRecords === 0) {
      throw new BadRequestException(
        'The CSV file does not contain any data rows.',
      );
    }

    const job = await this.db
      .insertInto('import_jobs')
      .values({
        user_id: null,
        original_file_name: data.originalFileName,
        stored_file_location: filePath,
        import_type: 'product_csv',
        status: 'pending',
        total_records: totalRecords,
        processed_records: 0,
        successful_records: 0,
        failed_records: 0,
        progress_percentage: 0,
        column_mappings: JSON.stringify(
          data.columnMappings,
        ),
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

  async getImportJob(id: number) {
    const job = await this.db
      .selectFrom('import_jobs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!job) {
      throw new NotFoundException(
        'Import job not found.',
      );
    }

    return job;
  }

  private validateMappings(
    mappings: Record<string, string>,
  ): string[] {
    const errors: string[] = [];

    if (!mappings || typeof mappings !== 'object') {
      return ['Column mappings are required.'];
    }

    if (!mappings.name) {
      errors.push(
        'Product Name is required and must be mapped.',
      );
    }

    if (!mappings.sku) {
      errors.push(
        'SKU is required and must be mapped.',
      );
    }

    if (!mappings.price) {
      errors.push(
        'Price is required and must be mapped.',
      );
    }

    const columns = Object.values(mappings).filter(
      Boolean,
    );

    const uniqueColumns = new Set(columns);

    if (columns.length !== uniqueColumns.size) {
      errors.push(
        'A CSV column can only be mapped once.',
      );
    }

    return errors;
  }

  private getFilePath(fileId: string): string {
    return join(
      this.uploadDirectory,
      `${fileId}.csv`,
    );
  }

  private async removeFile(filePath: string) {
    try {
      await unlink(filePath);
    } catch {
      // Ignore cleanup errors.
    }
  }
}