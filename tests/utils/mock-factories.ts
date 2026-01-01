import { UserRole } from '@shared/types/common';

/**
 * Mock user data factory
 */
export const mockUserFactory = {
  create: (overrides?: Partial<any>) => ({
    _id: '507f1f77bcf86cd799439011',
    name: 'Test User',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    userRole: UserRole.USER,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),
  
  createMany: (count: number, overrides?: Partial<any>) => {
    return Array.from({ length: count }, (_, i) =>
      mockUserFactory.create({
        _id: `507f1f77bcf86cd79943901${i}`,
        email: `test${i}@example.com`,
        ...overrides,
      })
    );
  },
};

/**
 * Mock product data factory
 */
export const mockProductFactory = {
  create: (overrides?: Partial<any>) => ({
    _id: '507f1f77bcf86cd799439012',
    pid: 'PROD-001',
    title: 'Test Product',
    category: 'Electronics',
    actual_price: '1,000',
    selling_price: '800',
    brand: 'TestBrand',
    description: 'Test product description',
    out_of_stock: false,
    images: ['https://example.com/image1.jpg'],
    product_details: [{ key: 'Color', value: 'Black' }],
    seller: '507f1f77bcf86cd799439011',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),
  
  createMany: (count: number, overrides?: Partial<any>) => {
    return Array.from({ length: count }, (_, i) =>
      mockProductFactory.create({
        _id: `507f1f77bcf86cd79943901${i}`,
        pid: `PROD-00${i}`,
        title: `Test Product ${i}`,
        ...overrides,
      })
    );
  },
};

/**
 * Mock order data factory
 */
export const mockOrderFactory = {
  create: (overrides?: Partial<any>) => ({
    _id: '507f1f77bcf86cd799439013',
    userId: '507f1f77bcf86cd799439011',
    items: [
      {
        product: '507f1f77bcf86cd799439012',
        quantity: 1,
        status: 'ordered',
        orderedDate: new Date('2024-01-01'),
      },
    ],
    paymentMethod: 'card',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),
};
