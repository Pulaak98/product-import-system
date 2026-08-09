import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from './database.types';

export const DATABASE = Symbol('DATABASE');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATABASE,
      inject: [],
      useFactory: () => {
        const pool = new Pool({
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT),
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
        });

        return new Kysely<Database>({
          dialect: new PostgresDialect({
            pool,
          }),
        });
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}