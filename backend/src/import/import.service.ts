import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { CsvService } from './csv/csv.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class ImportService {
  private readonly uploadDirectory = join(
    process.cwd(),
    'storage',
    'imports',
  );

  constructor(private readonly csvService: CsvService) {}

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

    const { writeFile } = await import('fs/promises');

    await writeFile(filePath, file.buffer);

    try {
      const preview = await this.csvService.readPreview(
        filePath,
      );

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

  private async removeFile(filePath: string) {
    try {
      const { unlink } = await import('fs/promises');

      await unlink(filePath);
    } catch {
      // Ignore cleanup errors.
    }
  }
}