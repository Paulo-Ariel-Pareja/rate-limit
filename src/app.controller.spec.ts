import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  const mockAppService = {
    validateRequest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('validateRequest', () => {
    const mockBody = { key: 'value', data: 'test' };
    const mockHeaders = { 'client': 'test-client' };

    it('should return success message when validation passes', async () => {
      // Arrange
      mockAppService.validateRequest.mockResolvedValue(undefined);

      // Act
      const result = await controller.validateRequest(mockBody, mockHeaders);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');
      expect(result.message).toBe('Solicitud procesada exitosamente');
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      expect(service.validateRequest).toHaveBeenCalledTimes(1);
      expect(service.validateRequest).toHaveBeenCalledWith(
        mockBody,
        mockHeaders,
      );
    });

    it('should return HTTP 200 status code', async () => {
      // Arrange
      mockAppService.validateRequest.mockResolvedValue(undefined);

      // Act
      const result = await controller.validateRequest(mockBody, mockHeaders);

      // Assert
      expect(result).toBeDefined();
      // The @HttpCode decorator sets the status, but we can't test it directly in unit tests
      // It will be tested in e2e tests
    });

    it('should propagate HttpException when validation fails - BAD_REQUEST', async () => {
      // Arrange
      const error = new HttpException(
        'Header "client" es requerido',
        HttpStatus.BAD_REQUEST,
      );
      mockAppService.validateRequest.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.validateRequest(mockBody, mockHeaders),
      ).rejects.toThrow(HttpException);
      await expect(
        controller.validateRequest(mockBody, mockHeaders),
      ).rejects.toThrow('Header "client" es requerido');
    });

    it('should propagate HttpException when validation fails - CONFLICT', async () => {
      // Arrange
      const error = new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: 'Solicitud duplicada detectada',
          error: 'Duplicate Request',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.CONFLICT,
      );
      mockAppService.validateRequest.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.validateRequest(mockBody, mockHeaders),
      ).rejects.toThrow(HttpException);

      const thrownError = await controller
        .validateRequest(mockBody, mockHeaders)
        .catch((e) => e);
      expect(thrownError.getStatus()).toBe(HttpStatus.CONFLICT);
    });

    it('should handle empty body', async () => {
      // Arrange
      const emptyBody = {};
      mockAppService.validateRequest.mockResolvedValue(undefined);

      // Act
      const result = await controller.validateRequest(emptyBody, mockHeaders);

      // Assert
      expect(result).toBeDefined();
      expect(service.validateRequest).toHaveBeenCalledWith(
        emptyBody,
        mockHeaders,
      );
    });

    it('should handle complex body', async () => {
      // Arrange
      const complexBody = {
        nested: {
          data: [1, 2, 3],
          metadata: {
            timestamp: Date.now(),
            version: '1.0.0',
          },
        },
      };
      mockAppService.validateRequest.mockResolvedValue(undefined);

      // Act
      const result = await controller.validateRequest(
        complexBody,
        mockHeaders,
      );

      // Assert
      expect(result).toBeDefined();
      expect(service.validateRequest).toHaveBeenCalledWith(
        complexBody,
        mockHeaders,
      );
    });

    it('should include ISO timestamp in response', async () => {
      // Arrange
      mockAppService.validateRequest.mockResolvedValue(undefined);
      const beforeTime = new Date().toISOString();

      // Act
      const result = await controller.validateRequest(mockBody, mockHeaders);
      const afterTime = new Date().toISOString();

      // Assert
      expect(result.timestamp).toBeDefined();
      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(result.timestamp >= beforeTime).toBe(true);
      expect(result.timestamp <= afterTime).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', () => {
      // Act
      const result = controller.healthCheck();

      // Assert
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });

    it('should return HTTP 200 status code', () => {
      // Act
      const result = controller.healthCheck();

      // Assert
      expect(result).toBeDefined();
      // The @HttpCode decorator sets the status, but we can't test it directly in unit tests
    });

    it('should include ISO timestamp in response', () => {
      // Arrange
      const beforeTime = new Date().toISOString();

      // Act
      const result = controller.healthCheck();
      const afterTime = new Date().toISOString();

      // Assert
      expect(result.timestamp).toBeDefined();
      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(result.timestamp >= beforeTime).toBe(true);
      expect(result.timestamp <= afterTime).toBe(true);
    });

    it('should return consistent structure', () => {
      // Act
      const result1 = controller.healthCheck();
      const result2 = controller.healthCheck();

      // Assert
      expect(result1).toHaveProperty('status');
      expect(result1).toHaveProperty('timestamp');
      expect(result2).toHaveProperty('status');
      expect(result2).toHaveProperty('timestamp');
      expect(result1.status).toBe(result2.status);
    });
  });
});

