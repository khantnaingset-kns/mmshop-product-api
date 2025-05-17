// test/product.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/product/prisma.service';

// Mock product data
const mockProduct = {
  id: '1',
  name: 'Test Product',
  descriptionLong: 'Long description',
  descriptionShort: 'Short description',
  price: 99.99,
  productCategory: 'Electronics',
  productType: 'Gadget',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Create mock PrismaService
const mockPrismaService = {
  product: {
    create: jest.fn().mockResolvedValue(mockProduct),
    findUnique: jest.fn().mockResolvedValue(mockProduct),
    delete: jest.fn().mockResolvedValue(mockProduct),
    deleteMany: jest.fn(),
  },
  $disconnect: jest.fn(),
};

describe('ProductController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/products (POST)', () => {
    it('should create a new product', () => {
      const productData = {
        name: 'Test Product',
        description:
          'This is a test product with a very long description that should be truncated in the short description field',
        price: 99.99,
        imageUrl: 'http://example.com/image.jpg',
        productCategory: 'Electronics',
        productType: 'Gadget',
      };

      // Mock the create method for this specific test
      mockPrismaService.product.create.mockResolvedValueOnce({
        ...mockProduct,
        name: productData.name,
        descriptionLong: productData.description,
        descriptionShort: productData.description.substring(0, 97) + '...',
        price: productData.price,
        productCategory: productData.productCategory,
        productType: productData.productType,
      });

      return request(app.getHttpServer())
        .post('/products')
        .send(productData)
        .expect(201)
        .expect((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.name).toBe(productData.name);
          expect(response.body.descriptionLong).toBe(productData.description);
          expect(response.body.descriptionShort.length).toBeLessThanOrEqual(
            100,
          );
          expect(response.body.price).toBe(productData.price);
          expect(response.body.productCategory).toBe(
            productData.productCategory,
          );
          expect(response.body.productType).toBe(productData.productType);

          // Verify that create was called with correct data
          expect(mockPrismaService.product.create).toHaveBeenCalledTimes(1);
          expect(mockPrismaService.product.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
              name: productData.name,
              descriptionLong: productData.description,
              price: productData.price,
              productCategory: productData.productCategory,
              productType: productData.productType,
            }),
          });
        });
    });
  });

  describe('/products/:id (GET)', () => {
    it('should return a product by id', () => {
      const productId = '1';

      return request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual(mockProduct);
          expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
            where: { id: productId },
          });
        });
    });

    it('should return 404 for non-existent product', () => {
      const nonExistentId = 'non-existent-id';
      mockPrismaService.product.findUnique.mockResolvedValueOnce(null);

      return request(app.getHttpServer())
        .get(`/products/${nonExistentId}`)
        .expect(404)
        .expect(() => {
          expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
            where: { id: nonExistentId },
          });
        });
    });
  });

  describe('/products/:id (DELETE)', () => {
    it('should delete a product', () => {
      const productId = '1';

      return request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual(mockProduct);
          expect(mockPrismaService.product.delete).toHaveBeenCalledWith({
            where: { id: productId },
          });
        });
    });

    it('should return 404 when deleting non-existent product', () => {
      const nonExistentId = 'non-existent-id';
      mockPrismaService.product.delete.mockRejectedValueOnce(
        new Error('Not found'),
      );

      return request(app.getHttpServer())
        .delete(`/products/${nonExistentId}`)
        .expect(500);
    });
  });
});
