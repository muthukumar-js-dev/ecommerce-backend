import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validateRequest } from '../validation.middleware';
import { ValidationError } from '@shared/errors';

describe('Validation Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
    };
    res = {};
    next = jest.fn();
  });

  describe('validateRequest', () => {
    it('should pass validation for valid body', () => {
      const schema = {
        body: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required(),
        }),
      };

      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const middleware = validateRequest(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should fail validation for invalid body', () => {
      const schema = {
        body: Joi.object({
          email: Joi.string().email().required(),
        }),
      };

      req.body = {
        email: 'invalid-email',
      };

      const middleware = validateRequest(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.details).toHaveLength(1);
      expect(error.details[0].field).toBe('email');
    });

    it('should validate query parameters', () => {
      const schema = {
        query: Joi.object({
          page: Joi.number().min(1).required(),
        }),
      };

      req.query = {
        page: '0',
      };

      const middleware = validateRequest(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate params', () => {
      const schema = {
        params: Joi.object({
          id: Joi.string().required(),
        }),
      };

      req.params = {};

      const middleware = validateRequest(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should aggregate multiple validation errors', () => {
      const schema = {
        body: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required(),
          age: Joi.number().min(18).required(),
        }),
      };

      req.body = {
        name: '',
        email: 'invalid',
        age: 10,
      };

      const middleware = validateRequest(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.details.length).toBeGreaterThan(1);
    });

    it('should strip unknown fields', () => {
      const schema = {
        body: Joi.object({
          name: Joi.string().required(),
        }),
      };

      req.body = {
        name: 'John',
        unknownField: 'value',
      };

      const middleware = validateRequest(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
