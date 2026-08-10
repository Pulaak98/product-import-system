import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CreateImportJobDto {
  @IsString()
  @IsNotEmpty()
  fileId!: string;

  @IsString()
  @IsNotEmpty()
  originalFileName!: string;

  @IsObject()
  columnMappings!: Record<string, string>;
}