import { Request, Response, NextFunction } from 'express';
import { AddressService } from '@application/services/address.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Address Controller
 * Handles address-related HTTP requests
 */
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  /**
   * Create a new address
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const result = await this.addressService.createAddress(userId, req.body);

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
   * List user's addresses
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const result = await this.addressService.listAddresses(userId);

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
   * Update address
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;
      const { addressId } = req.params;

      if (!addressId) {
        return next(new Error('Address ID is required'));
      }

      const result = await this.addressService.updateAddress(userId, addressId, req.body);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        message: 'Address updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete address
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;
      const { addressId } = req.params;

      if (!addressId) {
        return next(new Error('Address ID is required'));
      }

      const result = await this.addressService.deleteAddress(userId, addressId);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        message: 'Address deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
