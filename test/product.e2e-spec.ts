// test/product.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ProductService } from '../src/product/product.service';

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

// Create mock ProductService
const mockProductService = {
  product: jest.fn(),
  createProduct: jest.fn(),
  deleteProduct: jest.fn(),
};

describe('ProductController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ProductService)
      .useValue(mockProductService)
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

      const expectedCreatedProduct = {
        ...mockProduct,
        name: productData.name,
        descriptionLong: productData.description,
        descriptionShort: productData.description.substring(0, 97) + '...',
        price: productData.price,
        productCategory: productData.productCategory,
        productType: productData.productType,
      };

      mockProductService.createProduct.mockResolvedValueOnce(
        expectedCreatedProduct,
      );

      return request(app.getHttpServer())
        .post('/products')
        .send(productData)
        .expect(201)
        .expect((response) => {
          expect(response.body).toEqual(expectedCreatedProduct);

          // Verify that createProduct was called with correct data
          expect(mockProductService.createProduct).toHaveBeenCalledTimes(1);
          expect(mockProductService.createProduct).toHaveBeenCalledWith({
            name: productData.name,
            descriptionLong: productData.description,
            descriptionShort: expect.any(String),
            price: productData.price,
            productCategory: productData.productCategory,
            productType: productData.productType,
          });
        });
    });

    it('should handle service errors during creation', () => {
      const productData = {
        name: 'Test Product',
        description: 'Test description',
        price: 99.99,
        imageUrl: 'http://example.com/image.jpg',
        productCategory: 'Electronics',
        productType: 'Gadget',
      };

      mockProductService.createProduct.mockRejectedValueOnce(
        new Error('Service error'),
      );

      return request(app.getHttpServer())
        .post('/products')
        .send(productData)
        .expect(500);
    });
  });

  describe('/products/:id (GET)', () => {
    it('should return a product by id', () => {
      const productId = '1';
      mockProductService.product.mockResolvedValueOnce(mockProduct);

      return request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual(mockProduct);
          expect(mockProductService.product).toHaveBeenCalledWith({
            id: productId,
          });
        });
    });

    it('should return 404 for non-existent product', () => {
      const nonExistentId = 'non-existent-id';
      mockProductService.product.mockResolvedValueOnce(null);

      return request(app.getHttpServer())
        .get(`/products/${nonExistentId}`)
        .expect(404)
        .expect(() => {
          expect(mockProductService.product).toHaveBeenCalledWith({
            id: nonExistentId,
          });
        });
    });
  });

  describe('/products/:id (DELETE)', () => {
    it('should delete a product', () => {
      const productId = '1';
      mockProductService.deleteProduct.mockResolvedValueOnce(mockProduct);

      return request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual(mockProduct);
          expect(mockProductService.deleteProduct).toHaveBeenCalledWith({
            id: productId,
          });
        });
    });

    it('should handle not found error when deleting', () => {
      const nonExistentId = 'non-existent-id';
      mockProductService.deleteProduct.mockRejectedValueOnce(
        new Error('Product not found'),
      );

      return request(app.getHttpServer())
        .delete(`/products/${nonExistentId}`)
        .expect(500);
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields in create product', () => {
      const invalidProduct = {
        // Missing required fields
        name: '',
        price: -1,
      };

      return request(app.getHttpServer())
        .post('/products')
        .send(invalidProduct)
        .expect(400);
    });

    it('should validate price is positive in create product', () => {
      const invalidProduct = {
        name: 'Test Product',
        description: 'Test description',
        price: -1,
        imageUrl: 'http://example.com/image.jpg',
        productCategory: 'Electronics',
        productType: 'Gadget',
      };

      return request(app.getHttpServer())
        .post('/products')
        .send(invalidProduct)
        .expect(400);
    });
  });
});
