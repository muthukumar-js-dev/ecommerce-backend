import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import {
  registerUserSchema,
  loginUserSchema,
  updateUserRoleSchema,
} from '../validation/user.schemas';
import { UserRole } from '@shared/types/common';

/**
 * Create user routes
 */
export function createUserRoutes(controller: UserController): Router {
  const router = Router();

  /**
   * @route   POST /api/users/register
   * @desc    Register a new user
   * @access  Public
   */
  router.post(
    '/register',
    validateRequest(registerUserSchema),
    (req, res, next) => controller.register(req, res, next)
  );

  /**
   * @route   POST /api/users/login
   * @desc    Login user
   * @access  Public
   */
  router.post(
    '/login',
    validateRequest(loginUserSchema),
    (req, res, next) => controller.login(req, res, next)
  );

  /**
   * @route   GET /api/users/profile
   * @desc    Get user profile
   * @access  Private
   */
  router.get(
    '/profile',
    authMiddleware,
    (req, res, next) => controller.getProfile(req, res, next)
  );

  /**
   * @route   PATCH /api/users/:userId/role
   * @desc    Update user role
   * @access  Private (Admin only)
   */
  router.patch(
    '/:userId/role',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    validateRequest(updateUserRoleSchema),
    (req, res, next) => controller.updateRole(req, res, next)
  );

  return router;
}
