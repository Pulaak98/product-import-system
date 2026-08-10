import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { readFile } from 'fs/promises';

export interface CsvPreview {
  headers: string[];
  rows: Record<string, string>[];
}

@Injectable()
export class CsvService {
  async readPreview(
    filePath: string,
    previewLimit = 20,
  ): Promise<CsvPreview> {
    const fileContent = await readFile(
      filePath,
      'utf-8',
    );

    if (!fileContent.trim()) {
      throw new BadRequestException(
        'The CSV file is empty.',
      );
    }

    let records: Record<string, string>[];

    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: false,
      });
    } catch {
      throw new BadRequestException(
        'The CSV file could not be parsed.',
      );
    }

    if (records.length === 0) {
      throw new BadRequestException(
        'The CSV file does not contain any data rows.',
      );
    }

    const headers = Object.keys(records[0]);

    if (headers.length === 0) {
      throw new BadRequestException(
        'The CSV file does not contain valid headers.',
      );
    }

    return {
      headers,
      rows: records.slice(0, previewLimit),
    };
  }

  async getRecordCount(
    filePath: string,
  ): Promise<number> {
    const fileContent = await readFile(
      filePath,
      'utf-8',
    );

    if (!fileContent.trim()) {
      throw new BadRequestException(
        'The CSV file is empty.',
      );
    }

    try {
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: false,
      });

      return records.length;
    } catch {
      throw new BadRequestException(
        'The CSV file could not be parsed.',
      );
    }
  }
}