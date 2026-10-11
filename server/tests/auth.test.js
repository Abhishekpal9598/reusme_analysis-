import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/User.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Authentication Integration Tests', () => {
  const validUserPayload = {
    fullName: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    password: 'Password123!',
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user, return 201 Created, and set HttpOnly session cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('priya.sharma@example.com');
      expect(res.body.data.user.fullName).toBe('Priya Sharma');
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Verify Set-Cookie header contains HttpOnly token
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toContain('HttpOnly');
    });

    it('should reject duplicate email registration with 409 Conflict', async () => {
      await request(app).post('/api/v1/auth/register').send(validUserPayload);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserPayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should reject registration with invalid email format (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUserPayload, email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'email')).toBe(true);
    });

    it('should reject registration with weak password (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUserPayload, password: 'weak' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUserPayload);
    });

    it('should authenticate valid credentials, return 200 OK, and set session cookie', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'priya.sharma@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('priya.sharma@example.com');
      expect(res.body.data.user.passwordHash).toBeUndefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
    });

    it('should reject incorrect password with generic 401 Unauthorized', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'priya.sharma@example.com',
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should reject unregistered email with generic 401 Unauthorized', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/auth/me & POST /api/v1/auth/logout', () => {
    it('should reject unauthenticated request to /auth/me with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return authenticated user data when valid session cookie is provided', async () => {
      // 1. Register to get cookie
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserPayload);

      const cookie = regRes.headers['set-cookie'];

      // 2. Fetch /me with cookie
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.email).toBe('priya.sharma@example.com');
    });

    it('should clear authentication cookie upon logout', async () => {
      const res = await request(app).post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      // Verify cookie is expired / cleared
      expect(tokenCookie).toMatch(/token=;|Max-Age=0|Expires=Thu, 01 Jan 1970/);
    });
  });
});
