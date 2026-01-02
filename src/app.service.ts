import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';

@Injectable()
export class AppService {
  private readonly CACHE_TTL_SEG = parseInt(
    process.env.CACHE_TTL_SEG || '2',
    10,
  );

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Valida si un request es duplicado basado en el body y el header client
   * @param body - Cuerpo del request
   * @param headers - Headers del request
   * @throws HttpException si el request es duplicado o falta el header client
   */
  async validateRequest(body: any, headers: any): Promise<void> {
    const clientId = headers['client'];

    if (!clientId) {
      throw new HttpException(
        'Header "client" es requerido',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Generar hash único basado en cliente y body
    const requestHash = this.generateHash(clientId, body);

    const cachedRequest = await this.cacheManager.get<string>(requestHash);

    if (cachedRequest) {
      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: 'Solicitud duplicada detectada',
          error: 'Duplicate Request',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.CONFLICT,
      );
    }

    await this.cacheManager.set(
      requestHash,
      JSON.stringify({ clientId, timestamp: Date.now() }),
      this.CACHE_TTL_SEG * 1000,
    );
  }

  /**
   * Genera un hash SHA256 único basado en el cliente y el body
   * @param clientId - ID del cliente desde el header client
   * @param body - Cuerpo del request
   * @returns Hash hexadecimal
   */
  private generateHash(clientId: string, body: any): string {
    const hash = createHash('sha256');

    // Normalizado del body para evitar diferencias por orden de propiedades
    let normalizedBody: string;
    if (typeof body === 'string') {
      normalizedBody = body;
    } else if (body === null || body === undefined) {
      normalizedBody = '';
    } else {
      const sortedKeys = Object.keys(body).sort();
      const sortedObj: any = {};
      sortedKeys.forEach((key) => {
        sortedObj[key] = body[key];
      });
      normalizedBody = JSON.stringify(sortedObj);
    }

    const data = `${clientId}:${normalizedBody}`;
    hash.update(data);

    return hash.digest('hex');
  }
}
