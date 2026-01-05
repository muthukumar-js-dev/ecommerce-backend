import { Router } from 'express';
import { AddressController } from '../controllers/address.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { createAddressSchema } from '../validation/address.schemas';

export function createAddressRoutes(controller: AddressController): Router {
  const router = Router();

  router.use(authMiddleware);

  router.post(
    '/',
    validateRequest(createAddressSchema),
    (req, res, next) => controller.create(req, res, next)
  );

  router.get(
    '/',
    (req, res, next) => controller.list(req, res, next)
  );

  router.put(
    '/:addressId',
    (req, res, next) => controller.update(req, res, next)
  );

  router.delete(
    '/:addressId',
    (req, res, next) => controller.delete(req, res, next)
  );

  return router;
}
