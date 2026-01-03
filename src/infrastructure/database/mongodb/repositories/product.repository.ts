// import mongoose from 'mongoose'; // Removed unused import
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { Product, ProductProps } from '@domain/product/entities/product.entity';
import { ProductModel, IProductDocument } from '../schemas/product.schema';
import { ID } from '@shared/types/common';
import { Result, success, failure } from '@shared/types/result';
import { DatabaseError, NotFoundError } from '@shared/errors';

/**
 * MongoDB implementation of Product repository
 * Handles data persistence and retrieval for Product entities
 */
export class ProductRepository implements IProductRepository {
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

  async findByPid(pid: string): Promise<Product | null> {
    try {
      const doc = await ProductModel.findOne({ pid }).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError(
        'Failed to find product by PID',
        'PRODUCT_FIND_BY_PID_ERROR',
        error as Error
      );
    }
  }

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

  async search(query: string, skip = 0, limit = 50): Promise<Product[]> {
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
      const doc = new ProductModel(this.toPersistence(product));
      const saved = await doc.save();
      return success(this.toDomain(saved));
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 11000) {
        return failure(
          new DatabaseError(
            'Product with this PID already exists',
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
    try {
      const doc = await ProductModel.findByIdAndUpdate(
        product.id,
        this.toPersistence(product),
        { new: true, runValidators: true }
      ).exec();

      if (doc === null) {
        return failure(new NotFoundError('Product', product.id));
      }

      return success(this.toDomain(doc));
    } catch (error) {
      return failure(
        new DatabaseError(
          'Failed to update product',
          'PRODUCT_UPDATE_ERROR',
          error as Error
        )
      );
    }
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
   * @param doc - Mongoose document
   * @returns Product domain entity
   */
  private toDomain(doc: IProductDocument): Product {
    return Product.create(
      {
        pid: doc.pid,
        title: doc.title,
        category: doc.category,
        actualPrice: doc.actual_price,
        sellingPrice: doc.selling_price,
        brand: doc.brand,
        description: doc.description,
        averageRating: doc.average_rating,
        discount: doc.discount,
        outOfStock: doc.out_of_stock,
        images: doc.images,
        productDetails: doc.product_details,
        sellerId: doc.seller,
        subCategory: doc.sub_category,
        stripeId: doc.stripeId,
        url: doc.url,
      },
      doc._id
    );
  }

  /**
   * Map domain entity to Mongoose document
   * @param product - Product domain entity
   * @returns Mongoose document data
   */
  private toPersistence(product: Product): Partial<IProductDocument> {
    const props = (product as unknown as { props: ProductProps }).props;
    return {
      _id: product.id,
      pid: props.pid,
      title: props.title,
      category: props.category,
      actual_price: props.actualPrice,
      selling_price: props.sellingPrice,
      brand: props.brand,
      description: props.description,
      average_rating: props.averageRating,
      discount: props.discount,
      out_of_stock: props.outOfStock,
      images: props.images,
      product_details: props.productDetails,
      seller: props.sellerId,
      sub_category: props.subCategory,
      stripeId: props.stripeId,
      url: props.url,
    };
  }
}
