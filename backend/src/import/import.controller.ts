import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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

interface CreateImportJobBody {
  fileId: string;
  originalFileName: string;
  columnMappings: Record<string, string>;
}

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
      fileFilter: (
        _request,
        file,
        callback,
      ) => {
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

  @Post('jobs')
  createImportJob(
    @Body()
    body: CreateImportJobBody,
  ) {
    return this.importService.createImportJob({
      fileId: body.fileId,
      originalFileName: body.originalFileName,
      columnMappings: body.columnMappings,
    });
  }

  @Get('jobs/:id')
  getImportJob(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.importService.getImportJob(id);
  }
}