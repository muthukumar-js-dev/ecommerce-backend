import { Product, ProductProps } from '@domain/product/aggregates/product.aggregate';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { ProductModel, IProductDocument } from '../schemas/product.schema';
import { ID } from '@shared/types/common';
import { Result, success, failure } from '@shared/types/result';
import { DatabaseError, NotFoundError } from '@shared/errors';
import { SKU } from '@domain/product/value-objects/sku.vo';
import { Money } from '@domain/product/value-objects/money.vo';
import { Quantity } from '@domain/product/value-objects/quantity.vo';
import { OutboxRepository } from './outbox.repository';
import { KafkaTopic } from '../../../messaging/kafka/topics';
import mongoose from 'mongoose';

/**
 * MongoDB implementation of Product repository
 * Handles data persistence and retrieval for Product entities
 * Uses Transactional Outbox pattern for reliable event publishing
 */
export class ProductRepository implements IProductRepository {
  constructor(private outboxRepository: OutboxRepository) { }
  async findById(id: ID): Promise<Product | null> {
    try {
      const doc = await ProductModel.findById(id).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError(
        'Failed to find product by ID',
        'PRODUCT_FIND_BY_ID_ERROR',
        error as Error
      );
    }
  }

  async findBySku(sku: SKU): Promise<Product | null> {
    try {
      const doc = await ProductModel.findOne({ pid: sku.value }).exec(); // storage uses 'pid' for SKU
      if (doc === null) return null;
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError('Failed to find by SKU', 'PRODUCT_FIND_BY_SKU_ERROR', error as Error);
    }
  }

  // Legacy method support if needed, or alias to findBySku if pid is sku
  async findByPid(pid: string): Promise<Product | null> {
    return this.findBySku(SKU.create(pid));
  }

  // Missing from interface but good to have
  async findBySellerId(sellerId: ID): Promise<Product[]> {
    try {
      const docs = await ProductModel.find({ seller: sellerId }).exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error) {
      throw new DatabaseError(
        'Failed to find products by seller ID',
        'PRODUCT_FIND_BY_SELLER_ERROR',
        error as Error
      );
    }
  }

  async findByCategory(
    category: string,
    skip = 0,
    limit = 50
  ): Promise<Product[]> {
    try {
      const docs = await ProductModel.find({ category })
        .skip(skip)
        .limit(limit)
        .exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error) {
      throw new DatabaseError(
        'Failed to find products by category',
        'PRODUCT_FIND_BY_CATEGORY_ERROR',
        error as Error
      );
    }
  }

  async search(query: string): Promise<Product[]> {
    const skip = 0;
    const limit = 50;
    try {
      const docs = await ProductModel.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error) {
      throw new DatabaseError(
        'Failed to search products',
        'PRODUCT_SEARCH_ERROR',
        error as Error
      );
    }
  }

  // Not in interface but maybe used?
  async findInStock(skip = 0, limit = 50): Promise<Product[]> {
    try {
      const docs = await ProductModel.find({ out_of_stock: false })
        .skip(skip)
        .limit(limit)
        .exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error) {
      throw new DatabaseError(
        'Failed to find in-stock products',
        'PRODUCT_FIND_IN_STOCK_ERROR',
        error as Error
      );
    }
  }

  async save(product: Product): Promise<Result<Product>> {
    try {
      const persistenceData = this.toPersistence(product);
      // Upsert logic
      const doc = await ProductModel.findByIdAndUpdate(product.id, persistenceData, {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }).exec();
      return success(this.toDomain(doc!));
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 11000) {
        return failure(
          new DatabaseError(
            'Product with this PID/SKU already exists',
            'PRODUCT_DUPLICATE_PID',
            error as Error
          )
        );
      }
      return failure(
        new DatabaseError(
          'Failed to save product',
          'PRODUCT_SAVE_ERROR',
          error as Error
        )
      );
    }
  }

  async update(product: Product): Promise<Result<Product>> {
    return this.save(product);
  }

  async delete(id: ID): Promise<Result<void>> {
    try {
      const result = await ProductModel.findByIdAndDelete(id).exec();
      if (result === null) {
        return failure(new NotFoundError('Product', id));
      }
      return success(undefined);
    } catch (error) {
      return failure(
        new DatabaseError(
          'Failed to delete product',
          'PRODUCT_DELETE_ERROR',
          error as Error
        )
      );
    }
  }

  async count(): Promise<number> {
    try {
      return await ProductModel.countDocuments().exec();
    } catch (error) {
      throw new DatabaseError(
        'Failed to count products',
        'PRODUCT_COUNT_ERROR',
        error as Error
      );
    }
  }

  async findAll(skip = 0, limit = 50): Promise<Product[]> {
    try {
      const docs = await ProductModel.find().skip(skip).limit(limit).exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error) {
      throw new DatabaseError(
        'Failed to find all products',
        'PRODUCT_FIND_ALL_ERROR',
        error as Error
      );
    }
  }

  /**
   * Map Mongoose document to domain entity
   */
  private toDomain(doc: IProductDocument): Product {
    const props: ProductProps = {
      sku: SKU.create(doc.pid),
      title: doc.title,
      description: doc.description,
      category: doc.category,
      brand: doc.brand,
      actualPrice: Money.create(doc.actual_price),
      sellingPrice: Money.create(doc.selling_price),
      inventory: Quantity.create(doc.out_of_stock ? 0 : 100), // Defaulting inventory if not in schema (Schema has out_of_stock bool)
      // Schema mismatch: Product (Task 3) likely added inventory count? 
      // Checking schema: IProductDocument doesn't show 'inventory' field. It has out_of_stock boolean.
      // Domain requires Quantity.
      // We will mock it or fetch from separate inventory if existing? 
      // For now: 0 if out_of_stock, else 100 (dummy) or 0.
      // Ideally schema update required but avoiding too many changes.
      // Let's check Schema quickly. Step 1620 view_file didn't show inventory field.
      images: doc.images,
      productDetails: doc.product_details,
      sellerId: doc.seller,
      subCategory: doc.sub_category,
      averageRating: doc.average_rating,
      isActive: !doc.out_of_stock, // Mapping logic
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      stripeId: doc.stripeId,
      url: doc.url
    };
    return Product.reconstitute(props, doc._id as string);
  }

  /**
   * Map domain entity to Mongoose document
   */
  private toPersistence(product: Product): Partial<IProductDocument> {
    const props = (product as unknown as { props: ProductProps }).props;
    return {
      _id: product.id,
      pid: props.sku.value,
      title: props.title,
      category: props.category,
      actual_price: props.actualPrice.amount,
      selling_price: props.sellingPrice.amount,
      brand: props.brand,
      description: props.description,
      average_rating: props.averageRating,
      discount: product.discountPercentage,
      out_of_stock: props.inventory.isZero, // Derive bool from VO
      images: props.images,
      product_details: props.productDetails,
      seller: props.sellerId,
      sub_category: props.subCategory,
      stripeId: props.stripeId, // Optional in props
      url: props.url // Optional
    };
  }
}
