import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileInterceptor,
} from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImportService } from './import.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller('imports')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
  ) {}

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
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.importService.uploadCsv(file);
  }
}