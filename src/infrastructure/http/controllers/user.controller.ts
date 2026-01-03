import { Request, Response, NextFunction } from 'express';
import { UserService } from '@application/services/user.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * User Controller
 * Handles user-related HTTP requests
 */
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Register a new user
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.userService.register(req.body);

      if (!result.success) {
        return next(result.error);
      }

      res.status(201).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.userService.login(req.body);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user profile
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const result = await this.userService.getUserProfile(userId);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user role
   */
  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return next(new Error('User ID is required'));
      }

      const result = await this.userService.updateUserRole(userId, req.body);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        message: 'User role updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
