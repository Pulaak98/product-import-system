import { Module } from '@nestjs/common';

import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { CsvService } from './csv/csv.service';

@Module({
  controllers: [ImportController],
  providers: [
    ImportService,
    CsvService,
  ],
})
export class ImportModule {}