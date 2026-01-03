import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../auth.middleware';
import { AuthenticationError } from '@shared/errors';
import { UserRole } from '@shared/types/common';

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  const jwtSecret = 'test-secret';

  beforeEach(() => {
    process.env.JWT_SECRET = jwtSecret;
    req = {
      headers: {},
    };
    res = {};
    next = jest.fn();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('authMiddleware', () => {
    it('should authenticate valid token', () => {
      const token = jwt.sign(
        { userId: '123', email: 'test@example.com', role: UserRole.USER },
        jwtSecret
      );

      req.headers = { authorization: `Bearer ${token}` };

      authMiddleware(req as Request, res as Response, next);

      expect((req as AuthenticatedRequest).user).toEqual({
        id: '123',
        email: 'test@example.com',
        role: UserRole.USER,
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject missing token', () => {
      authMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('No token provided');
    });

    it('should reject invalid token', () => {
      req.headers = { authorization: 'Bearer invalid-token' };

      authMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Invalid token');
    });

    it('should reject malformed authorization header', () => {
      req.headers = { authorization: 'InvalidFormat' };

      authMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });

  describe('requireRole', () => {
    it('should allow user with required role', () => {
      (req as AuthenticatedRequest).user = {
        id: '123',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      const middleware = requireRole(UserRole.ADMIN);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow user with one of multiple required roles', () => {
      (req as AuthenticatedRequest).user = {
        id: '123',
        email: 'seller@example.com',
        role: UserRole.SELLER,
      };

      const middleware = requireRole(UserRole.ADMIN, UserRole.SELLER);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject user without required role', () => {
      (req as AuthenticatedRequest).user = {
        id: '123',
        email: 'user@example.com',
        role: UserRole.USER,
      };

      const middleware = requireRole(UserRole.ADMIN);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('Access denied');
    });

    it('should reject unauthenticated user', () => {
      const middleware = requireRole(UserRole.ADMIN);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Not authenticated');
    });
  });
});
