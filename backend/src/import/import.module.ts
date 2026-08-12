import { Module } from '@nestjs/common';

import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ImportProcessor } from './import.processor';
import { ImportProgressService } from './import-progress.service';
import { CsvService } from './csv/csv.service';

@Module({
  controllers: [
    ImportController,
  ],

  providers: [
    ImportService,
    ImportProcessor,
    ImportProgressService,
    CsvService,
  ],
})
export class ImportModule {}