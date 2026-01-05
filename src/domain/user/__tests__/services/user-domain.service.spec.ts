import { UserDomainService } from '../../services/user-domain.service';
import { User } from '../../aggregates/user.aggregate';
import { IUserRepository } from '../../repositories/user.repository.interface';
import { Email } from '../../value-objects/email.vo';
import { UserRole } from '@shared/types/common';
import { ConflictError } from '@shared/errors';

// Mock IUserRepository
const mockUserRepository = {
  exists: jest.fn(),
  // Add other methods if needed by service
} as unknown as jest.Mocked<IUserRepository>;

describe('UserDomainService', () => {
  let service: UserDomainService;
  let user: User;

  beforeEach(() => {
    service = new UserDomainService(mockUserRepository);
    jest.clearAllMocks();

    // Create a mock user
    user = User.create(
      {
        name: 'Test User',
        email: Email.create('test@example.com'),
        password: {} as any, // mocking password
        role: UserRole.USER,
      },
      'user-123'
    );
  });

  describe('ensureEmailIsUnique', () => {
    it('should resolve if email does not exist', async () => {
      mockUserRepository.exists.mockResolvedValue(false);
      const email = Email.create('new@example.com');
      
      await expect(service.ensureEmailIsUnique(email)).resolves.not.toThrow();
      expect(mockUserRepository.exists).toHaveBeenCalledWith(email);
    });

    it('should throw ConflictError if email exists', async () => {
      mockUserRepository.exists.mockResolvedValue(true);
      const email = Email.create('existing@example.com');
      
      await expect(service.ensureEmailIsUnique(email)).rejects.toThrow(ConflictError);
    });
  });

  describe('canUserBecomeSeller', () => {
    it('should return true if completed orders >= 5', async () => {
      // Setup user with 5 completed orders (5 total - 0 returned)
      for(let i=0; i<5; i++) user.incrementOrderCount();
      
      const result = await service.canUserBecomeSeller(user);
      expect(result).toBe(true);
    });

    it('should return false if completed orders < 5', async () => {
      user.incrementOrderCount(); // 1 order
      const result = await service.canUserBecomeSeller(user);
      expect(result).toBe(false);
    });
    
    it('should account for returned orders', async () => {
        // 6 orders, 2 returned = 4 completed
        for(let i=0; i<6; i++) user.incrementOrderCount();
        user.incrementReturnCount();
        user.incrementReturnCount();
        
        const result = await service.canUserBecomeSeller(user);
        expect(result).toBe(false);
    });
  });

  describe('calculateUserTrustScore', () => {
    it('should return 100 for new user (0 orders)', () => {
      const score = service.calculateUserTrustScore(user);
      expect(score).toBe(100);
    });

    it('should return 100 for user with no returns', () => {
      user.incrementOrderCount();
      const score = service.calculateUserTrustScore(user);
      expect(score).toBe(100);
    });

    it('should reduce score based on return rate', () => {
        // 10 orders, 2 returns = 20% return rate -> 80 score
        for(let i=0; i<10; i++) user.incrementOrderCount(); // 10
        user.incrementReturnCount();
        user.incrementReturnCount();
        
        const score = service.calculateUserTrustScore(user);
        expect(score).toBe(80);
    });
    
    it('should return 0 if return rate is 100%', () => {
        user.incrementOrderCount();
        user.incrementReturnCount();
        const score = service.calculateUserTrustScore(user);
        expect(score).toBe(0);
    });
  });
});
