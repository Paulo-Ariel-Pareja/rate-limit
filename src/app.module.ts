import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheableMemory } from 'cacheable';
import { ConfigModule } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const host = process.env.REDIS_HOST || 'localhost';
        const port = parseInt(process.env.REDIS_PORT || '6379', 10);
        const password = process.env.REDIS_PASSWORD || '';
        const uri = `redis://${password ? `:${password}@` : ''}${host}:${port}`;
        const ttlCustom = parseInt(process.env.CACHE_TTL_SEG || '2', 10);
        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: ttlCustom }),
            }),
            new KeyvRedis(uri),
          ],
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
