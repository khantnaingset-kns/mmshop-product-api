import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
} from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ProductService } from '../src/product/product.service';
import { Product } from '@prisma/client';

const mockProductService = {
  product: jest.fn(),
  createProduct: jest.fn(),
  deleteProduct: jest.fn(),
};

const generateMockProduct = (
  id: string,
  overrides: Partial<Product> = {},
): Product => ({
  id,
  name: 'Test Product',
  descriptionLong: 'This is a long description for the test product.',
  descriptionShort: 'Short desc.',
  price: 99.99,
  productCategory: 'ELECTRONICS',
  productType: 'LAPTOP',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('ProductController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {});

  beforeEach(async () => {
    mockProductService.product.mockReset();
    mockProductService.createProduct.mockReset();
    mockProductService.deleteProduct.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ProductService)
      .useValue(mockProductService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const productId = 'clxko7ixk0000sjoyf9lw5x7x';
  const productData = {
    name: 'Awesome Gadget',
    description:
      'The most awesome gadget you have ever seen. It does amazing things and will change your life for the better. Buy it now!',
    price: 199.99,
    imageUrl: 'https://example.com/awesome-gadget.png',
    productCategory: 'GADGETS',
    productType: 'ELECTRONIC',
  };

  describe('GET /products/:id', () => {
    it('should return a product if found', async () => {
      const mockProduct = generateMockProduct(productId);
      mockProductService.product.mockResolvedValue(mockProduct);

      const response = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(response.body).toEqual({
        ...mockProduct,
        createdAt: mockProduct.createdAt.toISOString(),
        updatedAt: mockProduct.updatedAt.toISOString(),
      });
      expect(mockProductService.product).toHaveBeenCalledWith({
        id: productId,
      });
    });

    it('should return 404 if product not found', async () => {
      mockProductService.product.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(404)
        .then((response) => {
          expect(response.body.message).toEqual(
            `Product with ID ${productId} not found`,
          );
        });

      expect(mockProductService.product).toHaveBeenCalledWith({
        id: productId,
      });
    });
  });

  describe('POST /products', () => {
    it('should create and return a new product', async () => {
      const createdProduct = generateMockProduct(productId, {
        name: productData.name,
        descriptionLong: productData.description,
        descriptionShort:
          'The most awesome gadget you have ever seen. It does amazing thin...',
        price: productData.price,
        productCategory: productData.productCategory,
        productType: productData.productType,
      });
      mockProductService.createProduct.mockResolvedValue(createdProduct);

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(productData)
        .expect(201);

      expect(response.body).toEqual({
        ...createdProduct,
        createdAt: createdProduct.createdAt.toISOString(),
        updatedAt: createdProduct.updatedAt.toISOString(),
      });
      expect(mockProductService.createProduct).toHaveBeenCalledWith({
        name: productData.name,
        descriptionLong: productData.description,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        descriptionShort: expect.any(String),
        price: productData.price,
        productCategory: productData.productCategory,
        productType: productData.productType,
      });
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete a product and return it', async () => {
      const mockDeletedProduct = generateMockProduct(productId);
      mockProductService.deleteProduct.mockResolvedValue(mockDeletedProduct);

      const response = await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .expect(200);

      expect(response.body).toEqual({
        ...mockDeletedProduct,
        createdAt: mockDeletedProduct.createdAt.toISOString(),
        updatedAt: mockDeletedProduct.updatedAt.toISOString(),
      });
      expect(mockProductService.deleteProduct).toHaveBeenCalledWith({
        id: productId,
      });
    });

    it('should return 404 if product to delete is not found (if service throws)', async () => {
      mockProductService.deleteProduct.mockImplementation(() => {
        throw new NotFoundException(
          `Product with ID ${productId} not found for deletion.`,
        );
      });

      await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .expect(404)
        .then((response) => {
          expect(response.body.message).toEqual(
            `Product with ID ${productId} not found for deletion.`,
          );
        });
      expect(mockProductService.deleteProduct).toHaveBeenCalledWith({
        id: productId,
      });
    });
  });
});
