const request = require('supertest');

jest.mock('../src/models/User', () => {
  const User = {};
  User.findOne = jest.fn();
  User.create = jest.fn();
  return User;
});

jest.mock('../src/models/Issue', () => {
  const Issue = {};
  Issue.CATEGORIES = ['electrical', 'plumbing', 'mess', 'infrastructure', 'other'];
  Issue.STATUSES = ['reported', 'in_progress', 'resolved'];
  Issue.PRIORITIES = ['low', 'medium', 'high', 'urgent'];
  Issue.find = jest.fn();
  return Issue;
});

process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Issue = require('../src/models/Issue');
const app = require('../src/app');

describe('authentication API', () => {
  beforeEach(() => jest.clearAllMocks());

  test('registers a user and returns a seven-day JWT', async () => {
    const user = {
      _id: '507f1f77bcf86cd799439011',
      toSafeJSON: () => ({ _id: '507f1f77bcf86cd799439011', email: 'student@example.com' }),
    };
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(user);

    const response = await request(app).post('/api/auth/register').send({
      name: 'Student',
      email: 'student@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(201);
    const payload = jwt.verify(response.body.token, process.env.JWT_SECRET);
    expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
  });

  test('rejects invalid login credentials', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).post('/api/auth/login').send({
      email: 'missing@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid email or password.');
  });
});

describe('duplicate issue check', () => {
  test('finds an unresolved issue within 50 meters and excludes resolved issues', async () => {
    Issue.find.mockResolvedValue([
      {
        _id: 'nearby',
        title: 'Broken light',
        category: 'electrical',
        status: 'reported',
        location: { lat: 0, lng: 0, blockName: 'A' },
        upvotes: ['user-1'],
      },
      {
        _id: 'far-away',
        title: 'Far light',
        category: 'electrical',
        status: 'reported',
        location: { lat: 0.001, lng: 0, blockName: 'B' },
        upvotes: [],
      },
    ]);

    const response = await request(app).post('/api/issues/check-duplicate').send({
      lat: 0,
      lng: 0,
      category: 'electrical',
    });

    expect(response.status).toBe(200);
    expect(response.body.hasDuplicates).toBe(true);
    expect(response.body.matches).toHaveLength(1);
    expect(response.body.matches[0]._id).toBe('nearby');
    expect(Issue.find).toHaveBeenCalledWith({
      category: 'electrical',
      status: { $ne: 'resolved' },
    });
  });
});
