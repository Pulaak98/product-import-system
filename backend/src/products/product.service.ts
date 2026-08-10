import {
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Kysely } from 'kysely';
import { DATABASE } from '../database/database.module';
import { Database } from '../database/database.types';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductService {
  constructor(
    @Inject(DATABASE)
    private readonly db: Kysely<Database>,
  ) {}

  async create(dto: CreateProductDto) {
    const existingProduct = await this.db
      .selectFrom('products')
      .select('id')
      .where('sku', '=', dto.sku)
      .executeTakeFirst();

    if (existingProduct) {
      throw new ConflictException(
        `A product with SKU "${dto.sku}" already exists.`,
      );
    }

    const product = await this.db
      .insertInto('products')
      .values({
        name: dto.name,
        sku: dto.sku,
        description: dto.description ?? null,
        price: dto.price,
        stock_quantity: dto.stock_quantity,
        category: dto.category ?? null,
        brand: dto.brand ?? null,
        status: dto.status ?? 'active',
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return product;
  }

  async findAll(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    let productsQuery = this.db.selectFrom('products');

    if (query.search) {
      const search = `%${query.search}%`;

      productsQuery = productsQuery.where((eb) =>
        eb.or([
          eb('name', 'ilike', search),
          eb('sku', 'ilike', search),
          eb('category', 'ilike', search),
          eb('brand', 'ilike', search),
        ]),
      );
    }

    if (query.status) {
      productsQuery = productsQuery.where('status', '=', query.status);
    }

    const countResult = await productsQuery
      .select((eb) => eb.fn.count<number>('id').as('total'))
      .executeTakeFirstOrThrow();

    const products = await productsQuery
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    const total = Number(countResult.total);
    const totalPages = Math.ceil(total / limit);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: number) {
    return this.db
      .selectFrom('products')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }
}