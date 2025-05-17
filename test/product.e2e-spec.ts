// test/product.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/product/prisma.service';

describe('ProductController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    // Clean the database before each test
    await prismaService.product.deleteMany({});
  });

  afterAll(async () => {
    await prismaService.$disconnect();
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
        });
    });
  });

  describe('/products/:id (GET)', () => {
    it('should return a product by id', async () => {
      // First create a product
      const createdProduct = await prismaService.product.create({
        data: {
          name: 'Test Product',
          descriptionLong: 'Long description',
          descriptionShort: 'Short description',
          price: 99.99,
          productCategory: 'Electronics',
          productType: 'Gadget',
        },
      });

      return request(app.getHttpServer())
        .get(`/products/${createdProduct.id}`)
        .expect(200)
        .expect((response) => {
          expect(response.body.id).toBe(createdProduct.id);
          expect(response.body.name).toBe(createdProduct.name);
        });
    });

    it('should return 404 for non-existent product', () => {
      return request(app.getHttpServer())
        .get('/products/non-existent-id')
        .expect(404);
    });
  });

  describe('/products/:id (DELETE)', () => {
    it('should delete a product', async () => {
      // First create a product
      const createdProduct = await prismaService.product.create({
        data: {
          name: 'Test Product',
          descriptionLong: 'Long description',
          descriptionShort: 'Short description',
          price: 99.99,
          productCategory: 'Electronics',
          productType: 'Gadget',
        },
      });

      return request(app.getHttpServer())
        .delete(`/products/${createdProduct.id}`)
        .expect(200)
        .expect((response) => {
          expect(response.body.id).toBe(createdProduct.id);
        });
    });
  });
});
