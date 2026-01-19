import { Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ProfitCart E-Commerce API',
            version: '1.0.0',
            description: 'Comprehensive API documentation for ProfitCart e-commerce backend',
            contact: {
                name: 'API Support',
                email: 'support@profitcart.com',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
            {
                url: 'https://staging.profitcart.com',
                description: 'Staging server',
            },
            {
                url: 'https://api.profitcart.com',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    required: ['email', 'name'],
                    properties: {
                        id: {
                            type: 'string',
                            description: 'User ID',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address',
                        },
                        name: {
                            type: 'string',
                            description: 'User full name',
                        },
                        role: {
                            type: 'string',
                            enum: ['user', 'admin'],
                            description: 'User role',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Account creation timestamp',
                        },
                    },
                },
                Product: {
                    type: 'object',
                    required: ['name', 'price', 'category'],
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Product ID',
                        },
                        name: {
                            type: 'string',
                            description: 'Product name',
                        },
                        description: {
                            type: 'string',
                            description: 'Product description',
                        },
                        price: {
                            type: 'number',
                            format: 'float',
                            description: 'Product price',
                        },
                        category: {
                            type: 'string',
                            description: 'Product category',
                        },
                        stock: {
                            type: 'integer',
                            description: 'Available stock quantity',
                        },
                        images: {
                            type: 'array',
                            items: {
                                type: 'string',
                                format: 'uri',
                            },
                            description: 'Product image URLs',
                        },
                    },
                },
                Order: {
                    type: 'object',
                    required: ['userId', 'items', 'totalAmount'],
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Order ID',
                        },
                        userId: {
                            type: 'string',
                            description: 'User ID who placed the order',
                        },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    productId: { type: 'string' },
                                    quantity: { type: 'integer' },
                                    price: { type: 'number' },
                                },
                            },
                        },
                        totalAmount: {
                            type: 'number',
                            format: 'float',
                            description: 'Total order amount',
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
                            description: 'Order status',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message',
                        },
                        code: {
                            type: 'string',
                            description: 'Error code',
                        },
                        details: {
                            type: 'object',
                            description: 'Additional error details',
                        },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/api/routes/*.ts', './src/api/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: any): void {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'ProfitCart API Documentation',
    }));

    // Serve OpenAPI spec as JSON
    app.get('/api-docs.json', (_req: Request, res: Response) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });

    console.log('📚 Swagger documentation available at /api-docs');
}
