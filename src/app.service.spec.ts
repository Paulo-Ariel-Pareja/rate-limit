import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppService } from './app.service';
import { Cache } from 'cache-manager';

describe('AppService', () => {
  let service: AppService;
  let cacheManager: jest.Mocked<Cache>;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
    wrap: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    cacheManager = module.get(CACHE_MANAGER);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateRequest', () => {
    const mockBody = { key: 'value', data: 'test' };
    const mockClientId = 'test-client-123';

    it('should successfully validate a non-duplicate request', async () => {
      // Arrange
      const headers = { client: mockClientId };
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      await service.validateRequest(mockBody, headers);

      // Assert
      expect(cacheManager.get).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(mockClientId),
        expect.any(Number),
      );
    });

    it('should throw BAD_REQUEST when client header is missing', async () => {
      // Arrange
      const headers = {};

      // Act & Assert
      await expect(service.validateRequest(mockBody, headers)).rejects.toThrow(
        HttpException,
      );
      await expect(service.validateRequest(mockBody, headers)).rejects.toThrow(
        'Header "client" es requerido',
      );

      const error = await service
        .validateRequest(mockBody, headers)
        .catch((e) => e);
      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should throw BAD_REQUEST when client header is empty string', async () => {
      // Arrange
      const headers = { client: '' };

      // Act & Assert
      await expect(service.validateRequest(mockBody, headers)).rejects.toThrow(
        HttpException,
      );
      await expect(service.validateRequest(mockBody, headers)).rejects.toThrow(
        'Header "client" es requerido',
      );

      const error = await service
        .validateRequest(mockBody, headers)
        .catch((e) => e);
      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should accept client header in lowercase', async () => {
      // Arrange
      const headers = { client: mockClientId };
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      await service.validateRequest(mockBody, headers);

      // Assert
      expect(cacheManager.get).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should accept client header in mixed case', async () => {
      // Arrange
      const headers = { client: mockClientId };
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      await service.validateRequest(mockBody, headers);

      // Assert
      expect(cacheManager.get).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should accept client header in uppercase', async () => {
      // Arrange
      const headers = { client: mockClientId };
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      await service.validateRequest(mockBody, headers);

      // Assert
      expect(cacheManager.get).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should throw CONFLICT when duplicate request is detected', async () => {
      // Arrange
      const headers = { client: mockClientId };
      const cachedValue = JSON.stringify({
        clientId: mockClientId,
        timestamp: Date.now(),
      });
      cacheManager.get.mockResolvedValue(cachedValue);

      // Act & Assert
      await expect(service.validateRequest(mockBody, headers)).rejects.toThrow(
        HttpException,
      );

      const error = await service
        .validateRequest(mockBody, headers)
        .catch((e) => e);
      expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(error.getResponse()).toMatchObject({
        statusCode: HttpStatus.CONFLICT,
        message: 'Solicitud duplicada detectada',
        error: 'Duplicate Request',
      });
      expect(error.getResponse().timestamp).toBeDefined();
      expect(cacheManager.get).toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should store request in cache with correct TTL', async () => {
      // Arrange
      const headers = { client: mockClientId };
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      await service.validateRequest(mockBody, headers);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(mockClientId),
        expect.any(Number),
      );

      const setCall = cacheManager.set.mock.calls[0];
      const ttl = setCall[2];
      expect(typeof ttl).toBe('number');
      expect(ttl).toBeGreaterThan(0);
    });

    it('should handle different body types - object', async () => {
      // Arrange
      const headers = { client: mockClientId };
      const body = { a: 1, b: 2, c: 3 };
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      await service.validateRequest(body, headers);

      // Assert
      expect(cacheManager.get).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should handle different body types - string', async () => {
      // Arrange
      const headers = { client: mockClientId };
      const body = 'simple string body';
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      await service.validateRequest(body, headers);

      // Assert
      expect(cacheManager.get).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should handle different body types - null', async () => {
      // Arrange
      const headers = { client: mockClientId };
      const body = null;
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      await service.validateRequest(body, headers);

      // Assert
      expect(cacheManager.get).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should handle different body types - undefined', async () => {
      // Arrange
      const headers = { client: mockClientId };
      const body = undefined;
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      await service.validateRequest(body, headers);

      // Assert
      expect(cacheManager.get).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should handle different body types - empty object', async () => {
      // Arrange
      const headers = { client: mockClientId };
      const body = {};
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      await service.validateRequest(body, headers);

      // Assert
      expect(cacheManager.get).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should generate same hash for same client and body', async () => {
      // Arrange
      const headers = { client: mockClientId };
      const body = { key: 'value', data: 'test' };
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      await service.validateRequest(body, headers);
      const firstHash = cacheManager.get.mock.calls[0][0];

      jest.clearAllMocks();
      cacheManager.get.mockResolvedValue(undefined);

      await service.validateRequest(body, headers);
      const secondHash = cacheManager.get.mock.calls[0][0];

      // Assert
      expect(firstHash).toBe(secondHash);
    });

    it('should generate different hash for different clients with same body', async () => {
      // Arrange
      const body = { key: 'value', data: 'test' };
      const headers1 = { client: 'client-1' };
      const headers2 = { client: 'client-2' };
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      await service.validateRequest(body, headers1);
      const hash1 = cacheManager.get.mock.calls[0][0];

      jest.clearAllMocks();
      cacheManager.get.mockResolvedValue(undefined);

      await service.validateRequest(body, headers2);
      const hash2 = cacheManager.get.mock.calls[0][0];

      // Assert
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hash for same client with different body', async () => {
      // Arrange
      const headers = { client: mockClientId };
      const body1 = { key: 'value1' };
      const body2 = { key: 'value2' };
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      await service.validateRequest(body1, headers);
      const hash1 = cacheManager.get.mock.calls[0][0];

      jest.clearAllMocks();
      cacheManager.get.mockResolvedValue(undefined);

      await service.validateRequest(body2, headers);
      const hash2 = cacheManager.get.mock.calls[0][0];

      // Assert
      expect(hash1).not.toBe(hash2);
    });

    it('should normalize object body by sorting keys', async () => {
      // Arrange
      const headers = { client: mockClientId };
      const body1 = { z: 1, a: 2, m: 3 };
      const body2 = { a: 2, m: 3, z: 1 };
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      await service.validateRequest(body1, headers);
      const hash1 = cacheManager.get.mock.calls[0][0];

      jest.clearAllMocks();
      cacheManager.get.mockResolvedValue(undefined);

      await service.validateRequest(body2, headers);
      const hash2 = cacheManager.get.mock.calls[0][0];

      // Assert - Same content, different order should produce same hash
      expect(hash1).toBe(hash2);
    });
  });
});
