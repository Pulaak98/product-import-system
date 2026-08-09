import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { DATABASE } from './database/database.module';
import { Database } from './database/database.types';

@Injectable()
export class AppService {
  constructor(
    @Inject(DATABASE)
    private readonly db: Kysely<Database>,
  ) {}

  async getHello(): Promise<string> {
    await this.db
      .selectFrom('products')
      .select('id')
      .limit(1)
      .execute();

    return 'Product Import System API is running';
  }
}