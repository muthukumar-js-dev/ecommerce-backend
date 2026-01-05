import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import {
  createProductSchema,
  updateProductSchema,
  getProductSchema,
  listProductsSchema,
} from '../validation/product.schemas';
import { UserRole } from '@shared/types/common';

/**
 * Create product routes
 */
export function createProductRoutes(controller: ProductController): Router {
  const router = Router();

  /**
   * @route   POST /api/products
   * @desc    Create a new product
   * @access  Private (Seller/Admin)
   */
  router.post(
    '/',
    authMiddleware,
    requireRole(UserRole.SELLER, UserRole.ADMIN),
    validateRequest(createProductSchema),
    (req, res, next) => controller.create(req, res, next)
  );

  /**
   * @route   GET /api/products/:productId
   * @desc    Get product by ID
   * @access  Public
   */
  router.get(
    '/:productId',
    validateRequest(getProductSchema),
    (req, res, next) => controller.getById(req, res, next)
  );

  /**
   * @route   GET /api/products
   * @desc    List products with pagination
   * @access  Public
   */
  router.get(
    '/',
    validateRequest(listProductsSchema),
    (req, res, next) => controller.list(req, res, next)
  );

  /**
   * @route   PATCH /api/products/:productId
   * @desc    Update product
   * @access  Private (Seller/Admin)
   */
  router.patch(
    '/:productId',
    authMiddleware,
    requireRole(UserRole.SELLER, UserRole.ADMIN),
    validateRequest(updateProductSchema),
    (req, res, next) => controller.update(req, res, next)
  );

  /**
   * @route   PUT /api/products/:productId
   * @desc    Update product (alias)
   * @access  Private (Seller/Admin)
   */
  router.put(
    '/:productId',
    authMiddleware,
    requireRole(UserRole.SELLER, UserRole.ADMIN),
    validateRequest(updateProductSchema),
    (req, res, next) => controller.update(req, res, next)
  );

  /**
   * @route   DELETE /api/products/:productId
   * @desc    Delete product
   * @access  Private (Seller/Admin)
   */
  router.delete(
    '/:productId',
    authMiddleware,
    requireRole(UserRole.SELLER, UserRole.ADMIN),
    (req, res, next) => controller.delete(req, res, next)
  );

  return router;
}
