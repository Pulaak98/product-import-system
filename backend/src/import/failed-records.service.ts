import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Kysely } from 'kysely';

import { DATABASE } from '../database/database.module';

import { Database } from '../database/database.types';

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

export interface FormattedFailedRecord {
  id: number;
  jobId: number;
  rowNumber: number;
  originalRowData: unknown;
  mappedProductData: unknown;
  errorCode: string;
  errorMessage: string;
  retryStatus: string;
  retryCount: number;
  createdAt: Date;
  lastRetryDate: Date | null;
}

export interface RetryAllResult {
  failedRecordId: number;
  success: boolean;
  message: string;
  record: FormattedFailedRecord;
}

@Injectable()
export class FailedRecordsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: Kysely<Database>,
  ) {}

  // ============================================================
  // GET ALL FAILED RECORDS FOR A JOB
  // ============================================================

  async getFailedRecords(
    jobId: number,
  ): Promise<FormattedFailedRecord[]> {
    await this.ensureJobExists(jobId);

    const records =
      await this.db
        .selectFrom('failed_records')
        .selectAll()
        .where(
          'import_job_id',
          '=',
          jobId,
        )
        .orderBy(
          'csv_row_number',
          'asc',
        )
        .execute();

    return records.map(
      (record) =>
        this.formatFailedRecord(
          record,
        ),
    );
  }

  // ============================================================
  // GET ONE FAILED RECORD
  // ============================================================

  async getFailedRecord(
    jobId: number,
    failedRecordId: number,
  ): Promise<FormattedFailedRecord> {
    const record =
      await this.db
        .selectFrom('failed_records')
        .selectAll()
        .where(
          'id',
          '=',
          failedRecordId,
        )
        .where(
          'import_job_id',
          '=',
          jobId,
        )
        .executeTakeFirst();

    if (!record) {
      throw new NotFoundException(
        'Failed record not found.',
      );
    }

    return this.formatFailedRecord(
      record,
    );
  }

  // ============================================================
  // RETRY ONE FAILED RECORD
  // ============================================================

  async retryFailedRecord(
    jobId: number,
    failedRecordId: number,
  ) {
    const failedRecord =
      await this.db
        .selectFrom('failed_records')
        .selectAll()
        .where(
          'id',
          '=',
          failedRecordId,
        )
        .where(
          'import_job_id',
          '=',
          jobId,
        )
        .executeTakeFirst();

    if (!failedRecord) {
      throw new NotFoundException(
        'Failed record not found.',
      );
    }

    if (
      failedRecord.retry_status ===
      'success'
    ) {
      return {
        message:
          'Failed record has already been successfully retried.',

        record:
          this.formatFailedRecord(
            failedRecord,
          ),
      };
    }

    const product =
      this.getMappedProduct(
        failedRecord.mapped_product_data,
      );

    try {
      this.validateProduct(
        product,
      );

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
        .transaction()
        .execute(
          async (trx) => {
            const job =
              await trx
                .selectFrom(
                  'import_jobs',
                )
                .select([
                  'failed_records',
                  'successful_records',
                ])
                .where(
                  'id',
                  '=',
                  jobId,
                )
                .executeTakeFirst();

            if (!job) {
              throw new NotFoundException(
                'Import job not found.',
              );
            }

            await trx
              .insertInto('products')
              .values(product)
              .executeTakeFirstOrThrow();

            await trx
              .updateTable(
                'failed_records',
              )
              .set({
                retry_status:
                  'success',

                retry_count:
                  failedRecord.retry_count +
                  1,

                last_retry_date:
                  new Date(),
              })
              .where(
                'id',
                '=',
                failedRecord.id,
              )
              .executeTakeFirstOrThrow();

            await trx
              .updateTable(
                'import_jobs',
              )
              .set({
                failed_records:
                  Math.max(
                    job.failed_records -
                      1,
                    0,
                  ),

                successful_records:
                  job.successful_records +
                  1,

                updated_at:
                  new Date(),
              })
              .where(
                'id',
                '=',
                jobId,
              )
              .executeTakeFirstOrThrow();
          },
        );

      await this.updateJobStatus(
        jobId,
      );

      const updatedRecord =
        await this.db
          .selectFrom(
            'failed_records',
          )
          .selectAll()
          .where(
            'id',
            '=',
            failedRecord.id,
          )
          .executeTakeFirstOrThrow();

      return {
        message:
          'Failed record retried successfully.',

        record:
          this.formatFailedRecord(
            updatedRecord,
          ),
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Retry failed.';

      const updatedRecord =
        await this.db
          .updateTable(
            'failed_records',
          )
          .set({
            retry_status:
              'failed',

            retry_count:
              failedRecord.retry_count +
              1,

            last_retry_date:
              new Date(),

            error_message:
              `Retry failed: ${message}`,
          })
          .where(
            'id',
            '=',
            failedRecord.id,
          )
          .returningAll()
          .executeTakeFirstOrThrow();

      return {
        message:
          'Failed record retry failed.',

        error: message,

        record:
          this.formatFailedRecord(
            updatedRecord,
          ),
      };
    }
  }

  // ============================================================
  // RETRY ALL FAILED RECORDS
  // ============================================================

  async retryAllFailedRecords(
    jobId: number,
  ) {
    await this.ensureJobExists(jobId);

    const failedRecords =
      await this.db
        .selectFrom(
          'failed_records',
        )
        .select('id')
        .where(
          'import_job_id',
          '=',
          jobId,
        )
        .where(
          'retry_status',
          '!=',
          'success',
        )
        .orderBy(
          'csv_row_number',
          'asc',
        )
        .execute();

    if (
      failedRecords.length ===
      0
    ) {
      return {
        message:
          'There are no failed records to retry.',

        totalRecords: 0,

        successfulRecords: 0,

        failedRecords: 0,

        results: [],
      };
    }

    const results: RetryAllResult[] =
      [];

    let successfulRecords = 0;

    let failedRecordsCount = 0;

    for (const failedRecord of failedRecords) {
      try {
        const result =
          await this.retryFailedRecord(
            jobId,
            failedRecord.id,
          );

        const success =
          result.message ===
          'Failed record retried successfully.';

        if (success) {
          successfulRecords++;
        } else {
          failedRecordsCount++;
        }

        results.push({
          failedRecordId:
            failedRecord.id,

          success,

          message:
            result.message,

          record:
            result.record,
        });
      } catch (error) {
        failedRecordsCount++;

        const message =
          error instanceof Error
            ? error.message
            : 'Retry failed.';

        const record =
          await this.getFailedRecord(
            jobId,
            failedRecord.id,
          );

        results.push({
          failedRecordId:
            failedRecord.id,

          success: false,

          message,

          record,
        });
      }
    }

    await this.updateJobStatus(
      jobId,
    );

    return {
      message:
        'Failed records retry completed.',

      totalRecords:
        failedRecords.length,

      successfulRecords,

      failedRecords:
        failedRecordsCount,

      results,
    };
  }

  // ============================================================
  // DOWNLOAD FAILED RECORDS AS CSV
  // ============================================================

  async downloadFailedRecords(
    jobId: number,
  ) {
    await this.ensureJobExists(jobId);

    const records =
      await this.db
        .selectFrom(
          'failed_records',
        )
        .select([
          'csv_row_number',
          'mapped_product_data',
          'error_code',
          'error_message',
          'retry_status',
          'retry_count',
          'created_at',
          'last_retry_date',
        ])
        .where(
          'import_job_id',
          '=',
          jobId,
        )
        .orderBy(
          'csv_row_number',
          'asc',
        )
        .execute();

    const headers = [
      'row_number',
      'name',
      'sku',
      'description',
      'price',
      'stock_quantity',
      'category',
      'brand',
      'status',
      'error_code',
      'error_message',
      'retry_status',
      'retry_count',
      'created_at',
      'last_retry_date',
    ];

    const rows = records.map(
      (record) => {
        const product =
          this.getMappedProductSafely(
            record.mapped_product_data,
          );

        return [
          record.csv_row_number,

          product.name,

          product.sku,

          product.description ??
            '',

          product.price,

          product.stock_quantity,

          product.category ??
            '',

          product.brand ?? '',

          product.status,

          record.error_code,

          record.error_message,

          record.retry_status,

          record.retry_count,

          record.created_at instanceof Date
            ? record.created_at.toISOString()
            : String(
                record.created_at,
              ),

          record.last_retry_date
            ? record.last_retry_date instanceof Date
              ? record.last_retry_date.toISOString()
              : String(
                  record.last_retry_date,
                )
            : '',
        ];
      },
    );

    const escapeCsvValue = (
      value: unknown,
    ) => {
      const stringValue =
        String(value ?? '');

      return `"${stringValue.replace(
        /"/g,
        '""',
      )}"`;
    };

    const csv = [
      headers
        .map(escapeCsvValue)
        .join(','),

      ...rows.map(
        (row) =>
          row
            .map(escapeCsvValue)
            .join(','),
      ),
    ].join('\n');

    return {
      fileName:
        `failed-records-job-${jobId}.csv`,

      csv,
    };
  }

  // ============================================================
  // UPDATE IMPORT JOB STATUS
  // ============================================================

  private async updateJobStatus(
    jobId: number,
  ) {
    const job =
      await this.db
        .selectFrom('import_jobs')
        .select([
          'status',
          'failed_records',
        ])
        .where(
          'id',
          '=',
          jobId,
        )
        .executeTakeFirst();

    if (!job) {
      return;
    }

    if (
      job.status ===
        'completed_with_errors' &&
      job.failed_records === 0
    ) {
      await this.db
        .updateTable(
          'import_jobs',
        )
        .set({
          status: 'completed',

          progress_percentage: 100,

          completed_at:
            new Date(),

          updated_at:
            new Date(),

          failure_message:
            null,
        })
        .where(
          'id',
          '=',
          jobId,
        )
        .executeTakeFirstOrThrow();
    }
  }

  // ============================================================
  // CHECK JOB EXISTS
  // ============================================================

  private async ensureJobExists(
    jobId: number,
  ) {
    const job =
      await this.db
        .selectFrom('import_jobs')
        .select('id')
        .where(
          'id',
          '=',
          jobId,
        )
        .executeTakeFirst();

    if (!job) {
      throw new NotFoundException(
        'Import job not found.',
      );
    }
  }

  // ============================================================
  // CONVERT MAPPED DATA TO PRODUCT
  // ============================================================

  private getMappedProduct(
    data: unknown,
  ): ProductRow {
    if (
      !data ||
      typeof data !==
        'object'
    ) {
      throw new Error(
        'Mapped product data is invalid.',
      );
    }

    const value =
      data as Record<
        string,
        unknown
      >;

    return {
      name: String(
        value.name ?? '',
      ).trim(),

      sku: String(
        value.sku ?? '',
      ).trim(),

      description:
        value.description ==
        null
          ? null
          : String(
              value.description,
            ).trim() || null,

      price: Number(
        value.price,
      ),

      stock_quantity:
        Number(
          value.stock_quantity,
        ),

      category:
        value.category == null
          ? null
          : String(
              value.category,
            ).trim() || null,

      brand:
        value.brand == null
          ? null
          : String(
              value.brand,
            ).trim() || null,

      status:
        String(
          value.status ??
            'active',
        ).trim() ||
        'active',
    };
  }

  // ============================================================
  // SAFE PRODUCT CONVERSION FOR CSV
  // ============================================================

  private getMappedProductSafely(
    data: unknown,
  ): ProductRow {
    try {
      return this.getMappedProduct(
        data,
      );
    } catch {
      return {
        name: '',
        sku: '',
        description: null,
        price: 0,
        stock_quantity: 0,
        category: null,
        brand: null,
        status: 'unknown',
      };
    }
  }

  // ============================================================
  // VALIDATE PRODUCT
  // ============================================================

  private validateProduct(
    product: ProductRow,
  ) {
    if (!product.name) {
      throw new Error(
        'Missing product name.',
      );
    }

    if (!product.sku) {
      throw new Error(
        'Missing SKU.',
      );
    }

    if (
      !Number.isFinite(
        product.price,
      )
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
      product.stock_quantity <
      0
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

  // ============================================================
  // FORMAT FAILED RECORD
  // ============================================================

  private formatFailedRecord(
    record: {
      id: number;

      import_job_id: number;

      csv_row_number: number;

      original_row_data: unknown;

      mapped_product_data: unknown;

      error_code: string;

      error_message: string;

      retry_status: string;

      retry_count: number;

      created_at: Date;

      last_retry_date:
        | Date
        | null;
    },
  ): FormattedFailedRecord {
    return {
      id: record.id,

      jobId:
        record.import_job_id,

      rowNumber:
        record.csv_row_number,

      originalRowData:
        record.original_row_data,

      mappedProductData:
        record.mapped_product_data,

      errorCode:
        record.error_code,

      errorMessage:
        record.error_message,

      retryStatus:
        record.retry_status,

      retryCount:
        record.retry_count,

      createdAt:
        record.created_at,

      lastRetryDate:
        record.last_retry_date,
    };
  }
}