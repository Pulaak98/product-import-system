import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { CronJob } from 'cron';
import { Kysely } from 'kysely';
import { parse } from 'csv-parse/sync';
import { readFile } from 'fs/promises';


import { DATABASE } from '../database/database.module';
import {
  Database,
  ImportJobsTable,
} from '../database/database.types';

interface ImportJob {
  id: number;
  original_file_name: string;
  stored_file_location: string;
  status: string;
  total_records: number;
  column_mappings: Record<string, string>;
}

interface ProductRow {
  name: string;
  sku: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  category: string | null;
  brand: string | null;
  status: string;
}

@Injectable()
export class ImportProcessor
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger =
    new Logger(ImportProcessor.name);

  private cronJob: CronJob | null = null;

  private processing = false;

  constructor(
    @Inject(DATABASE)
    private readonly db: Kysely<Database>,
  ) {}

  onModuleInit() {
    this.cronJob = new CronJob(
      '*/1 * * * * *',
      () => {
        void this.processNextJob();
      },
    );

    this.cronJob.start();

    this.logger.log(
      'Import processor started.',
    );
  }

  onModuleDestroy() {
    this.cronJob?.stop();
  }

  private async processNextJob() {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      const job = await this.claimNextJob();

      if (!job) {
        return;
      }

      await this.processJob(job);
    } catch (error) {
      this.logger.error(
        'Import processor error.',
        error instanceof Error
          ? error.stack
          : String(error),
      );
    } finally {
      this.processing = false;
    }
  }

  private async claimNextJob(): Promise<ImportJob | null> {
    const pendingJob = await this.db
      .selectFrom('import_jobs')
      .selectAll()
      .where('status', '=', 'pending')
      .orderBy('id', 'asc')
      .executeTakeFirst();

    if (!pendingJob) {
      return null;
    }

    const claimedJob = await this.db
      .updateTable('import_jobs')
      .set({
        status: 'processing',
        started_at: new Date(),
        updated_at: new Date(),
      })
      .where('id', '=', pendingJob.id)
      .where('status', '=', 'pending')
      .returningAll()
      .executeTakeFirst();

    if (!claimedJob) {
      return null;
    }

    return {
      id: claimedJob.id,
      original_file_name:
        claimedJob.original_file_name,
      stored_file_location:
        claimedJob.stored_file_location,
      status: claimedJob.status,
      total_records:
        claimedJob.total_records,
      column_mappings:
        claimedJob.column_mappings as Record<
          string,
          string
        >,
    };
  }

  private async processJob(
    job: ImportJob,
  ) {
    let records: Record<string, string>[];

    try {
      const fileContent =
        await readFile(
          job.stored_file_location,
          'utf-8',
        );

      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: false,
      });
    } catch (error) {
      await this.markJobFailed(
        job.id,
        'Failed to read or parse the CSV file.',
      );

      this.logger.error(
        `Failed to read import job ${job.id}.`,
      );

      return;
    }

    let processedRecords = 0;
    let successfulRecords = 0;
    let failedRecords = 0;

    for (
      let index = 0;
      index < records.length;
      index++
    ) {
      const row = records[index];

      try {
        const product =
          this.mapProduct(
            row,
            job.column_mappings,
          );

        this.validateProduct(product);

        const existingProduct =
          await this.db
            .selectFrom('products')
            .select('id')
            .where(
              'sku',
              '=',
              product.sku,
            )
            .executeTakeFirst();

        if (existingProduct) {
          throw new Error(
            `SKU "${product.sku}" already exists.`,
          );
        }

        await this.db
          .insertInto('products')
          .values(product)
          .executeTakeFirstOrThrow();

        successfulRecords++;
      } catch (error) {
        failedRecords++;

        const message =
          error instanceof Error
            ? error.message
            : 'Unknown import error.';

        await this.db
          .insertInto('failed_records')
          .values({
            import_job_id: job.id,
            csv_row_number: index + 2,
            original_row_data: row,
            mapped_product_data:
              this.tryMapProduct(
                row,
                job.column_mappings,
              ),
            error_code: 'IMPORT_ROW_ERROR',
            error_message: `Row ${
              index + 2
            }: ${message}`,
            retry_status: 'not_retried',
            retry_count: 0,
            last_retry_date: null,
          })
          .executeTakeFirstOrThrow();
      }

      processedRecords++;

      const progress =
        records.length === 0
          ? 100
          : Number(
              (
                (processedRecords /
                  records.length) *
                100
              ).toFixed(2),
            );

      await this.db
        .updateTable('import_jobs')
        .set({
          processed_records:
            processedRecords,
          successful_records:
            successfulRecords,
          failed_records:
            failedRecords,
          progress_percentage:
            progress,
          updated_at: new Date(),
        })
        .where('id', '=', job.id)
        .executeTakeFirstOrThrow();
    }

    const finalStatus =
      failedRecords > 0
        ? 'completed_with_errors'
        : 'completed';

    await this.db
      .updateTable('import_jobs')
      .set({
        status: finalStatus,
        processed_records:
          processedRecords,
        successful_records:
          successfulRecords,
        failed_records:
          failedRecords,
        progress_percentage: 100,
        completed_at: new Date(),
        updated_at: new Date(),
      })
      .where('id', '=', job.id)
      .executeTakeFirstOrThrow();

    this.logger.log(
      `Import job ${job.id} completed. Success: ${successfulRecords}, Failed: ${failedRecords}.`,
    );
  }

  private mapProduct(
    row: Record<string, string>,
    mappings: Record<string, string>,
  ): ProductRow {
    const getValue = (
      field: string,
    ): string => {
      const column = mappings[field];

      if (!column) {
        return '';
      }

      return String(
        row[column] ?? '',
      ).trim();
    };

    const priceValue = getValue('price');

    const stockValue =
      getValue('stock_quantity');

    return {
      name: getValue('name'),
      sku: getValue('sku'),
      description:
        getValue('description') || null,
      price: Number(priceValue),
      stock_quantity: stockValue
        ? Number(stockValue)
        : 0,
      category:
        getValue('category') || null,
      brand:
        getValue('brand') || null,
      status:
        getValue('status') || 'active',
    };
  }

  private tryMapProduct(
    row: Record<string, string>,
    mappings: Record<string, string>,
  ) {
    try {
      return this.mapProduct(
        row,
        mappings,
      );
    } catch {
      return null;
    }
  }

  private validateProduct(
    product: ProductRow,
  ) {
    if (!product.name) {
      throw new Error(
        'Missing product name.',
      );
    }

    if (!product.sku) {
      throw new Error('Missing SKU.');
    }

    if (
      !Number.isFinite(product.price)
    ) {
      throw new Error(
        'Invalid price.',
      );
    }

    if (product.price < 0) {
      throw new Error(
        'Price cannot be negative.',
      );
    }

    if (
      !Number.isInteger(
        product.stock_quantity,
      )
    ) {
      throw new Error(
        'Stock quantity must be an integer.',
      );
    }

    if (
      product.stock_quantity < 0
    ) {
      throw new Error(
        'Stock quantity cannot be negative.',
      );
    }

    const validStatuses = [
      'active',
      'inactive',
      'draft',
    ];

    if (
      !validStatuses.includes(
        product.status.toLowerCase(),
      )
    ) {
      throw new Error(
        `Invalid product status "${product.status}".`,
      );
    }
  }

  private async markJobFailed(
    jobId: number,
    message: string,
  ) {
    await this.db
      .updateTable('import_jobs')
      .set({
        status: 'failed',
        failure_message: message,
        completed_at: new Date(),
        updated_at: new Date(),
      })
      .where('id', '=', jobId)
      .executeTakeFirst();
  }
}